import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './FireBaseConfig';

// Leitura de código de barras / QR Code no painel admin:
// 1) se o código já é de um produto do mercado, devolve esse produto;
// 2) senão, procura o produto nas bases públicas e gratuitas do Open Food Facts
//    (alimentos e bebidas), Open Beauty Facts (higiene) e Open Products Facts (limpeza e outros).

const LOOKUP_SOURCES = [
	'https://world.openfoodfacts.org',
	'https://world.openbeautyfacts.org',
	'https://world.openproductsfacts.org',
];
const FIELDS = 'product_name,product_name_pt,generic_name_pt,brands,quantity,image_front_url,image_url,categories_tags';

// Categoria da base pública -> categoria do mercado.
const CATEGORY_RULES = [
	{ category: 'Bebidas', match: /beverage|bebida|drink|soda|refrigerante|juice|suco|water|agua|beer|cerveja|wine|vinho|coffee|cafe|tea|cha/ },
	{ category: 'Laticínios', match: /dair|latic|milk|leite|cheese|queijo|yogurt|iogurte|butter|manteiga|cream|creme-de-leite/ },
	{ category: 'Doces', match: /sweet|doce|chocolate|candy|bala|biscuit|biscoito|cookie|snack|confect|dessert|sobremesa|gum/ },
	{ category: 'Congelados', match: /frozen|congelad|ice-cream|sorvete/ },
	{ category: 'Padaria', match: /bread|pao|paes|bakery|padaria|cake|bolo|toast|torrada/ },
	{ category: 'Carnes', match: /meat|carne|sausage|salsicha|linguica|ham|presunto|chicken|frango|beef|pork|fish|peixe/ },
	{ category: 'HortiFruti', match: /fresh-fruit|fresh-vegetable|fruta|verdura|legume/ },
	{ category: 'Higiene', match: /hygien|higien|shampoo|soap|sabonete|toothpaste|creme-dental|deodorant|desodorante|cosmetic|beauty/ },
	{ category: 'Limpeza', match: /clean|limpeza|detergent|detergente|bleach|agua-sanitaria|desinfet|laundry|sabao/ },
];

export function onlyBarcodeDigits(value) {
	return String(value || '').trim();
}

/** Parece um código de produto (EAN-8, EAN-13, UPC)? */
export function isProductBarcode(value) {
	return /^\d{8,14}$/.test(onlyBarcodeDigits(value));
}

function guessCategory(tags = [], name = '') {
	const text = `${tags.join(' ')} ${name}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	return CATEGORY_RULES.find((rule) => rule.match.test(text))?.category || 'Mercearia';
}

// "2l" -> "2 L", "395 g" -> "395g", "350ml" -> "350ml"
function formatQuantity(quantity) {
	const text = String(quantity || '').trim();
	if (!text) return 'Unidade';
	return text
		.replace(/\s+/g, ' ')
		.replace(/^(\d+(?:[.,]\d+)?)\s*l$/i, '$1 L')
		.replace(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml)$/i, (_, n, u) => `${n}${u.toLowerCase()}`);
}

function titleCase(text) {
	return String(text || '').toLowerCase().replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
}

/** Produto já cadastrado no mercado com este código. */
export async function findStoreProductByBarcode(code) {
	const snapshot = await getDocs(query(collection(db, 'products'), where('barcode', '==', onlyBarcodeDigits(code)), limit(1)));
	const found = snapshot.docs[0];
	return found ? { id: found.id, ...found.data() } : null;
}

/** Procura o produto nas bases públicas. Devolve dados prontos para o formulário ou null. */
export async function lookupPublicProduct(code) {
	const barcode = onlyBarcodeDigits(code);
	if (!isProductBarcode(barcode)) return null;
	for (const base of LOOKUP_SOURCES) {
		try {
			const response = await fetch(`${base}/api/v2/product/${barcode}.json?fields=${FIELDS}`);
			if (!response.ok) continue;
			const data = await response.json();
			const product = data?.status === 1 ? data.product : null;
			const rawName = product?.product_name_pt || product?.product_name || product?.generic_name_pt;
			if (!rawName) continue;
			const brand = String(product.brands || '').split(',')[0].trim();
			const name = rawName.length > 3 && rawName === rawName.toLowerCase() ? titleCase(rawName) : rawName.trim();
			return {
				name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} ${brand}` : name,
				brand,
				description: [brand, product.quantity].filter(Boolean).join(' • '),
				category: guessCategory(product.categories_tags, name),
				unit: formatQuantity(product.quantity),
				imageUrl: product.image_front_url || product.image_url || '',
				barcode,
				source: base.replace('https://world.', ''),
			};
		} catch (error) {
			console.warn('Busca do código de barras falhou em', base, error?.message || error);
		}
	}
	return null;
}

/**
 * Tudo de uma vez: { status: 'store', product } | { status: 'found', product } | { status: 'unknown', product }.
 * Em 'found' e 'unknown', product já vem no formato de cadastro (embalagem vendida por unidade).
 */
export async function resolveScannedCode(code) {
	const barcode = onlyBarcodeDigits(code);
	try {
		const existing = await findStoreProductByBarcode(barcode);
		if (existing) return { status: 'store', product: existing };
	} catch (error) {
		console.warn('Não foi possível procurar o código no catálogo.', error?.code || error);
	}
	const found = await lookupPublicProduct(barcode);
	const base = { barcode, unitBase: 'un', availableWeights: [1000], defaultWeightGrams: 1000, averageWeightGrams: 1000 };
	if (found) return { status: 'found', product: { ...base, ...found } };
	return { status: 'unknown', product: { ...base, unit: 'Unidade' } };
}
