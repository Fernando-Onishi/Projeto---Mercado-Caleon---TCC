import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';
import { formatCurrency } from '../Config/Produtos';
import { STORE } from '../Config/Pagamento';
import { OPEN_STATUSES, subscribeToAllOrders, toDate } from '../Config/Pedidos';
import { formatPickup, pickupDeadline } from '../Config/Retirada';
import { getUserRole } from '../src/utils/getUserRole';
import { subscribePromotion } from '../Config/Equipe';
import { isExpiringSoon, isLowStock, isOutOfStock, mapAdminProduct } from '../TelasAdmin/adminProdutoUtils';
import { showGlobalNotification } from './NotificacaoGlobal';

// Notificações do painel admin, geradas em tempo real a partir dos pedidos e do estoque no Firestore.
// É uma caixa única da equipe: o que um admin lê ou limpa vale para todos os admins
// (estado compartilhado em adminState/notificacoes no Firestore).

const RECENT_DAYS = 7;
const STAFF_ROLES = ['admin', 'employee'];
const SHARED_STATE = ['adminState', 'notificacoes'];
// Só vira aviso no topo o que acontecer depois que o painel abriu (evita "pedido novo" falso ao abrir).
const TOAST_GRACE_MS = 5000;

function orderEvents(orders, now) {
	const events = [];
	const since = now - RECENT_DAYS * 86400000;
	for (const order of orders) {
		const created = toDate(order.createdAt)?.getTime() || 0;
		if (order.status === 'cancelado' || order.status === 'retirado') continue;
		if (created >= since) {
			events.push({
				id: `${order.id}:novo`,
				orderId: order.id,
				title: `Novo pedido #${order.number}`,
				detail: `${order.customerName || 'Cliente'} • ${formatCurrency(Number(order.total) || 0)}`,
				icon: 'shopping-bag',
				color: '#40B190',
				at: created,
				toast: true,
			});
		}
		if (order.paymentMethod === 'pix' && order.paymentStatus === 'informado') {
			events.push({
				id: `${order.id}:pix-informado`,
				orderId: order.id,
				title: `Pix informado no pedido #${order.number}`,
				detail: `Confira se ${formatCurrency(Number(order.total) || 0)} caiu na conta e confirme.`,
				icon: 'dollar-sign',
				color: '#00AA6A',
				at: toDate(order.updatedAt)?.getTime() || created,
				toast: true,
			});
		}
		const lateAt = pickupDeadline(order)?.getTime() || 0;
		if (OPEN_STATUSES.includes(order.status) && lateAt && now > lateAt) {
			events.push({
				id: `${order.id}:atrasado`,
				orderId: order.id,
				title: `Pedido #${order.number} atrasado`,
				detail: order.pickupAt
					? `O cliente vem buscar ${formatPickup(order.pickupAt).toLowerCase()} e ainda não está pronto.`
					: `Passou de ${STORE.pickupMinutes} minutos e ainda não está pronto.`,
				icon: 'alert-triangle',
				color: '#FF383C',
				at: lateAt,
				toast: false,
			});
		}
	}
	return events;
}

const STOCK_GROUPS = [
	{ key: 'zerado', title: 'Estoque zerado', icon: 'x-octagon', color: '#FF383C', filter: 'Estoque zerado', test: isOutOfStock },
	{ key: 'baixo', title: 'Estoque baixo', icon: 'alert-circle', color: '#E7A51A', filter: 'Estoque baixo', test: isLowStock },
	{ key: 'vencimento', title: 'Vencimento próximo', icon: 'calendar', color: '#FFA326', filter: 'Vencimento próximo', test: (p) => isExpiringSoon(p) },
];

// Avisos de estoque com id fixo por tipo. Depois de limpo, só volta se a quantidade AUMENTAR.
function stockEvents(products, shared) {
	return STOCK_GROUPS.map((group) => {
		const count = products.filter(group.test).length;
		if (!count) return null;
		if ((Number(shared.stockClearedCount?.[group.key]) || 0) >= count) return null;
		return {
			id: `estoque:${group.key}`,
			stockKey: group.key,
			stockCount: count,
			title: group.title,
			detail: `${count} ${count === 1 ? 'produto' : 'produtos'}`,
			icon: group.icon,
			color: group.color,
			filter: group.filter,
			at: Number(shared.stockFirstSeen?.[`${group.key}:${count}`]) || 0,
			toast: false,
		};
	}).filter(Boolean);
}

const AdminNotificationsContext = createContext(null);

