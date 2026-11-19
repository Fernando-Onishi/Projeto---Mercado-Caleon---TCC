import { formatCurrency } from './Produtos';
import { toDate } from './Pedidos';

// Números do painel admin calculados a partir dos pedidos reais do Firestore.

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_DAY_MARKS = [1, 5, 10, 15, 20, 25, 31];

// Momento em que o pedido virou dinheiro em caixa (null se ainda não foi pago ou foi cancelado).
// Pix: quando o admin confirma o recebimento. Cartão: quando o cliente retira e paga na maquininha.
export function paidAt(order) {
	if (order.status === 'cancelado') return null;
	if (order.paymentStatus === 'confirmado') {
		return toDate(order.paymentConfirmedAt) || toDate(order.statusHistory?.retirado) || toDate(order.updatedAt) || toDate(order.createdAt);
	}
	if (order.status === 'retirado') return toDate(order.statusHistory?.retirado) || toDate(order.updatedAt);
	return null;
}

function createdAt(order) {
	return order.status === 'cancelado' ? null : toDate(order.createdAt);
}

const amount = (order) => Number(order.total) || 0;

function startOfDay(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function periodRange(period, now, offset = 0) {
	if (period === 'Dia') {
		const start = startOfDay(now);
		start.setDate(start.getDate() - offset);
		const end = new Date(start);
		end.setDate(end.getDate() + 1);
		return { start, end };
	}
	if (period === 'Semana') {
		const start = startOfDay(now);
		start.setDate(start.getDate() - start.getDay() - offset * 7);
		const end = new Date(start);
		end.setDate(end.getDate() + 7);
		return { start, end };
	}
	if (period === 'Mês') {
		const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
		return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
	}
	const start = new Date(now.getFullYear() - offset, 0, 1);
	return { start, end: new Date(start.getFullYear() + 1, 0, 1) };
}

const inRange = (date, { start, end }) => Boolean(date) && date >= start && date < end;

function sumIn(orders, pick, value, range) {
	return orders.reduce((total, order) => (inRange(pick(order), range) ? total + value(order) : total), 0);
}

// Pontos do gráfico: acumulado ao longo do dia/mês, ou total por dia da semana/mês do ano.
function seriesFor(period, range, orders, pick, value) {
	if (period === 'Dia') {
		return [0, 4, 8, 12, 16, 20, 24].map((hour) => {
			const end = new Date(range.start.getTime() + hour * 3600000);
			return { label: `${String(hour).padStart(2, '0')}h`, value: sumIn(orders, pick, value, { start: range.start, end }) };
		});
	}
	if (period === 'Semana') {
		return WEEKDAY_LABELS.map((label, index) => {
			const start = new Date(range.start);
			start.setDate(start.getDate() + index);
			const end = new Date(start);
			end.setDate(end.getDate() + 1);
			return { label, value: sumIn(orders, pick, value, { start, end }) };
		});
	}
	if (period === 'Mês') {
		return MONTH_DAY_MARKS.map((day) => {
			const end = new Date(range.start.getFullYear(), range.start.getMonth(), day + 1);
			return { label: `dia ${day}`, value: sumIn(orders, pick, value, { start: range.start, end: end < range.end ? end : range.end }) };
		});
	}
	return MONTH_INITIALS.map((label, index) => {
		const start = new Date(range.start.getFullYear(), index, 1);
		return { label, value: sumIn(orders, pick, value, { start, end: new Date(start.getFullYear(), index + 1, 1) }) };
	});
}

export function periodAxisLabels(period) {
	if (period === 'Dia') return ['00', '04', '08', '12', '16', '20', '24'];
	if (period === 'Semana') return WEEKDAY_LABELS;
	if (period === 'Mês') return MONTH_DAY_MARKS.map(String);
	return MONTH_INITIALS;
}

function trendOf(current, previous) {
	if (!previous) return { trend: current > 0 ? '100%' : '0%', trendType: 'positive' };
	const change = Math.round(((current - previous) / previous) * 100);
	return { trend: `${Math.abs(change)}%`, trendType: change >= 0 ? 'positive' : 'negative' };
}

const COMPARE_LABEL = { Dia: 'vs ontem', Semana: 'vs semana passada', Mês: 'vs mês passado', Ano: 'vs ano passado' };

export function computePeriodMetrics(orders, period, now = new Date()) {
	const range = periodRange(period, now);
	const previous = periodRange(period, now, 1);
	const revenue = sumIn(orders, paidAt, amount, range);
	const previousRevenue = sumIn(orders, paidAt, amount, previous);
	const count = sumIn(orders, createdAt, () => 1, range);
	const previousCount = sumIn(orders, createdAt, () => 1, previous);
	return {
		compareLabel: COMPARE_LABEL[period],
		revenue: formatCurrency(revenue),
		revenueData: seriesFor(period, range, orders, paidAt, amount),
		...Object.fromEntries(Object.entries(trendOf(revenue, previousRevenue)).map(([k, v]) => [`revenue${k[0].toUpperCase()}${k.slice(1)}`, v])),
		orders: String(count).padStart(2, '0'),
		ordersData: seriesFor(period, range, orders, createdAt, () => 1),
		...Object.fromEntries(Object.entries(trendOf(count, previousCount)).map(([k, v]) => [`orders${k[0].toUpperCase()}${k.slice(1)}`, v])),
	};
}

function prepMinutes(order) {
	const start = toDate(order.statusHistory?.preparando) || toDate(order.statusHistory?.recebido);
	const end = toDate(order.statusHistory?.pronto);
	return start && end && end > start ? (end - start) / 60000 : null;
}

// Cartões mensais (filtro "Nesse Mês", "Último Mês"...): vendas pagas e tempo médio de separação.
export function computeMonthMetrics(orders, monthOffset, now = new Date()) {
	const months = Array.from({ length: 7 }, (_, index) => periodRange('Mês', now, monthOffset + 6 - index));
	const salesOf = (range) => sumIn(orders, paidAt, amount, range);
	const prepOf = (range) => {
		const values = orders.filter((order) => inRange(toDate(order.statusHistory?.pronto), range)).map(prepMinutes).filter((v) => v !== null);
		return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
	};
	const current = months[6];
	const previous = months[5];
	const sales = salesOf(current);
	const prep = prepOf(current);
	const prepTrend = trendOf(prep, prepOf(previous));
	return {
		axisLabels: months.map((range) => MONTH_INITIALS[range.start.getMonth()]),
		sales: formatCurrency(sales),
		salesData: months.map((range) => ({ label: MONTH_INITIALS[range.start.getMonth()], value: salesOf(range) })),
		...Object.fromEntries(Object.entries(trendOf(sales, salesOf(previous))).map(([k, v]) => [`sales${k[0].toUpperCase()}${k.slice(1)}`, v])),
		avgPrep: `${String(Math.round(prep)).padStart(2, '0')} min`,
		avgPrepData: months.map((range) => ({ label: MONTH_INITIALS[range.start.getMonth()], value: Math.round(prepOf(range)) })),
		// Para separação, menos tempo é melhor: a seta fica verde quando o tempo cai.
		avgPrepTrend: prepTrend.trend,
		avgPrepTrendType: prepTrend.trendType === 'positive' ? 'negative' : 'positive',
	};
}

export function computeQueueStats(orders, now = new Date()) {
	const today = periodRange('Dia', now);
	return {
		pending: orders.filter((order) => ['recebido', 'aceito', 'preparando'].includes(order.status)).length,
		today: orders.filter((order) => inRange(createdAt(order), today)).length,
	};
}
