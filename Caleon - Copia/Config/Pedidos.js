import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	arrayUnion,
	collection,
	doc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
} from 'firebase/firestore';
import { auth, db } from './FireBaseConfig';
import { loadProfileData } from './PerfilStorage';
import { CART_STORAGE_KEY, writeCart } from './ProdutoStorage';
import { SERVICE_FEE, STORE, makePixTxid } from './Pagamento';

export const ORDERS_COLLECTION = 'orders';

// Etapas do pedido, na ordem em que o admin avança.
export const ORDER_STEPS = [
	{ key: 'recebido', label: 'Pedido enviado', place: 'Aguardando o mercado aceitar' },
	{ key: 'aceito', label: 'Pedido aceito', place: 'O mercado confirmou seu pedido' },
	{ key: 'preparando', label: 'Sendo preparado', place: 'Separando seus produtos' },
	{ key: 'pronto', label: 'Pronto para retirada', place: 'Pode vir buscar' },
	{ key: 'retirado', label: 'Pedido retirado', place: 'Obrigado pela compra' },
];

// Pedidos que ainda não ficaram prontos (contam como "na fila").
export const OPEN_STATUSES = ['recebido', 'aceito', 'preparando'];

export const ORDER_STATUS_LABELS = {
	recebido: 'Aguardando aceite',
	aceito: 'Aceito',
	preparando: 'Sendo preparado',
	pronto: 'Pronto para retirada',
	retirado: 'Retirado',
	cancelado: 'Cancelado',
};

export const PAYMENT_LABELS = {
	pix: 'Pix',
	visa: 'Visa',
	mastercard: 'Mastercard',
};

export const PAYMENT_STATUS_LABELS = {
	aguardando: 'Aguardando pagamento',
	informado: 'Cliente informou o pagamento',
	confirmado: 'Pagamento confirmado',
	na_retirada: 'Pagar na retirada',
};

export function toDate(value) {
	if (!value) return null;
	if (typeof value.toDate === 'function') return value.toDate();
	const date = value instanceof Date ? value : new Date(value);
	return Number.isFinite(date.getTime()) ? date : null;
}

