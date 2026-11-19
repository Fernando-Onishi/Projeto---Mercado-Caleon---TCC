import assetUri from './assetUri';

// Fotos guardadas no próprio app (assets/produtos). Créditos e licenças em assets/produtos/CREDITOS.md.
const img = assetUri;

// Categorias iguais às do filtro da Home e do cadastro de produtos do admin.
export const PRODUCT_CATEGORIES = ['HortiFruti', 'Carnes', 'Bebidas', 'Laticínios', 'Doces', 'Congelados', 'Padaria', 'Mercearia', 'Higiene', 'Limpeza'];

// Produtos reais. pricePerKg: preço por kg nos itens vendidos por peso; nos itens com unitBase 'un', é o preço da embalagem.
// Preços são estimativas de mercado e podem ser ajustados pelo painel admin.
/** Nome de produto sempre em letra maiúscula (padrão de etiqueta de mercado). */
export function productName(name) {
	return String(name || '').trim().toLocaleUpperCase('pt-BR');
}

const BASE_PRODUCTS = [
	{ id: 'banana-prata', name: 'Banana Prata', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/banana-prata.png')), pricePerKg: 6.99, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'tomate', name: 'Tomate', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/tomate.png')), pricePerKg: 8.99, originalPricePerKg: 10.99, averageWeightGrams: 150, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'batata', name: 'Batata', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/batata.png')), pricePerKg: 5.49, originalPricePerKg: null, averageWeightGrams: 200, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'cebola-roxa', name: 'Cebola Roxa', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/cebola-roxa.png')), pricePerKg: 6.99, originalPricePerKg: null, averageWeightGrams: 150, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'maca-gala', name: 'Maçã Gala', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/maca-gala.png')), pricePerKg: 9.99, originalPricePerKg: 12.99, averageWeightGrams: 180, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'laranja-pera', name: 'Laranja Pera', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/laranja-pera.png')), pricePerKg: 4.99, originalPricePerKg: null, averageWeightGrams: 200, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'cenoura', name: 'Cenoura', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/cenoura.png')), pricePerKg: 5.49, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'limao-taiti', name: 'Limão Taiti', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/limao-taiti.png')), pricePerKg: 6.49, originalPricePerKg: null, averageWeightGrams: 80, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'abacate', name: 'Abacate', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/abacate.png')), pricePerKg: 9.9, originalPricePerKg: null, averageWeightGrams: 400, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'mamao-papaia', name: 'Mamão Papaia', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/mamao-papaia.png')), pricePerKg: 8.99, originalPricePerKg: 11.49, averageWeightGrams: 450, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'alface-romana', name: 'Alface Romana', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/alface-romana.png')), pricePerKg: 3.99, originalPricePerKg: null, unitBase: 'un', unit: 'Unidade', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'abacaxi-perola', name: 'Abacaxi Pérola', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/abacaxi-perola.png')), pricePerKg: 7.99, originalPricePerKg: null, unitBase: 'un', unit: 'Unidade', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bife-ancho', name: 'Bife Ancho Bovino', category: 'Carnes', imageUrl: img(require('../assets/produtos/bife-ancho.png')), pricePerKg: 64.9, originalPricePerKg: 74.9, averageWeightGrams: 300, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'carne-moida', name: 'Carne Moída Patinho', category: 'Carnes', imageUrl: img(require('../assets/produtos/carne-moida.png')), pricePerKg: 39.9, originalPricePerKg: null, averageWeightGrams: 500, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'coxa-frango', name: 'Coxa de Frango', category: 'Carnes', imageUrl: img(require('../assets/produtos/coxa-frango.png')), pricePerKg: 14.9, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'bisteca-suina', name: 'Bisteca Suína', category: 'Carnes', imageUrl: img(require('../assets/produtos/bisteca-suina.png')), pricePerKg: 24.9, originalPricePerKg: 27.9, averageWeightGrams: 250, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'linguica-toscana-sadia', name: 'Linguiça Toscana Sadia', category: 'Carnes', imageUrl: img(require('../assets/produtos/linguica-toscana-sadia.png')), pricePerKg: 24.9, originalPricePerKg: null, unitBase: 'un', unit: '950g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'hamburguer-seara', name: 'Hambúrguer Bovino Seara 12 un.', category: 'Carnes', imageUrl: img(require('../assets/produtos/hamburguer-seara.png')), pricePerKg: 22.9, originalPricePerKg: null, unitBase: 'un', unit: '672g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'salsicha-perdigao', name: 'Salsicha Hot Dog Perdigão', category: 'Carnes', imageUrl: img(require('../assets/produtos/salsicha-perdigao.png')), pricePerKg: 11.49, originalPricePerKg: null, unitBase: 'un', unit: '500g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'presunto-sadia', name: 'Presunto Fatiado Sadia Soltíssimo', category: 'Carnes', imageUrl: img(require('../assets/produtos/presunto-sadia.png')), pricePerKg: 9.99, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'coca-cola-2l', name: 'Coca-Cola Original', category: 'Bebidas', imageUrl: img(require('../assets/produtos/coca-cola-2l.png')), pricePerKg: 11.99, originalPricePerKg: 13.49, unitBase: 'un', unit: '2 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'guarana-antarctica', name: 'Guaraná Antarctica Lata', category: 'Bebidas', imageUrl: img(require('../assets/produtos/guarana-antarctica.png')), pricePerKg: 4.49, originalPricePerKg: null, unitBase: 'un', unit: '350ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'del-valle-kapo-uva', name: 'Del Valle Kapo Uva', category: 'Bebidas', imageUrl: img(require('../assets/produtos/del-valle-kapo-uva.png')), pricePerKg: 2.99, originalPricePerKg: null, unitBase: 'un', unit: '200ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'agua-crystal-5l', name: 'Água Mineral Crystal sem Gás', category: 'Bebidas', imageUrl: img(require('../assets/produtos/agua-crystal-5l.png')), pricePerKg: 9.99, originalPricePerKg: null, unitBase: 'un', unit: '5 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'heineken-lata', name: 'Cerveja Heineken Lata', category: 'Bebidas', imageUrl: img(require('../assets/produtos/heineken-lata.png')), pricePerKg: 5.49, originalPricePerKg: 5.99, unitBase: 'un', unit: '350ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'leite-italac', name: 'Leite Integral Italac', category: 'Laticínios', imageUrl: img(require('../assets/produtos/leite-italac.png')), pricePerKg: 5.49, originalPricePerKg: null, unitBase: 'un', unit: '1 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'mussarela-president', name: 'Queijo Mussarela Fatiado Président', category: 'Laticínios', imageUrl: img(require('../assets/produtos/mussarela-president.png')), pricePerKg: 12.9, originalPricePerKg: 14.9, unitBase: 'un', unit: '150g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'iogurte-grego-danone', name: 'Iogurte Grego Danone', category: 'Laticínios', imageUrl: img(require('../assets/produtos/iogurte-grego-danone.png')), pricePerKg: 3.49, originalPricePerKg: null, unitBase: 'un', unit: '90g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'manteiga-aviacao', name: 'Manteiga Aviação Extra com Sal', category: 'Laticínios', imageUrl: img(require('../assets/produtos/manteiga-aviacao.png')), pricePerKg: 15.9, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'requeijao-catupiry', name: 'Requeijão Catupiry Tradicional', category: 'Laticínios', imageUrl: img(require('../assets/produtos/requeijao-catupiry.png')), pricePerKg: 12.9, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'kit-kat', name: 'Kit Kat Nestlé', category: 'Doces', imageUrl: img(require('../assets/produtos/kit-kat.png')), pricePerKg: 3.99, originalPricePerKg: null, unitBase: 'un', unit: '41,5g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'alpino-black-top', name: 'Chocolate Alpino Black Top', category: 'Doces', imageUrl: img(require('../assets/produtos/alpino-black-top.png')), pricePerKg: 6.99, originalPricePerKg: 8.49, unitBase: 'un', unit: '85g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bis-original', name: 'Bis Original Lacta', category: 'Doces', imageUrl: img(require('../assets/produtos/bis-original.png')), pricePerKg: 7.49, originalPricePerKg: null, unitBase: 'un', unit: '126g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'oreo', name: 'Biscoito Oreo Original', category: 'Doces', imageUrl: img(require('../assets/produtos/oreo.png')), pricePerKg: 3.79, originalPricePerKg: null, unitBase: 'un', unit: '90g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pizza-sadia', name: 'Pizza Mussarela Sadia', category: 'Congelados', imageUrl: img(require('../assets/produtos/pizza-sadia.png')), pricePerKg: 19.9, originalPricePerKg: null, unitBase: 'un', unit: '440g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'lasanha-sadia', name: 'Lasanha Quatro Queijos Sadia', category: 'Congelados', imageUrl: img(require('../assets/produtos/lasanha-sadia.png')), pricePerKg: 19.9, originalPricePerKg: 22.9, unitBase: 'un', unit: '600g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'batata-mccain', name: 'Batata Palito Tradicional McCain', category: 'Congelados', imageUrl: img(require('../assets/produtos/batata-mccain.png')), pricePerKg: 18.9, originalPricePerKg: null, unitBase: 'un', unit: '720g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'sorvete-kibon', name: 'Sorvete Kibon Ovomaltine', category: 'Congelados', imageUrl: img(require('../assets/produtos/sorvete-kibon.png')), pricePerKg: 24.9, originalPricePerKg: null, unitBase: 'un', unit: '800ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pao-queijo-forno-minas', name: 'Pão de Queijo Coquetel Forno de Minas', category: 'Congelados', imageUrl: img(require('../assets/produtos/pao-queijo-forno-minas.png')), pricePerKg: 16.9, originalPricePerKg: null, unitBase: 'un', unit: '400g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pao-forma-pullman', name: 'Pão de Forma Sem Casca Pullman', category: 'Padaria', imageUrl: img(require('../assets/produtos/pao-forma-pullman.png')), pricePerKg: 10.49, originalPricePerKg: null, unitBase: 'un', unit: '450g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bisnaguito-pullman', name: 'Bisnaguito Pullman', category: 'Padaria', imageUrl: img(require('../assets/produtos/bisnaguito-pullman.png')), pricePerKg: 8.99, originalPricePerKg: null, unitBase: 'un', unit: '300g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'torrada-bauducco', name: 'Torrada Multigrãos Bauducco', category: 'Padaria', imageUrl: img(require('../assets/produtos/torrada-bauducco.png')), pricePerKg: 9.49, originalPricePerKg: null, unitBase: 'un', unit: '264g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bolo-pullman-laranja', name: 'Bolo de Laranja Pullman', category: 'Padaria', imageUrl: img(require('../assets/produtos/bolo-pullman-laranja.png')), pricePerKg: 7.49, originalPricePerKg: null, unitBase: 'un', unit: '250g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'chocottone-bauducco', name: 'Chocottone Bauducco', category: 'Padaria', imageUrl: img(require('../assets/produtos/chocottone-bauducco.png')), pricePerKg: 4.99, originalPricePerKg: null, unitBase: 'un', unit: '80g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'arroz-integral-tio-joao', name: 'Arroz Integral Tio João', category: 'Mercearia', imageUrl: img(require('../assets/produtos/arroz-integral-tio-joao.png')), pricePerKg: 6.49, originalPricePerKg: null, unitBase: 'un', unit: '500g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'feijao-camil', name: 'Feijão Carioca Camil', category: 'Mercearia', imageUrl: img(require('../assets/produtos/feijao-camil.png')), pricePerKg: 8.99, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'espaguete-galo', name: 'Macarrão Espaguete Galo', category: 'Mercearia', imageUrl: img(require('../assets/produtos/espaguete-galo.png')), pricePerKg: 4.29, originalPricePerKg: null, unitBase: 'un', unit: '500g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'oleo-liza', name: 'Óleo de Soja Liza', category: 'Mercearia', imageUrl: img(require('../assets/produtos/oleo-liza.png')), pricePerKg: 7.99, originalPricePerKg: null, unitBase: 'un', unit: '900ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'acucar-uniao', name: 'Açúcar Refinado União', category: 'Mercearia', imageUrl: img(require('../assets/produtos/acucar-uniao.png')), pricePerKg: 4.99, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'cafe-pilao', name: 'Café Pilão Tradicional', category: 'Mercearia', imageUrl: img(require('../assets/produtos/cafe-pilao.png')), pricePerKg: 17.9, originalPricePerKg: 19.9, unitBase: 'un', unit: '250g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'cappuccino-3-coracoes', name: 'Cappuccino Classic 3 Corações (cápsulas)', category: 'Mercearia', imageUrl: img(require('../assets/produtos/cappuccino-3-coracoes.png')), pricePerKg: 21.9, originalPricePerKg: null, unitBase: 'un', unit: '10 cápsulas', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'creme-dental-colgate', name: 'Creme Dental Colgate Tripla Ação', category: 'Higiene', imageUrl: img(require('../assets/produtos/creme-dental-colgate.png')), pricePerKg: 4.49, originalPricePerKg: null, unitBase: 'un', unit: '90g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'creme-dental-closeup', name: 'Creme Dental Close Up Carvão Ativado', category: 'Higiene', imageUrl: img(require('../assets/produtos/creme-dental-closeup.png')), pricePerKg: 6.49, originalPricePerKg: null, unitBase: 'un', unit: '85g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'shampoo-pantene', name: 'Shampoo Pantene Classic Clean', category: 'Higiene', imageUrl: img(require('../assets/produtos/shampoo-pantene.png')), pricePerKg: 15.9, originalPricePerKg: 18.9, unitBase: 'un', unit: 'Frasco', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'desodorante-rexona', name: 'Desodorante Rexona Aloe Vera', category: 'Higiene', imageUrl: img(require('../assets/produtos/desodorante-rexona.png')), pricePerKg: 14.9, originalPricePerKg: null, unitBase: 'un', unit: '200ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'detergente-ype', name: 'Detergente Ypê Clear', category: 'Limpeza', imageUrl: img(require('../assets/produtos/detergente-ype.png')), pricePerKg: 2.79, originalPricePerKg: null, unitBase: 'un', unit: '500ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'sabao-omo', name: 'Sabão em Pó Omo Lavagem Perfeita', category: 'Limpeza', imageUrl: img(require('../assets/produtos/sabao-omo.png')), pricePerKg: 59.9, originalPricePerKg: 64.9, unitBase: 'un', unit: '4 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'agua-sanitaria-qboa', name: 'Água Sanitária Qboa', category: 'Limpeza', imageUrl: img(require('../assets/produtos/agua-sanitaria-qboa.png')), pricePerKg: 8.49, originalPricePerKg: null, unitBase: 'un', unit: '2 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'veja-multiuso', name: 'Veja Multiuso Gold', category: 'Limpeza', imageUrl: img(require('../assets/produtos/veja-multiuso.png')), pricePerKg: 8.49, originalPricePerKg: null, unitBase: 'un', unit: '500ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
];

export const PRODUCTS = BASE_PRODUCTS.map((product) => ({ ...product, name: productName(product.name) }));

export function getProductById(id) {
	return PRODUCTS.find((product) => product.id === id) || null;
}

// Foto do produto: a do Firebase, ou a que já vem no app (catálogo inicial) quando o Firebase não tiver uma.
export function productImageFor(id, imageUrl, imageUrls) {
	if (typeof imageUrl === 'string' && imageUrl) return imageUrl;
	const fromList = Array.isArray(imageUrls) ? imageUrls.find((url) => typeof url === 'string' && url) : null;
	return fromList || getProductById(id)?.imageUrl || '';
}

export function getProductPrice(product, weightGrams) {
	return Math.round((product.pricePerKg * weightGrams) / 10) / 100;
}

export function formatCurrency(value) {
	return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function formatWeight(grams) {
	return grams >= 1000
		? `${Number((grams / 1000).toFixed(1))} kg`
		: `${grams}g`;
}

export function formatProductUnit(product, amount = product.defaultWeightGrams) {
	return product.unitBase && product.unitBase !== 'g'
		? (product.unit || 'Unidade')
		: formatWeight(amount);
}
