import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatWeight, getProductPrice } from './Produtos';

export const CART_STORAGE_KEY = '@sacola_itens';
export const FAVORITES_STORAGE_KEY = '@caleon_favorites';

async function readArray(key) {
	try {
		const stored = await AsyncStorage.getItem(key);
		const value = stored ? JSON.parse(stored) : [];
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

export function getFavorites() {
	return readArray(FAVORITES_STORAGE_KEY);
}

export async function toggleFavorite(productId) {
	const favoriteIds = await getFavorites();
	const isFavorite = favoriteIds.includes(productId);
	const nextFavorites = isFavorite
		? favoriteIds.filter((id) => id !== productId)
		: [...favoriteIds, productId];
	await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
	return { favoriteIds: nextFavorites, isFavorite: !isFavorite };
}

export async function getCartCount() {
	const items = await readArray(CART_STORAGE_KEY);
	return items.reduce((count, item) => count + Math.max(0, Number(item.quantidade) || 0), 0);
}

export async function addProductToCart(product, weightGrams) {
	const items = await readArray(CART_STORAGE_KEY);
	const itemId = `${product.id}-${weightGrams}`;
	const price = getProductPrice(product, weightGrams);
	const existingItem = items.find((item) => item.id === itemId);
	let nextItems;

	if (existingItem) {
		nextItems = items.map((item) => item.id === itemId
			? { ...item, quantidade: (Number(item.quantidade) || 1) + 1 }
			: item);
	} else {
		const discount = product.originalPricePerKg
			? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
			: null;
		nextItems = [...items, {
			id: itemId,
			productId: product.id,
			nome: product.name,
			preco: price,
			unidade: `/${formatWeight(weightGrams)}`,
			peso: formatWeight(weightGrams),
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

	await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
	return nextItems;
}
