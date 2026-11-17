import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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
import { getProfileStorageKey } from './PerfilStorage';
import { CART_STORAGE_KEY } from './ProdutoStorage';
import { SERVICE_FEE, STORE, makePixTxid } from './Pagamento';

export const ORDERS_COLLECTION = 'orders';

// Etapas do pedido, na ordem em que o admin avança.
export const ORDER_STEPS = [
	{ key: 'recebido', label: 'Pedido Recebido', place: 'Mercado' },
	{ key: 'preparando', label: 'Preparando', place: 'Mercado' },
	{ key: 'pronto', label: 'Seu pedido está pronto para retirada', place: 'Mercado' },
	{ key: 'retirado', label: 'Pedido retirado', place: 'Mercado' },
];

export const ORDER_STATUS_LABELS = {
	recebido: 'Recebido',
	preparando: 'Preparando',
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
	try {
		const stored = JSON.parse(await AsyncStorage.getItem(getProfileStorageKey(uid)) || '{}');
		return stored && typeof stored === 'object' ? stored : {};
	} catch {
		return {};
	}
}

// Converte o endereço/CEP do cliente em coordenadas (OpenStreetMap Nominatim). Se falhar, o mapa mostra só o mercado.
async function geocodeCustomer({ address, cep }) {
	const cepDigits = String(cep || '').replace(/\D/g, '');
	const urls = [];
	if (address) {
		const text = cepDigits ? `${address}, ${cepDigits}, Brasil` : `${address}, Brasil`;
		urls.push(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(text)}`);
	}
	if (cepDigits.length === 8) {
		urls.push(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&postalcode=${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`);
	}
	for (const url of urls) {
		try {
			const response = await fetch(url, { headers: { 'User-Agent': 'CaleonApp/1.0', 'Accept-Language': 'pt-BR' } });
			const [result] = await response.json();
			const latitude = Number(result?.lat);
			const longitude = Number(result?.lon);
			if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
		} catch {}
	}
	return null;
}

/**
 * Cria o pedido no Firestore a partir da sacola e esvazia a sacola.
 * payment: { method: 'pix' | 'visa' | 'mastercard', cardLast4? }
 */
export async function createOrderFromCart(payment) {
	const user = auth.currentUser;
	if (!user) throw new Error('not-signed-in');
	const { items, subtotal, serviceFee, total } = await readCartSummary();
	if (items.length === 0) throw new Error('empty-cart');

	const profile = await readCustomerProfile(user.uid);
	const orderRef = doc(collection(db, ORDERS_COLLECTION));
	const number = orderRef.id.slice(0, 6).toUpperCase();
	const customerLocation = await geocodeCustomer(profile);
	const isPix = payment.method === 'pix';

	const order = {
		number,
		userId: user.uid,
		customerName: profile.name || user.displayName || (user.email ? user.email.split('@')[0] : 'Cliente'),
		customerEmail: user.email || '',
		customerAddress: profile.address || '',
		customerCep: profile.cep || '',
		customerLocation,
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
		status: 'recebido',
		statusHistory: { recebido: serverTimestamp() },
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	await setDoc(orderRef, order);
	await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
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
			const orders = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
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
		updatedAt: serverTimestamp(),
	});
}
