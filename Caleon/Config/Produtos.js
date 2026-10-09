export const PRODUCTS = [
	{
		id: 'pitaya-001',
		name: 'Pitaya',
		category: 'Horti-Fruti',
		imageUrl: 'https://images.openai.com/static-rsc-4/4SC8UFLyABwsw2HQG4yLNfNnXRtyHS6XsJfM8WYDwrWZmHnqPz6jS-L2BXksWIMUvkqsiYi9ErDt5Z3wsDE1r3qPiJ_GAREAi-7ay9CnvLo8Sn7V1L_WebiyGLeA2t7YMD_NPCs9VttMMv5ita0ScfPiLUFNmALcdmzfKAFzajg?purpose=inline',
		pricePerKg: 7.5,
		originalPricePerKg: 15.99,
		averageWeightGrams: 150,
		availableWeights: [300, 600, 1000, 1500],
		defaultWeightGrams: 300,
	},
	{
		id: 'maca-001',
		name: 'Maçã',
		category: 'Horti-Fruti',
		imageUrl: 'https://images.openai.com/static-rsc-4/lRxf5vruSVfu0LIw1WV5sFmdsJTbQuqLXPtrGf7r8YkwS4fICaGOmB5py4RI3AZyoT-gB8D0gemCY8PCFcn0OzM0ShRVEWVd7JhR52_4NG6uSfGV10Lz8z4umUUazPNuvxufH82kFVSlrfZszxPbS6DYhWn5fAawYC2N36qJFIf-2zkz6jtwZ3rBmY2P25aC?purpose=inline',
		pricePerKg: 7.98,
		originalPricePerKg: 9.99,
		averageWeightGrams: 180,
		availableWeights: [300, 600, 1000, 1500],
		defaultWeightGrams: 500,
	},
	{
		id: 'melancia-001',
		name: 'Melancia',
		category: 'Horti-Fruti',
		imageUrl: 'https://cdn-icons-png.flaticon.com/512/765/765560.png',
		pricePerKg: 6.79,
		originalPricePerKg: null,
		averageWeightGrams: 3000,
		availableWeights: [300, 600, 1000, 1500],
		defaultWeightGrams: 1000,
	},
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
