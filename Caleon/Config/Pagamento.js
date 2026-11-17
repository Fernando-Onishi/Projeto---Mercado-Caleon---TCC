// Configuração de pagamento e da loja. Troque aqui o endereço provisório pelo endereço real do mercado.

export const PIX_CONFIG = {
	// Chave Pix do tipo celular: +55 + DDD + número.
	key: '+5511958789371',
	// Nome e cidade de quem recebe (sem acentos, até 25 e 15 caracteres). O banco do cliente
	// mostra o nome real do titular da chave na hora de confirmar o pagamento.
	merchantName: 'MERCADO CALEON',
	merchantCity: 'SAO PAULO',
};

export const STORE = {
	name: 'Mercado Caleon',
	// ENDEREÇO PROVISÓRIO — substitua pelo endereço e coordenadas reais do mercado.
	address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
	latitude: -23.5614,
	longitude: -46.6559,
	pickupMinutes: 30,
};

export const SERVICE_FEE = 5;

// ---------- Pix "copia e cola" (BR Code, padrão EMV do Banco Central) ----------

function field(id, value) {
	const text = String(value);
	return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function removeAccents(value) {
	return String(value).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63 do BR Code.
export function crc16(payload) {
	let crc = 0xffff;
	for (let i = 0; i < payload.length; i += 1) {
		crc ^= payload.charCodeAt(i) << 8;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
			crc &= 0xffff;
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, '0');
}

// txid: só letras e números, até 25 caracteres. Identifica o pedido no extrato do recebedor.
export function makePixTxid(orderId) {
	const clean = String(orderId || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
	return clean || '***';
}

/**
 * Gera o código Pix "copia e cola" estático com valor. O mesmo texto vira o QR Code.
 * Funciona em qualquer app de banco: o cliente lê o QR ou cola o código e paga na chave configurada.
 */
export function buildPixPayload({ amount, txid = '***', description } = {}) {
	const merchantAccount = field('00', 'br.gov.bcb.pix')
		+ field('01', PIX_CONFIG.key)
		+ (description ? field('02', removeAccents(description).slice(0, 40)) : '');
	const payload = field('00', '01')
		+ field('26', merchantAccount)
		+ field('52', '0000')
		+ field('53', '986')
		+ (amount ? field('54', Number(amount).toFixed(2)) : '')
		+ field('58', 'BR')
		+ field('59', removeAccents(PIX_CONFIG.merchantName).toUpperCase().slice(0, 25))
		+ field('60', removeAccents(PIX_CONFIG.merchantCity).toUpperCase().slice(0, 15))
		+ field('62', field('05', txid))
		+ '6304';
	return payload + crc16(payload);
}

// ---------- Cartão (escolhido no app, cobrado na maquininha na retirada) ----------

export const CARD_BRANDS = {
	visa: { label: 'Visa', color: '#1A1F71' },
	mastercard: { label: 'Mastercard', color: '#EB001B' },
};

export function onlyDigits(value) {
	return String(value || '').replace(/\D/g, '');
}

export function detectCardBrand(number) {
	const digits = onlyDigits(number);
	if (/^4/.test(digits)) return 'visa';
	const firstTwo = Number(digits.slice(0, 2));
	const firstFour = Number(digits.slice(0, 4));
	if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) return 'mastercard';
	return null;
}

// Algoritmo de Luhn: confere se o número do cartão foi digitado corretamente.
export function isValidCardNumber(number) {
	const digits = onlyDigits(number);
	if (digits.length < 13 || digits.length > 19) return false;
	let sum = 0;
	let double = false;
	for (let i = digits.length - 1; i >= 0; i -= 1) {
		let digit = Number(digits[i]);
		if (double) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		double = !double;
	}
	return sum % 10 === 0;
}

export function formatCardNumber(value) {
	return onlyDigits(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}
