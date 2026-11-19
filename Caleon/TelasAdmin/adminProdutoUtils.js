import { productImageFor, productName } from '../Config/Produtos';

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
		name: productName(data.name),
		category: data.category === 'Horti-Fruti' ? 'HortiFruti' : data.category || 'Sem categoria',
		pricePerKg,
		originalPricePerKg: Number.isFinite(originalPricePerKg) && originalPricePerKg > pricePerKg ? originalPricePerKg : null,
		defaultWeightGrams,
		stockCurrent: Math.max(0, Number(data.stockCurrent) || 0),
		stockMinimum: Math.max(0, Number(data.stockMinimum) || 0),
		stockCritical: Math.max(0, Number(data.stockCritical) || 0),
		imageUrl: productImageFor(documentSnapshot.id, data.imageUrl, data.imageUrls),
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
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		// Data sem horário: usa o dia local (new Date('aaaa-mm-dd') seria meia-noite UTC, o dia anterior no Brasil).
		const [y, m, d] = value.split('-').map(Number);
		return new Date(y, m - 1, d);
	}
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}
	return null;
}

// Dias até vencer (negativo = já venceu). Conta o dia da validade inteiro.
export function daysUntilExpiry(product, now = Date.now()) {
	const expiryDate = getExpiryDate(product);
	if (!expiryDate) return null;
	const endOfDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate(), 23, 59, 59);
	return Math.floor((endOfDay.getTime() - now) / 86_400_000);
}

export function isExpired(product, now = Date.now()) {
	const days = daysUntilExpiry(product, now);
	return days !== null && days < 0;
}

// Vence nos próximos 15 dias (ou já venceu): entra no aviso "Vencimento próximo" do admin.
export function isExpiringSoon(product, now = Date.now()) {
	const days = daysUntilExpiry(product, now);
	return days !== null && days <= 15;
}

const two = (n) => String(n).padStart(2, '0');

/** Validade em dd/mm/aaaa (ou '' sem validade). */
export function formatExpiry(product) {
	const date = getExpiryDate(product);
	return date ? `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}` : '';
}

/** Máscara do campo: só números, vira dd/mm/aaaa enquanto digita. */
export function maskExpiryInput(value) {
	const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
	if (digits.length <= 2) return digits;
	if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** 'dd/mm/aaaa' -> 'aaaa-mm-dd'. '' -> null (sem validade). Data inválida -> undefined. */
export function parseExpiryInput(value) {
	const text = String(value || '').trim();
	if (!text) return null;
	const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return undefined;
	const [, d, m, y] = match.map(Number);
	const date = new Date(y, m - 1, d);
	if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || y < 2000 || y > 2100) return undefined;
	return `${y}-${two(m)}-${two(d)}`;
}