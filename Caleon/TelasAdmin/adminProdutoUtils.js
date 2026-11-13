export function mapAdminProduct(documentSnapshot) {
	const data = documentSnapshot.data();
	const pricePerKg = Number(data.pricePerKg);
	const defaultWeightGrams = Number(data.defaultWeightGrams);
	if (data.active !== true || typeof data.name !== 'string' || !data.name.trim()) return null;
	if (!Number.isFinite(pricePerKg) || pricePerKg < 0 || !Number.isFinite(defaultWeightGrams) || defaultWeightGrams <= 0) return null;

	const originalPricePerKg = Number(data.originalPricePerKg);
	return {
		...data,
		id: documentSnapshot.id,
		name: data.name.trim(),
		category: data.category === 'Horti-Fruti' ? 'HortiFruti' : data.category || 'Sem categoria',
		pricePerKg,
		originalPricePerKg: Number.isFinite(originalPricePerKg) && originalPricePerKg > pricePerKg ? originalPricePerKg : null,
		defaultWeightGrams,
		stockCurrent: Math.max(0, Number(data.stockCurrent) || 0),
		stockMinimum: Math.max(0, Number(data.stockMinimum) || 0),
		stockCritical: Math.max(0, Number(data.stockCritical) || 0),
		imageUrl: typeof data.imageUrl === 'string'
			? data.imageUrl
			: Array.isArray(data.imageUrls) ? data.imageUrls.find((url) => typeof url === 'string') || '' : '',
	};
}

export function getStockUnitMultiplier(product) {
	const match = String(product.unit || '').match(/^(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml)$/i);
	if (!match) return 1;
	const amount = Number(match[1].replace(',', '.'));
	const unit = match[2].toLowerCase();
	return unit === 'kg' || unit === 'l' ? amount * 1000 : amount;
}

export function getStockSaleUnits(product) {
	return product.stockCurrent / getStockUnitMultiplier(product);
}

export function isLowStock(product) {
	return product.stockCurrent > 0 && product.stockCurrent <= product.stockMinimum;
}

export function isOutOfStock(product) {
	return product.stockCurrent <= 0;
}

export function getExpiryDate(product) {
	const value = product.expiresAt;
	if (value && typeof value.toDate === 'function') return value.toDate();
	if (value instanceof Date) return value;
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}
	return null;
}

export function isExpiringSoon(product, now = Date.now()) {
	const expiryDate = getExpiryDate(product);
	if (!expiryDate) return false;
	const daysUntilExpiry = (expiryDate.getTime() - now) / 86_400_000;
	return daysUntilExpiry >= 0 && daysUntilExpiry <= 15;
}