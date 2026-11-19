import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	serverTimestamp,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';
import { db } from './FireBaseConfig';

// Banners do carrossel de promoções da Home do cliente (coleção "banners" no Firestore).
// Campos: imageUrl (foto comprimida), title, target ('nenhum' | 'ofertas' | 'categoria'),
// categoryId, ativo, ordem. Sem nenhum banner ativo, a Home mostra as ofertas automáticas do catálogo.

export const BANNERS_COLLECTION = 'banners';

export const BANNER_TARGETS = [
	{ key: 'ofertas', label: 'Ofertas' },
	{ key: 'categoria', label: 'Categoria' },
	{ key: 'nenhum', label: 'Só imagem' },
];

function sortBanners(list) {
	return [...list].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
}

/** Todos os banners (ativos e pausados), na ordem do carrossel. */
export function subscribeBanners(onChange, onError) {
	return onSnapshot(
		collection(db, BANNERS_COLLECTION),
		(snapshot) => onChange(sortBanners(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
		onError,
	);
}

/** Só os banners que aparecem para o cliente. */
export function subscribeActiveBanners(onChange, onError) {
	return subscribeBanners((banners) => onChange(banners.filter((banner) => (
		banner.ativo !== false && typeof banner.imageUrl === 'string' && banner.imageUrl.length > 0
	))), onError);
}

export function createBanner({ imageUrl, title, target, categoryId }, currentBanners) {
	const lastOrder = currentBanners.reduce((max, banner) => Math.max(max, Number(banner.ordem) || 0), 0);
	return addDoc(collection(db, BANNERS_COLLECTION), {
		imageUrl,
		title: title || '',
		target: target || 'nenhum',
		categoryId: target === 'categoria' ? categoryId || null : null,
		ativo: true,
		ordem: lastOrder + 1,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
}

export function updateBanner(id, fields) {
	return updateDoc(doc(db, BANNERS_COLLECTION, id), { ...fields, updatedAt: serverTimestamp() });
}

export function deleteBanner(id) {
	return deleteDoc(doc(db, BANNERS_COLLECTION, id));
}

/** Troca a posição de dois banners vizinhos no carrossel. */
export async function swapBannerOrder(banners, index, direction) {
	const other = index + direction;
	if (other < 0 || other >= banners.length) return;
	const batch = writeBatch(db);
	// Reescreve a ordem de todos (1, 2, 3...) para não haver empates.
	const reordered = [...banners];
	[reordered[index], reordered[other]] = [reordered[other], reordered[index]];
	reordered.forEach((banner, position) => {
		batch.update(doc(db, BANNERS_COLLECTION, banner.id), { ordem: position + 1, updatedAt: serverTimestamp() });
	});
	await batch.commit();
}
