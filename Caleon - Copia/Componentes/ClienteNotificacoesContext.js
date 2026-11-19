import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';
import { formatCurrency } from '../Config/Produtos';
import { STORE } from '../Config/Pagamento';
import { subscribeToMyOrders, toDate } from '../Config/Pedidos';
import { formatPickup } from '../Config/Retirada';
import { subscribePromotion, subscribeRemoval } from '../Config/Equipe';
import { showGlobalNotification } from './NotificacaoGlobal';

// Notificações do cliente: geradas a partir das mudanças nos pedidos dele (Firestore, em tempo real).
// O que já foi lido ou apagado fica na conta (Firestore), igual em qualquer aparelho.

const STEP_EVENTS = {
	recebido: { icon: 'shopping-bag', color: '#40B190', title: (n) => `Pedido #${n} recebido`, detail: () => 'O mercado recebeu seu pedido.', toast: false },
	aceito: { icon: 'thumbs-up', color: '#1B4B3D', title: (n) => `Pedido #${n} aceito!`, detail: (o) => (o.pickupAt ? `O mercado confirmou. Retirada ${formatPickup(o.pickupAt).toLowerCase()}.` : 'O mercado confirmou seu pedido.') },
	preparando: { icon: 'package', color: '#E7A51A', title: (n) => `Pedido #${n} em separação`, detail: () => 'Estamos separando seus produtos.' },
	pronto: { icon: 'map-pin', color: '#00AA6A', title: (n) => `Pedido #${n} pronto para retirada!`, detail: () => `Retire em ${STORE.address}.` },
	retirado: { icon: 'check-circle', color: '#1B4B3D', title: (n) => `Pedido #${n} retirado`, detail: () => 'Obrigado pela compra!' },
	cancelado: { icon: 'x-circle', color: '#FF383C', title: (n) => `Pedido #${n} cancelado`, detail: () => 'O mercado cancelou seu pedido.' },
};

function buildEvents(orders) {
	const events = [];
	for (const order of orders) {
		for (const [step, config] of Object.entries(STEP_EVENTS)) {
			const at = toDate(order.statusHistory?.[step]);
			if (!at) continue;
			events.push({
				id: `${order.id}:${step}`,
				orderId: order.id,
				title: config.title(order.number),
				detail: config.detail(order),
				icon: config.icon,
				color: config.color,
				toast: config.toast !== false,
				at: at.getTime(),
			});
		}
		const paidAt = order.paymentMethod === 'pix' && order.paymentStatus === 'confirmado'
			? toDate(order.paymentConfirmedAt) || toDate(order.updatedAt)
			: null;
		if (paidAt) {
			events.push({
				id: `${order.id}:pix`,
				orderId: order.id,
				title: `Pix do pedido #${order.number} confirmado`,
				detail: `Recebemos ${formatCurrency(Number(order.total) || 0)}.`,
				icon: 'check-square',
				color: '#00AA6A',
				toast: true,
				at: paidAt.getTime(),
			});
		}
	}
	return events.sort((a, b) => b.at - a.at);
}

const ClienteNotificacoesContext = createContext(null);
// Só vira aviso no topo o que acontecer depois que o app abriu (nada de aviso "velho" ao entrar).
const TOAST_GRACE_MS = 5000;

