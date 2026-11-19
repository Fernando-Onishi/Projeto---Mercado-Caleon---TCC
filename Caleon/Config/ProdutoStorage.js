import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './FireBaseConfig';
import { formatProductUnit, getProductPrice, productImageFor } from './Produtos';

// Sacola e favoritos: ficam no aparelho (para abrir rápido e funcionar sem internet) e são
// sincronizados com users/{uid} no Firestore, para aparecerem iguais em qualquer aparelho da mesma conta.
// Toda mudança avisa as telas na hora (eventos abaixo), para o coração e a sacola atualizarem sozinhos.

export const CART_STORAGE_KEY = '@sacola_itens';
export const FAVORITES_STORAGE_KEY = '@caleon_favorites';
export const FAVORITES_CHANGED_EVENT = 'caleon:favoritos-changed';
export const CART_CHANGED_EVENT = 'caleon:sacola-itens-changed';
const SACOLA_COUNT_EVENT = 'caleon:sacola-changed';

// Identifica este aparelho, para não reaplicar as próprias mudanças quando o Firebase as devolver.
export const DEVICE_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function readArray(key) {
	try {
		const stored = await AsyncStorage.getItem(key);
		const value = stored ? JSON.parse(stored) : [];
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

function countItems(items) {
	return items.reduce((total, item) => total + Math.max(0, Number(item?.quantidade) || 0), 0);
}

// Para o Firestore: sem valores undefined e sem fotos locais/embutidas (a foto é recalculada em cada aparelho).
export function cartForRemote(items) {
	return JSON.parse(JSON.stringify(items.map((item) => {
		const uri = typeof item.imagem === 'string' ? item.imagem : item.imagem?.uri;
		return { ...item, imagem: /^https?:\/\//.test(uri || '') ? { uri } : null };
	})));
}

// Vindo do Firestore: devolve a foto que o aparelho conhece para cada produto.
export function cartFromRemote(items) {
	return (Array.isArray(items) ? items : []).map((item) => ({
		...item,
		imagem: item.imagem?.uri ? item.imagem : { uri: productImageFor(item.productId) },
	}));
}

async function pushRemote(fields) {
	const user = auth.currentUser;
	if (!user) return;
	try {
		await setDoc(doc(db, 'users', user.uid), { ...fields, syncDevice: DEVICE_ID, syncedAt: serverTimestamp() }, { merge: true });
	} catch (error) {
		console.warn('Não foi possível sincronizar com o Firebase agora.', error?.code || error);
	}
}

/** Grava os favoritos no aparelho, avisa as telas e (opcionalmente) envia ao Firebase. */
export async function writeFavorites(ids, { sync = true } = {}) {
	const unique = [...new Set(ids.filter(Boolean))];
	await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(unique));
	DeviceEventEmitter.emit(FAVORITES_CHANGED_EVENT, unique);
	if (sync) pushRemote({ favorites: unique });
	return unique;
}

/** Grava a sacola no aparelho, avisa as telas e (opcionalmente) envia ao Firebase. */
export async function writeCart(items, { sync = true } = {}) {
	const list = Array.isArray(items) ? items : [];
	await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(list));
	DeviceEventEmitter.emit(CART_CHANGED_EVENT, list);
	DeviceEventEmitter.emit(SACOLA_COUNT_EVENT, countItems(list));
	if (sync) pushRemote({ cart: cartForRemote(list) });
	return list;
}

export function getFavorites() {
	return readArray(FAVORITES_STORAGE_KEY);
}

export function getCart() {
	return readArray(CART_STORAGE_KEY);
}

export async function toggleFavorite(productId) {
	const favoriteIds = await getFavorites();
	const isFavorite = favoriteIds.includes(productId);
	const nextFavorites = isFavorite
		? favoriteIds.filter((id) => id !== productId)
		: [...favoriteIds, productId];
	const saved = await writeFavorites(nextFavorites);
	return { favoriteIds: saved, isFavorite: !isFavorite };
}

export async function getCartCount() {
	return countItems(await getCart());
}

export async function getCartProductIds() {
	const items = await getCart();
	return [...new Set(items.map((item) => item.productId).filter(Boolean))];
}

export async function removeProductFromCart(productId) {
	const items = await getCart();
	return writeCart(items.filter((item) => item.productId !== productId));
}

export async function addProductToCart(product, weightGrams) {
	const items = await getCart();
	const itemId = `${product.id}-${weightGrams}`;
	const price = getProductPrice(product, weightGrams);
	const existingItem = items.find((item) => item.id === itemId);
	let nextItems;

	if (existingItem) {
		nextItems = items.map((item) => item.id === itemId
			? { ...item, quantidade: (Number(item.quantidade) || 1) + 1 }
			: item);
	} else {
		const productUnit = formatProductUnit(product, weightGrams);
		const discount = product.originalPricePerKg
			? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
			: null;
		nextItems = [...items, {
			id: itemId,
			productId: product.id,
			nome: product.name,
			preco: price,
			unidade: `/${productUnit}`,
			peso: productUnit,
			pesoGramas: weightGrams,
			quantidade: 1,
			imagem: { uri: product.imageUrl },
			desconto: discount,
			precoOriginal: product.originalPricePerKg
				? getProductPrice({ pricePerKg: product.originalPricePerKg }, weightGrams)
				: null,
			favorito: false,
		}];
	}

	return writeCart(nextItems);
}
