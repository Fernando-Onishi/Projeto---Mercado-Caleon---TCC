import { Image } from 'react-native';

// Fotos guardadas no próprio app (assets/produtos). Créditos e licenças em assets/produtos/CREDITOS.md.
const img = (source) => Image.resolveAssetSource(source).uri;

// Categorias iguais às do filtro da Home e do cadastro de produtos do admin.
export const PRODUCT_CATEGORIES = ['HortiFruti', 'Carnes', 'Bebidas', 'Laticínios', 'Doces', 'Congelados', 'Padaria', 'Mercearia', 'Higiene', 'Limpeza'];

// Produtos reais. pricePerKg: preço por kg nos itens vendidos por peso; nos itens com unitBase 'un', é o preço da embalagem.
// Preços são estimativas de mercado e podem ser ajustados pelo painel admin.
export const PRODUCTS = [
	{ id: 'banana-prata', name: 'Banana Prata', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/banana-prata.jpg')), pricePerKg: 6.99, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'tomate', name: 'Tomate', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/tomate.jpg')), pricePerKg: 8.99, originalPricePerKg: 10.99, averageWeightGrams: 150, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'batata', name: 'Batata', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/batata.jpg')), pricePerKg: 5.49, originalPricePerKg: null, averageWeightGrams: 200, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'cebola-roxa', name: 'Cebola Roxa', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/cebola-roxa.jpg')), pricePerKg: 6.99, originalPricePerKg: null, averageWeightGrams: 150, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'maca-gala', name: 'Maçã Gala', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/maca-gala.jpg')), pricePerKg: 9.99, originalPricePerKg: 12.99, averageWeightGrams: 180, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'laranja-pera', name: 'Laranja Pera', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/laranja-pera.jpg')), pricePerKg: 4.99, originalPricePerKg: null, averageWeightGrams: 200, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'cenoura', name: 'Cenoura', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/cenoura.jpg')), pricePerKg: 5.49, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'limao-taiti', name: 'Limão Taiti', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/limao-taiti.jpg')), pricePerKg: 6.49, originalPricePerKg: null, averageWeightGrams: 80, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'abacate', name: 'Abacate', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/abacate.jpg')), pricePerKg: 9.9, originalPricePerKg: null, averageWeightGrams: 400, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'mamao-papaia', name: 'Mamão Papaia', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/mamao-papaia.jpg')), pricePerKg: 8.99, originalPricePerKg: 11.49, averageWeightGrams: 450, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'alface-crespa', name: 'Alface Crespa', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/alface-crespa.jpg')), pricePerKg: 3.49, originalPricePerKg: null, unitBase: 'un', unit: 'Unidade', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'abacaxi-perola', name: 'Abacaxi Pérola', category: 'HortiFruti', imageUrl: img(require('../assets/produtos/abacaxi-perola.jpg')), pricePerKg: 7.99, originalPricePerKg: null, unitBase: 'un', unit: 'Unidade', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'picanha-bovina', name: 'Picanha Bovina', category: 'Carnes', imageUrl: img(require('../assets/produtos/picanha-bovina.jpg')), pricePerKg: 69.9, originalPricePerKg: 79.9, averageWeightGrams: 1000, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'carne-moida', name: 'Carne Moída Patinho', category: 'Carnes', imageUrl: img(require('../assets/produtos/carne-moida.jpg')), pricePerKg: 39.9, originalPricePerKg: null, averageWeightGrams: 500, availableWeights: [500, 1000, 1500, 2000], defaultWeightGrams: 1000 },
	{ id: 'coxa-frango', name: 'Coxa de Frango', category: 'Carnes', imageUrl: img(require('../assets/produtos/coxa-frango.jpg')), pricePerKg: 14.9, originalPricePerKg: null, averageWeightGrams: 120, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'bisteca-suina', name: 'Bisteca Suína', category: 'Carnes', imageUrl: img(require('../assets/produtos/bisteca-suina.jpg')), pricePerKg: 24.9, originalPricePerKg: 27.9, averageWeightGrams: 250, availableWeights: [300, 600, 1000, 1500], defaultWeightGrams: 600 },
	{ id: 'linguica-toscana-sadia', name: 'Linguiça Toscana Sadia', category: 'Carnes', imageUrl: img(require('../assets/produtos/linguica-toscana-sadia.jpg')), pricePerKg: 24.9, originalPricePerKg: null, unitBase: 'un', unit: '950g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'hamburguer-seara', name: 'Hambúrguer Bovino Seara 12 un.', category: 'Carnes', imageUrl: img(require('../assets/produtos/hamburguer-seara.jpg')), pricePerKg: 22.9, originalPricePerKg: null, unitBase: 'un', unit: '672g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'salsicha-perdigao', name: 'Salsicha Viena Perdigão', category: 'Carnes', imageUrl: img(require('../assets/produtos/salsicha-perdigao.jpg')), pricePerKg: 11.49, originalPricePerKg: null, unitBase: 'un', unit: '500g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'presunto-sadia', name: 'Presunto Fatiado Sadia', category: 'Carnes', imageUrl: img(require('../assets/produtos/presunto-sadia.jpg')), pricePerKg: 9.99, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'coca-cola-2l', name: 'Coca-Cola Original', category: 'Bebidas', imageUrl: img(require('../assets/produtos/coca-cola-2l.jpg')), pricePerKg: 11.99, originalPricePerKg: 13.49, unitBase: 'un', unit: '2 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'guarana-antarctica', name: 'Guaraná Antarctica Lata', category: 'Bebidas', imageUrl: img(require('../assets/produtos/guarana-antarctica.jpg')), pricePerKg: 4.49, originalPricePerKg: null, unitBase: 'un', unit: '330ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'del-valle-kapo-uva', name: 'Del Valle Kapo Uva', category: 'Bebidas', imageUrl: img(require('../assets/produtos/del-valle-kapo-uva.jpg')), pricePerKg: 2.99, originalPricePerKg: null, unitBase: 'un', unit: '200ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'agua-crystal', name: 'Água Mineral Crystal sem Gás', category: 'Bebidas', imageUrl: img(require('../assets/produtos/agua-crystal.jpg')), pricePerKg: 2.49, originalPricePerKg: null, unitBase: 'un', unit: '500ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'heineken-lata', name: 'Cerveja Heineken Lata', category: 'Bebidas', imageUrl: img(require('../assets/produtos/heineken-lata.jpg')), pricePerKg: 5.49, originalPricePerKg: 5.99, unitBase: 'un', unit: '350ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'leite-italac', name: 'Leite Integral Italac', category: 'Laticínios', imageUrl: img(require('../assets/produtos/leite-italac.jpg')), pricePerKg: 5.49, originalPricePerKg: null, unitBase: 'un', unit: '1 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'mussarela-president', name: 'Queijo Mussarela Fatiado Président', category: 'Laticínios', imageUrl: img(require('../assets/produtos/mussarela-president.jpg')), pricePerKg: 18.9, originalPricePerKg: 21.9, unitBase: 'un', unit: '300g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'iogurte-nestle', name: 'Iogurte Natural Nestlé', category: 'Laticínios', imageUrl: img(require('../assets/produtos/iogurte-nestle.jpg')), pricePerKg: 7.99, originalPricePerKg: null, unitBase: 'un', unit: '340g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'manteiga-aviacao', name: 'Manteiga Aviação', category: 'Laticínios', imageUrl: img(require('../assets/produtos/manteiga-aviacao.jpg')), pricePerKg: 15.9, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'requeijao-catupiry', name: 'Requeijão Catupiry', category: 'Laticínios', imageUrl: img(require('../assets/produtos/requeijao-catupiry.jpg')), pricePerKg: 12.9, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'kit-kat', name: 'Kit Kat Nestlé', category: 'Doces', imageUrl: img(require('../assets/produtos/kit-kat.jpg')), pricePerKg: 3.99, originalPricePerKg: null, unitBase: 'un', unit: '41,5g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'alpino', name: 'Chocolate Alpino', category: 'Doces', imageUrl: img(require('../assets/produtos/alpino.jpg')), pricePerKg: 6.99, originalPricePerKg: 8.49, unitBase: 'un', unit: '85g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bis-branco', name: 'Bis Branco Lacta', category: 'Doces', imageUrl: img(require('../assets/produtos/bis-branco.jpg')), pricePerKg: 6.49, originalPricePerKg: null, unitBase: 'un', unit: '100,8g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'oreo', name: 'Biscoito Oreo Original', category: 'Doces', imageUrl: img(require('../assets/produtos/oreo.jpg')), pricePerKg: 3.79, originalPricePerKg: null, unitBase: 'un', unit: '90g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pizza-sadia', name: 'Pizza Lombo e Requeijão Sadia', category: 'Congelados', imageUrl: img(require('../assets/produtos/pizza-sadia.jpg')), pricePerKg: 19.9, originalPricePerKg: null, unitBase: 'un', unit: '460g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'lasanha-sadia', name: 'Lasanha Quatro Queijos Sadia', category: 'Congelados', imageUrl: img(require('../assets/produtos/lasanha-sadia.jpg')), pricePerKg: 13.9, originalPricePerKg: 16.9, unitBase: 'un', unit: '350g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'batata-mccain', name: 'Batata Palito McCain', category: 'Congelados', imageUrl: img(require('../assets/produtos/batata-mccain.jpg')), pricePerKg: 16.9, originalPricePerKg: null, unitBase: 'un', unit: '600g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'sorvete-kibon', name: 'Sorvete Kibon Ovomaltine', category: 'Congelados', imageUrl: img(require('../assets/produtos/sorvete-kibon.jpg')), pricePerKg: 24.9, originalPricePerKg: null, unitBase: 'un', unit: '800ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pao-queijo-forno-minas', name: 'Pão de Queijo Forno de Minas', category: 'Congelados', imageUrl: img(require('../assets/produtos/pao-queijo-forno-minas.jpg')), pricePerKg: 26.9, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'pao-forma-pullman', name: 'Pão de Forma Pullman', category: 'Padaria', imageUrl: img(require('../assets/produtos/pao-forma-pullman.jpg')), pricePerKg: 9.49, originalPricePerKg: null, unitBase: 'un', unit: '480g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bisnaguinha-seven-boys', name: 'Bisnaguinha Seven Boys', category: 'Padaria', imageUrl: img(require('../assets/produtos/bisnaguinha-seven-boys.jpg')), pricePerKg: 8.99, originalPricePerKg: null, unitBase: 'un', unit: '300g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'torrada-bauducco', name: 'Torrada Integral Bauducco', category: 'Padaria', imageUrl: img(require('../assets/produtos/torrada-bauducco.jpg')), pricePerKg: 5.49, originalPricePerKg: null, unitBase: 'un', unit: '142g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'bolo-pullman-laranja', name: 'Bolo de Laranja Pullman', category: 'Padaria', imageUrl: img(require('../assets/produtos/bolo-pullman-laranja.jpg')), pricePerKg: 7.49, originalPricePerKg: null, unitBase: 'un', unit: '250g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'panettone-bauducco', name: 'Panettone Frutas Bauducco', category: 'Padaria', imageUrl: img(require('../assets/produtos/panettone-bauducco.jpg')), pricePerKg: 19.9, originalPricePerKg: 24.9, unitBase: 'un', unit: '400g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'arroz-tio-joao', name: 'Arroz Tio João Tipo 1', category: 'Mercearia', imageUrl: img(require('../assets/produtos/arroz-tio-joao.jpg')), pricePerKg: 7.49, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'feijao-camil', name: 'Feijão Carioca Camil', category: 'Mercearia', imageUrl: img(require('../assets/produtos/feijao-camil.jpg')), pricePerKg: 8.99, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'espaguete-galo', name: 'Macarrão Espaguete Galo', category: 'Mercearia', imageUrl: img(require('../assets/produtos/espaguete-galo.jpg')), pricePerKg: 4.29, originalPricePerKg: null, unitBase: 'un', unit: '500g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'oleo-soya', name: 'Óleo de Soja Soya', category: 'Mercearia', imageUrl: img(require('../assets/produtos/oleo-soya.jpg')), pricePerKg: 7.99, originalPricePerKg: null, unitBase: 'un', unit: '900ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'acucar-uniao', name: 'Açúcar Refinado União', category: 'Mercearia', imageUrl: img(require('../assets/produtos/acucar-uniao.jpg')), pricePerKg: 4.99, originalPricePerKg: null, unitBase: 'un', unit: '1 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'cafe-pilao', name: 'Café Pilão Tradicional', category: 'Mercearia', imageUrl: img(require('../assets/produtos/cafe-pilao.jpg')), pricePerKg: 17.9, originalPricePerKg: 19.9, unitBase: 'un', unit: '250g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'cappuccino-3-coracoes', name: 'Cappuccino 3 Corações', category: 'Mercearia', imageUrl: img(require('../assets/produtos/cappuccino-3-coracoes.jpg')), pricePerKg: 13.9, originalPricePerKg: null, unitBase: 'un', unit: '200g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'creme-dental-sorriso', name: 'Creme Dental Sorriso Fresh', category: 'Higiene', imageUrl: img(require('../assets/produtos/creme-dental-sorriso.jpg')), pricePerKg: 4.49, originalPricePerKg: null, unitBase: 'un', unit: '90g', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'sabonete-liquido-lux', name: 'Sabonete Líquido Lux', category: 'Higiene', imageUrl: img(require('../assets/produtos/sabonete-liquido-lux.jpg')), pricePerKg: 19.9, originalPricePerKg: null, unitBase: 'un', unit: '1 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'shampoo-pantene', name: 'Shampoo Pantene Classic Clean', category: 'Higiene', imageUrl: img(require('../assets/produtos/shampoo-pantene.jpg')), pricePerKg: 15.9, originalPricePerKg: 18.9, unitBase: 'un', unit: 'Frasco', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'desodorante-rexona', name: 'Desodorante Rexona Aloe Vera', category: 'Higiene', imageUrl: img(require('../assets/produtos/desodorante-rexona.jpg')), pricePerKg: 14.9, originalPricePerKg: null, unitBase: 'un', unit: '200ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'detergente-ype', name: 'Detergente Ypê Clear', category: 'Limpeza', imageUrl: img(require('../assets/produtos/detergente-ype.jpg')), pricePerKg: 2.79, originalPricePerKg: null, unitBase: 'un', unit: '500ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'sabao-omo', name: 'Sabão em Pó Omo Lavagem Perfeita', category: 'Limpeza', imageUrl: img(require('../assets/produtos/sabao-omo.jpg')), pricePerKg: 59.9, originalPricePerKg: 64.9, unitBase: 'un', unit: '4 kg', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'agua-sanitaria-olimpo', name: 'Água Sanitária Olimpo', category: 'Limpeza', imageUrl: img(require('../assets/produtos/agua-sanitaria-olimpo.jpg')), pricePerKg: 4.49, originalPricePerKg: null, unitBase: 'un', unit: '1 L', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
	{ id: 'veja-multiuso', name: 'Veja Multiuso Gold', category: 'Limpeza', imageUrl: img(require('../assets/produtos/veja-multiuso.jpg')), pricePerKg: 8.49, originalPricePerKg: null, unitBase: 'un', unit: '500ml', averageWeightGrams: 1000, availableWeights: [1000], defaultWeightGrams: 1000 },
];

export function getProductById(id) {
	return PRODUCTS.find((product) => product.id === id) || null;
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