export function ClienteNotificacoesProvider({ children }) {
	const [uid, setUid] = useState(auth.currentUser?.uid || null);
	const [events, setEvents] = useState([]);
	const [promotedAt, setPromotedAt] = useState(null);
	const [removedAt, setRemovedAt] = useState(null);
	// Lido/limpo ficam na conta (users/{uid}.notifState): iguais em qualquer aparelho.
	const [state, setState] = useState({ seenAt: 0, dismissed: [] });
	// Pedidos que o cliente excluiu do histórico: os avisos deles também somem.
	const [hiddenOrders, setHiddenOrders] = useState([]);
	const sessionStart = useRef(Date.now());
	const toasted = useRef(new Set());

	useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid || null)), []);

	useEffect(() => {
		sessionStart.current = Date.now();
		toasted.current = new Set();
		setState({ seenAt: 0, dismissed: [] });
		setEvents([]);
		setPromotedAt(null);
		setRemovedAt(null);
		if (!uid) return undefined;
		const stops = [
			onSnapshot(doc(db, 'users', uid), (snapshot) => {
				const notifState = snapshot.data()?.notifState || {};
				const hidden = snapshot.data()?.hiddenOrders;
				setHiddenOrders(Array.isArray(hidden) ? hidden : []);
				setState({
					seenAt: Number(notifState.seenAt) || 0,
					dismissed: Array.isArray(notifState.dismissed) ? notifState.dismissed : [],
				});
			}, () => {}),
			subscribeToMyOrders(uid, (orders) => setEvents(buildEvents(orders)), (error) => console.error('Não foi possível carregar as notificações do cliente.', error)),
			subscribePromotion(uid, auth.currentUser?.email, setPromotedAt),
			subscribeRemoval(uid, setRemovedAt),
		];
		return () => stops.forEach((stop) => stop());
	}, [uid]);

	const writeState = useCallback((next) => {
		if (!uid) return;
		setDoc(doc(db, 'users', uid), { notifState: { seenAt: next.seenAt, dismissed: next.dismissed.slice(-300) } }, { merge: true })
			.catch((error) => console.warn('Não foi possível salvar o estado das notificações.', error?.code || error));
	}, [uid]);

	const allEvents = useMemo(() => {
		const extra = [];
		if (promotedAt) {
			extra.push({
				id: `role:admin:${promotedAt}`,
				title: 'Você agora é administrador!',
				detail: 'Toque para abrir o painel admin. Você entra com o mesmo e-mail e senha.',
				icon: 'shield',
				color: '#1B4B3D',
				action: 'admin',
				toast: true,
				at: promotedAt,
			});
		}
		if (removedAt) {
			extra.push({
				id: `role:removido:${removedAt}`,
				title: 'Você não é mais administrador',
				detail: 'Seu acesso ao painel admin foi removido por outro administrador. Você continua usando o app como cliente.',
				icon: 'user-x',
				color: '#FF383C',
				action: null,
				toast: false,
				at: removedAt,
			});
		}
		return [...extra, ...events].sort((a, b) => b.at - a.at);
	}, [events, promotedAt, removedAt]);

	// Aviso no topo para o que acontecer com o app aberto.
	useEffect(() => {
		allEvents
			.filter((event) => event.toast && event.at >= sessionStart.current - TOAST_GRACE_MS && !toasted.current.has(event.id))
			.slice(0, 2)
			.forEach((event) => {
				toasted.current.add(event.id);
				showGlobalNotification(event.title);
			});
	}, [allEvents]);

	const notifications = useMemo(
		() => allEvents.filter((event) => !state.dismissed.includes(event.id) && !(event.orderId && hiddenOrders.includes(event.orderId))),
		[allEvents, state.dismissed, hiddenOrders],
	);
	const unreadCount = useMemo(() => notifications.filter((event) => event.at > state.seenAt).length, [notifications, state.seenAt]);

	const value = useMemo(() => {
		const update = (next) => {
			setState(next);
			writeState(next);
		};
		return {
			notifications,
			unreadCount,
			seenAt: state.seenAt,
			markAllRead() {
				// Usa o mais recente entre o relógio do aparelho e os avisos (o relógio do celular pode estar atrasado).
				update({ ...state, seenAt: Math.max(Date.now(), ...notifications.map((event) => event.at)) });
			},
			removeNotification(id) {
				update({ ...state, dismissed: [...new Set([...state.dismissed, id])] });
			},
			clearNotifications() {
				update({ ...state, dismissed: [...new Set([...state.dismissed, ...notifications.map((event) => event.id)])] });
			},
		};
	}, [notifications, unreadCount, state, writeState]);

	return <ClienteNotificacoesContext.Provider value={value}>{children}</ClienteNotificacoesContext.Provider>;
}

export function useClienteNotificacoes() {
	const context = useContext(ClienteNotificacoesContext);
	if (!context) throw new Error('useClienteNotificacoes deve ser usado dentro de ClienteNotificacoesProvider.');
	return context;
}
