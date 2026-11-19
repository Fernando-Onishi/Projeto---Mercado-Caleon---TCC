import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './FireBaseConfig';
import { PRODUCTS } from './Produtos';

// Produtos que já fizeram parte do catálogo inicial e foram substituídos: a sincronização os desativa no Firestore.
const RETIRED_SEED_IDS = ['guarana-zero', 'heineken-zero', 'iogurte-nestle'];

// O Firestore passa a ser a fonte única do catálogo quando já tem os produtos do catálogo inicial.
export function isCatalogSeeded(productDocs) {
	return productDocs.some((productDocument) => Boolean(productDocument.data().seedId));
}

// Dados do produto do catálogo inicial. A foto não vai para o Firebase: ela já vem dentro do app
// (assets/produtos) e cada aparelho a usa quando o produto no Firestore não tiver foto própria.
function seedFields(product) {
	return {
		seedId: product.id,
		name: product.name,
		category: product.category,
		pricePerKg: product.pricePerKg,
		originalPricePerKg: product.originalPricePerKg ?? null,
		averageWeightGrams: product.averageWeightGrams,
		availableWeights: product.availableWeights,
		defaultWeightGrams: product.defaultWeightGrams,
		unitBase: product.unitBase || 'g',
		unit: product.unit || 'kg',
		description: product.description || '',
		imageUrl: '',
		imageUrls: [],
		imageFromSeed: true,
		stockCurrent: 30,
		stockMinimum: 10,
		stockMaximum: 100,
		stockCritical: 5,
		active: true,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};
}

let runningSync = null;

/**
 * Envia para o Firestore os produtos do catálogo inicial que ainda não estão lá.
 * Só o admin tem permissão de escrita. Não mexe em produtos que já existem (edições do admin ficam).
 */
export function syncSeedCatalog() {
	if (runningSync) return runningSync;
	runningSync = (async () => {
		const result = { created: 0, imagesUpdated: 0, retired: 0, failed: [] };
		for (const product of PRODUCTS) {
			try {
				const productRef = doc(db, 'products', product.id);
				const snapshot = await getDoc(productRef);
				if (!snapshot.exists()) {
					await setDoc(productRef, seedFields(product));
					result.created += 1;
				} else if (!snapshot.data().seedId) {
					await setDoc(productRef, { seedId: product.id }, { merge: true });
				}
			} catch (error) {
				result.failed.push(product.id);
				console.error(`Não foi possível sincronizar o produto ${product.id}.`, error);
			}
		}
		for (const retiredId of RETIRED_SEED_IDS) {
			try {
				const retiredRef = doc(db, 'products', retiredId);
				const snapshot = await getDoc(retiredRef);
				const data = snapshot.exists() ? snapshot.data() : null;
				// Só desativa se ainda for o produto do catálogo inicial (não mexe em produto com foto do admin).
				if (data && data.seedId && data.active !== false && data.imageFromSeed !== false) {
					await setDoc(retiredRef, { active: false, updatedAt: serverTimestamp() }, { merge: true });
					result.retired += 1;
				}
			} catch (error) {
				console.error(`Não foi possível desativar o produto antigo ${retiredId}.`, error);
			}
		}
		return result;
	})().finally(() => {
		runningSync = null;
	});
	return runningSync;
}
