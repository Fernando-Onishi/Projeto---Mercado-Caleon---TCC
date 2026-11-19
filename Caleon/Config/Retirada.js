import { STORE } from './Pagamento';
import { toDate } from './Pedidos';

// Horários de retirada que o cliente pode escolher na hora da compra.
// O mercado precisa de pelo menos STORE.pickupMinutes para separar o pedido.

const SLOT_MINUTES = 30;

function sameDay(a, b) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function two(n) {
	return String(n).padStart(2, '0');
}

export function formatHour(date) {
	return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** "Hoje", "Amanhã" ou "sex., 21/11". */
export function dayLabel(date, now = new Date()) {
	const tomorrow = new Date(now);
	tomorrow.setDate(now.getDate() + 1);
	if (sameDay(date, now)) return 'Hoje';
	if (sameDay(date, tomorrow)) return 'Amanhã';
	return `${date.toLocaleDateString('pt-BR', { weekday: 'short' })}, ${two(date.getDate())}/${two(date.getMonth() + 1)}`;
}

/** Texto do horário de retirada de um pedido: "Hoje às 15:30". */
export function formatPickup(value, now = new Date()) {
	const date = toDate(value);
	return date ? `${dayLabel(date, now)} às ${formatHour(date)}` : '';
}

/**
 * Dias com horários livres (de 30 em 30 minutos, dentro do horário da loja).
 * Retorna [{ key, label, slots: [Date] }], começando pelo primeiro dia com horário.
 */
export function buildPickupDays(now = new Date(), dayCount = 3) {
	const earliest = new Date(now.getTime() + STORE.pickupMinutes * 60000);
	const days = [];
	for (let offset = 0; days.length < dayCount && offset < dayCount + 2; offset += 1) {
		const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
		const slots = [];
		for (let minutes = STORE.openHour * 60; minutes <= STORE.closeHour * 60 - SLOT_MINUTES; minutes += SLOT_MINUTES) {
			const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
			if (slot >= earliest) slots.push(slot);
		}
		if (slots.length) days.push({ key: day.toDateString(), label: dayLabel(day, now), slots });
	}
	return days;
}

/** Prazo do pedido: o horário escolhido ou, nos pedidos antigos, criação + tempo de preparo. */
export function pickupDeadline(order) {
	const chosen = toDate(order?.pickupAt);
	if (chosen) return chosen;
	const created = toDate(order?.createdAt);
	return created ? new Date(created.getTime() + STORE.pickupMinutes * 60000) : null;
}