export function AdminNotificationsProvider({ children }) {
	const [uid, setUid] = useState(null);
	const [isStaff, setIsStaff] = useState(false);
	const [orders, setOrders] = useState([]);
	const [ordersReady, setOrdersReady] = useState(false);
	const [products, setProducts] = useState([]);
	const [promotedAt, setPromotedAt] = useState(null);
	const [now, setNow] = useState(() => Date.now());
	const [shared, setShared] = useState({ seenAt: 0, dismissed: [], stockFirstSeen: {}, stockClearedCount: {} });
	const [sharedReady, setSharedReady] = useState(false);
	const sessionStart = useRef(Date.now());
	const knownToastIds = useRef(new Set());

	useEffect(() => onAuthStateChanged(auth, async (user) => {
		setUid(user?.uid || null);
		if (!user) {
			setIsStaff(false);
			return;
		}
		try {
			setIsStaff(STAFF_ROLES.includes(await getUserRole(user)));
		} catch {
			setIsStaff(false);
		}
	}), []);

	// Relógio para "pedido atrasado" aparecer sozinho.
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60000);
		return () => clearInterval(timer);
	}, []);

	// Pedidos, estoque e o estado compartilhado da caixa de notificações da equipe.
	useEffect(() => {
		sessionStart.current = Date.now();
		knownToastIds.current = new Set();
		setOrders([]);
		setOrdersReady(false);
		setProducts([]);
		setSharedReady(false);
		if (!uid || !isStaff) return undefined;
		const stops = [
			subscribeToAllOrders((next) => {
				setOrders(next);
				setOrdersReady(true);
			}, (error) => console.error('Notificações: não foi possível ler os pedidos.', error)),
			onSnapshot(collection(db, 'products'), (snapshot) => {
				setProducts(snapshot.docs.map(mapAdminProduct).filter(Boolean));
			}, (error) => console.error('Notificações: não foi possível ler o estoque.', error)),
			onSnapshot(doc(db, ...SHARED_STATE), (snapshot) => {
				const data = snapshot.data() || {};
				setShared({
					seenAt: Number(data.seenAt) || 0,
					dismissed: Array.isArray(data.dismissed) ? data.dismissed : [],
					stockFirstSeen: data.stockFirstSeen || {},
					stockClearedCount: data.stockClearedCount || {},
				});
				setSharedReady(true);
			}, (error) => {
				console.error('Notificações: estado compartilhado indisponível (confira as regras de adminState).', error?.code || error);
				setSharedReady(true);
			}),
		];
		return () => stops.forEach((stop) => stop());
	}, [uid, isStaff]);

	const writeShared = useCallback((fields) => {
		setDoc(doc(db, ...SHARED_STATE), { ...fields, updatedAt: serverTimestamp() }, { merge: true })
			.catch((error) => console.warn('Não foi possível salvar o estado das notificações.', error?.code || error));
	}, []);

	// Boas-vindas para quem foi promovido a administrador (pela tela Equipe).
	useEffect(() => {
		setPromotedAt(null);
		if (!uid) return undefined;
		return subscribePromotion(uid, auth.currentUser?.email, setPromotedAt);
	}, [uid]);

	const allEvents = useMemo(() => {
		const welcome = promotedAt ? [{
			id: `bemvindo-admin:${uid}`,
			title: 'Você agora é administrador!',
			detail: 'Bem-vindo à equipe. Você entra sempre com o mesmo e-mail e senha.',
			icon: 'shield',
			color: '#1B4B3D',
			at: promotedAt,
			toast: false,
		}] : [];
		const stock = sharedReady ? stockEvents(products, shared) : [];
		return [...welcome, ...orderEvents(orders, now), ...stock].sort((a, b) => b.at - a.at);
	}, [orders, products, now, sharedReady, shared, promotedAt, uid]);

	// Registra (para todos os admins) quando cada situação de estoque apareceu pela primeira vez.
	useEffect(() => {
		if (!sharedReady) return;
		const missing = allEvents.filter((event) => event.stockKey && !event.at);
		if (!missing.length) return;
		const stamp = Date.now();
		writeShared({ stockFirstSeen: Object.fromEntries(missing.map((event) => [`${event.stockKey}:${event.stockCount}`, stamp])) });
	}, [allEvents, sharedReady, writeShared]);

	// Aviso no topo: só pedido novo / Pix informado que aconteceu depois que o painel abriu.
	useEffect(() => {
		if (!ordersReady) return;
		allEvents
			.filter((event) => event.toast && event.at >= sessionStart.current - TOAST_GRACE_MS && !knownToastIds.current.has(event.id))
			.slice(0, 2)
			.forEach((event) => {
				knownToastIds.current.add(event.id);
				showGlobalNotification(event.title);
			});
	}, [allEvents, ordersReady]);

	const notifications = useMemo(
		() => allEvents.filter((event) => !shared.dismissed.includes(event.id)),
		[allEvents, shared.dismissed],
	);
	const unreadCount = useMemo(() => notifications.filter((event) => event.at > shared.seenAt).length, [notifications, shared.seenAt]);

	const value = useMemo(() => {
		function dismiss(events) {
			const ids = events.filter((event) => !event.stockKey).map((event) => event.id);
			const stockCleared = Object.fromEntries(events.filter((event) => event.stockKey).map((event) => [event.stockKey, event.stockCount]));
			const nextDismissed = [...new Set([...shared.dismissed, ...ids])].slice(-300);
			setShared((current) => ({
				...current,
				dismissed: nextDismissed,
				stockClearedCount: { ...current.stockClearedCount, ...stockCleared },
			}));
			writeShared({
				dismissed: nextDismissed,
				...(Object.keys(stockCleared).length ? { stockClearedCount: stockCleared } : {}),
			});
		}
		return {
			notifications,
			unreadCount,
			seenAt: shared.seenAt,
			markAllRead() {
				// Usa o mais recente entre o relógio do aparelho e os avisos (o relógio do celular pode estar atrasado).
				const nowMs = Math.max(Date.now(), ...notifications.map((event) => event.at));
				setShared((current) => ({ ...current, seenAt: nowMs }));
				writeShared({ seenAt: nowMs });
			},
			removeNotification(id) {
				dismiss(notifications.filter((event) => event.id === id));
			},
			clearNotifications() {
				dismiss(notifications);
			},
		};
	}, [notifications, unreadCount, shared, writeShared]);

	return <AdminNotificationsContext.Provider value={value}>{children}</AdminNotificationsContext.Provider>;
}

export function useAdminNotifications() {
	const context = useContext(AdminNotificationsContext);
	if (!context) throw new Error('useAdminNotifications deve ser usado dentro de AdminNotificationsProvider.');
	return context;
}