export function formatTime(value) {
	const date = toDate(value);
	return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

export function formatDateTime(value) {
	const date = toDate(value);
	return date
		? `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} • ${formatTime(date)}`
		: '';
}

async function readCart() {
	try {
		const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
		const items = stored ? JSON.parse(stored) : [];
		return Array.isArray(items) ? items : [];
	} catch {
		return [];
	}
}

export async function readCartSummary() {
	const items = await readCart();
	const subtotal = Math.round(items.reduce(
		(sum, item) => sum + (Number(item.preco) || 0) * (Number(item.quantidade) || 1),
		0,
	) * 100) / 100;
	return { items, subtotal, serviceFee: SERVICE_FEE, total: Math.round((subtotal + SERVICE_FEE) * 100) / 100 };
}

async function readCustomerProfile(uid) {
	// Perfil da conta (endereço, CEP, telefone), com o do aparelho como reserva.
	return loadProfileData(uid);
}


/**
 * Cria o pedido no Firestore a partir da sacola e esvazia a sacola.
 * payment: { method: 'pix' | 'visa' | 'mastercard', cardLast4? }
 * pickupAt: Date — horário de retirada escolhido pelo cliente.
 */
export async function createOrderFromCart(payment, pickupAt) {
	const user = auth.currentUser;
	if (!user) throw new Error('not-signed-in');
	const { items, subtotal, serviceFee, total } = await readCartSummary();
	if (items.length === 0) throw new Error('empty-cart');

	if (!(pickupAt instanceof Date) || !Number.isFinite(pickupAt.getTime())) throw new Error('no-pickup-time');
	// Horário que já passou (tela de pagamento aberta por muito tempo): pede outro.
	if (pickupAt.getTime() < Date.now() + 10 * 60000) throw new Error('pickup-past');

	const profile = await readCustomerProfile(user.uid);
	const orderRef = doc(collection(db, ORDERS_COLLECTION));
	const number = orderRef.id.slice(0, 6).toUpperCase();
	const isPix = payment.method === 'pix';

	const order = {
		number,
		userId: user.uid,
		customerName: profile.name || user.displayName || (user.email ? user.email.split('@')[0] : 'Cliente'),
		customerEmail: user.email || '',
		customerAddress: profile.address || '',
		customerCep: profile.cep || '',
		items: items.map((item) => ({
			productId: item.productId || item.id,
			nome: item.nome,
			peso: item.peso || '',
			quantidade: Number(item.quantidade) || 1,
			preco: Math.round((Number(item.preco) || 0) * (Number(item.quantidade) || 1) * 100) / 100,
			precoUnitario: Number(item.preco) || 0,
			imagem: typeof item.imagem === 'string' ? item.imagem : item.imagem?.uri || '',
		})),
		subtotal,
		serviceFee,
		total,
		paymentMethod: payment.method,
		paymentStatus: isPix ? 'aguardando' : 'na_retirada',
		cardLast4: isPix ? null : payment.cardLast4 || null,
		pixTxid: isPix ? makePixTxid(number) : null,
		pickup: { storeName: STORE.name, address: STORE.address, latitude: STORE.latitude, longitude: STORE.longitude },
		pickupAt,
		status: 'recebido',
		statusHistory: { recebido: serverTimestamp() },
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	await setDoc(orderRef, order);
	await writeCart([]);
	return { id: orderRef.id, ...order };
}

export function subscribeToOrder(orderId, onChange, onError) {
	return onSnapshot(doc(db, ORDERS_COLLECTION, orderId), (snapshot) => {
		onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
	}, onError);
}

export function subscribeToMyOrders(userId, onChange, onError) {
	return onSnapshot(
		query(collection(db, ORDERS_COLLECTION), where('userId', '==', userId)),
		(snapshot) => {
			// "estimate": horários recém-gravados pelo servidor já vêm com a hora estimada, em vez de vazios.
			const orders = snapshot.docs.map((item) => ({ id: item.id, ...item.data({ serverTimestamps: 'estimate' }) }));
			orders.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
			onChange(orders);
		},
		onError,
	);
}

// Pedidos em andamento para o admin (os mais antigos primeiro, como uma fila).
export function subscribeToOpenOrders(onChange, onError) {
	return onSnapshot(
		query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'asc')),
		(snapshot) => {
			onChange(snapshot.docs
				.map((item) => ({ id: item.id, ...item.data() }))
				.filter((order) => order.status !== 'retirado' && order.status !== 'cancelado'));
		},
		onError,
	);
}

export function updateOrderStatus(orderId, status) {
	return updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
		status,
		[`statusHistory.${status}`]: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

export function updatePaymentStatus(orderId, paymentStatus) {
	return updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
		paymentStatus,
		// Data em que o dinheiro entrou: é ela que conta no faturamento do painel admin.
		...(paymentStatus === 'confirmado' ? { paymentConfirmedAt: serverTimestamp() } : {}),
		updatedAt: serverTimestamp(),
	});
}

// Todos os pedidos (inclusive retirados e cancelados), para os números do painel admin.
export function subscribeToAllOrders(onChange, onError) {
	return onSnapshot(
		query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'asc')),
		(snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
		onError,
	);
}

// ---------- Histórico do cliente ----------
// "Excluir" um pedido do histórico só o esconde para o cliente: o pedido continua existindo para o
// mercado (faturamento e métricas). A lista fica na conta (users/{uid}.hiddenOrders), igual em qualquer aparelho.

export const FINISHED_STATUSES = ['retirado', 'cancelado'];

export function isFinishedOrder(order) {
	return FINISHED_STATUSES.includes(order?.status);
}

export function hideOrdersForClient(uid, orderIds) {
	const ids = (orderIds || []).filter(Boolean);
	if (!uid || !ids.length) return Promise.resolve();
	return setDoc(doc(db, 'users', uid), { hiddenOrders: arrayUnion(...ids) }, { merge: true });
}

export function subscribeHiddenOrders(uid, onChange) {
	if (!uid) {
		onChange([]);
		return () => {};
	}
	return onSnapshot(doc(db, 'users', uid), (snapshot) => {
		const ids = snapshot.data()?.hiddenOrders;
		onChange(Array.isArray(ids) ? ids : []);
	}, () => onChange([]));
}
