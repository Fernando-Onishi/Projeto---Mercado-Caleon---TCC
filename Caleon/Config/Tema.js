import AsyncStorage from '@react-native-async-storage/async-storage';

// Tema claro / escuro do Caleon.
// As telas continuam escrevendo as cores do tema claro; no modo escuro elas são convertidas
// conforme o uso: fundo claro -> fundo escuro, texto escuro -> texto claro, borda clara -> borda escura.
// Verdes, vermelhos e o texto branco dos botões continuam iguais (identidade do app).

export const THEME_STORAGE_KEY = '@caleon_tema';
export const THEME_OPTIONS = [
	{ key: 'sistema', label: 'Sistema', icon: 'smartphone' },
	{ key: 'claro', label: 'Claro', icon: 'sun' },
	{ key: 'escuro', label: 'Escuro', icon: 'moon' },
];

// Paleta do modo escuro (verde-musgo bem escuro, combinando com a marca).
export const DARK = {
	background: '#0B1210',
	surface: '#1B2823',
	surfaceRaised: '#24332D',
	border: '#2C3A34',
	text: '#E7EFEB',
	textMuted: '#A0ACA7',
	header: '#1F5C48',
	mint: '#2B7D64',
	danger: '#C2353A',
};

let currentScheme = 'light';
const listeners = new Set();

export function getScheme() {
	return currentScheme;
}

export function isDark() {
	return currentScheme === 'dark';
}

export function setScheme(scheme) {
	if (scheme === currentScheme) return;
	currentScheme = scheme;
	listeners.forEach((listener) => listener(scheme));
}

export async function readThemePreference() {
	try {
		const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
		return THEME_OPTIONS.some((option) => option.key === value) ? value : 'sistema';
	} catch {
		return 'sistema';
	}
}

export async function saveThemePreference(value) {
	try {
		await AsyncStorage.setItem(THEME_STORAGE_KEY, value);
	} catch {
		// Sem armazenamento: vale só nesta sessão.
	}
}

// ---------- conversão de cores ----------

const NAMED = { white: '#ffffff', black: '#000000' };

function parseColor(value) {
	if (typeof value !== 'string') return null;
	const text = (NAMED[value.toLowerCase()] || value).trim().toLowerCase();
	let match = text.match(/^#([0-9a-f]{3})$/);
	if (match) {
		const [r, g, b] = match[1].split('').map((c) => parseInt(c + c, 16));
		return { r, g, b, a: 1 };
	}
	match = text.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
	if (match) {
		return {
			r: parseInt(match[1].slice(0, 2), 16),
			g: parseInt(match[1].slice(2, 4), 16),
			b: parseInt(match[1].slice(4, 6), 16),
			a: match[2] ? parseInt(match[2], 16) / 255 : 1,
		};
	}
	match = text.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
	if (match) return { r: +match[1], g: +match[2], b: +match[3], a: match[4] === undefined ? 1 : +match[4] };
	return null;
}

function toHsl({ r, g, b }) {
	const rn = r / 255; const gn = g / 255; const bn = b / 255;
	const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
	else if (max === gn) h = (bn - rn) / d + 2;
	else h = (rn - gn) / d + 4;
	return { h: h * 60, s, l };
}

function hslToHex(h, s, l) {
	const k = (n) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

function withAlpha(hex, a) {
	if (a >= 1) return hex;
	const { r, g, b } = parseColor(hex);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const cache = { bg: new Map(), text: new Map(), border: new Map() };

/** Cor de fundo no modo escuro. */
function darkBackground(value) {
	const c = parseColor(value);
	if (!c) return value;
	const { h, s, l } = toHsl(c);
	// Overlays escuros/translúcidos (sombras de modal) ficam como estão.
	if (l < 0.5 && c.a < 1) return value;
	if (l >= 0.985 && s < 0.2) return withAlpha(DARK.surface, c.a); // branco: cartões
	if (l >= 0.9 && s < 0.25) return withAlpha(DARK.background, c.a); // cinzas claros: fundo da tela
	if (l >= 0.8 && s < 0.25) return withAlpha(DARK.surfaceRaised, c.a); // cinzas médios claros
	if (l >= 0.8) return withAlpha(hslToHex(h, Math.min(s, 0.45), 0.16), c.a); // tons pastel (menta, rosa, amarelo)
	// Verde do cabeçalho: um tom mais profundo no escuro.
	if (value && /^#1b4b3d$|^#194b38$|^#164f40$/i.test(value)) return DARK.header;
	// Cores vivas de cartões e botões: um pouco mais fechadas no escuro, para não ofuscar.
	if (value && /^#40b190$|^#35b394$/i.test(value)) return DARK.mint;
	if (value && /^#ff383c$|^#ff2929$|^#ff0000$/i.test(value)) return DARK.danger;
	return value;
}

/** Cor de texto/ícone no modo escuro. */
function darkText(value) {
	const c = parseColor(value);
	if (!c) return value;
	const { h, s, l } = toHsl(c);
	if (l >= 0.6) return value; // branco e cores claras continuam
	if (s < 0.15) {
		// cinzas: preto -> quase branco, cinza médio -> cinza claro
		return withAlpha(l < 0.3 ? DARK.text : DARK.textMuted, c.a);
	}
	if (l < 0.32) return withAlpha(hslToHex(h, Math.min(s, 0.35), 0.86), c.a); // verde-escuro do texto
	return value; // cores vivas (vermelho, menta, verde-preço)
}

function darkBorder(value) {
	const c = parseColor(value);
	if (!c) return value;
	const { l, s } = toHsl(c);
	if (l >= 0.7 && s < 0.4) return withAlpha(DARK.border, c.a);
	if (l >= 0.75) return withAlpha(DARK.border, c.a);
	return value;
}

function memo(map, fn, value) {
	if (typeof value !== 'string') return value;
	if (!map.has(value)) map.set(value, fn(value));
	return map.get(value);
}

/** Converte uma cor para o tema atual. kind: 'text' | 'bg' | 'border'. */
export function themeColor(value, kind = 'text') {
	if (currentScheme !== 'dark') return value;
	if (kind === 'bg') return memo(cache.bg, darkBackground, value);
	if (kind === 'border') return memo(cache.border, darkBorder, value);
	return memo(cache.text, darkText, value);
}

/** Atalho para cores de texto/ícone usadas direto no JSX. */
export const tc = (value) => themeColor(value, 'text');

const BG_KEYS = new Set(['backgroundColor']);
const BORDER_KEYS = new Set(['borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderStartColor', 'borderEndColor']);
const TEXT_KEYS = new Set(['color', 'tintColor', 'textDecorationColor', 'placeholderTextColor']);

function convertStyle(style) {
	if (!style || typeof style !== 'object') return style;
	if (Array.isArray(style)) return style.map(convertStyle);
	let changed = null;
	for (const key of Object.keys(style)) {
		const value = style[key];
		let next = value;
		if (BG_KEYS.has(key)) next = themeColor(value, 'bg');
		else if (BORDER_KEYS.has(key)) next = themeColor(value, 'border');
		else if (TEXT_KEYS.has(key)) next = themeColor(value, 'text');
		if (next !== value) {
			if (!changed) changed = { ...style };
			changed[key] = next;
		}
	}
	return changed || style;
}

/**
 * Envolve um StyleSheet.create: cada estilo é convertido para o tema atual na hora em que a tela usa.
 * keep: nomes de estilos que nunca mudam (ex.: fundo branco do QR Code).
 */
export function themedStyles(sheet, { keep = [] } = {}) {
	const keepSet = new Set(keep);
	const darkCache = {};
	const result = {};
	for (const key of Object.keys(sheet)) {
		Object.defineProperty(result, key, {
			enumerable: true,
			get() {
				if (currentScheme !== 'dark' || keepSet.has(key)) return sheet[key];
				if (!(key in darkCache)) darkCache[key] = convertStyle(sheet[key]);
				return darkCache[key];
			},
		});
	}
	return result;
}
