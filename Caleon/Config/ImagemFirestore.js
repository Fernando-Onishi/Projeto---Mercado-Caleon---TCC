import { Image } from 'react-native';

// Fotos guardadas dentro do Firestore como texto (data URI JPEG comprimido).
// Motivo: o Firebase Storage não está ativado neste projeto (exige o plano Blaze), e o envio para lá
// ficava carregando para sempre. Um documento do Firestore aceita até 1 MB, então a foto é reduzida antes.

let Manipulator = null;
try {
	// Módulo nativo: só existe depois de recompilar o app. Sem ele, usa a foto como veio (com limite de tamanho).
	// eslint-disable-next-line global-require
	Manipulator = require('expo-image-manipulator');
} catch {
	Manipulator = null;
}

// Limite seguro por foto (o documento inteiro precisa ficar abaixo de 1 MB).
export const MAX_IMAGE_CHARS = 700000;

export function isStoredImage(uri) {
	return typeof uri === 'string' && /^(https?:|data:)/.test(uri);
}

function getSize(uri) {
	return new Promise((resolve) => {
		Image.getSize(uri, (width, height) => resolve({ width, height }), () => resolve({ width: 0, height: 0 }));
	});
}

function readAsDataUrl(uri) {
	return fetch(uri)
		.then((response) => response.blob())
		.then((blob) => new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
			reader.readAsDataURL(blob);
		}));
}

/**
 * Converte uma foto escolhida no aparelho em data URI JPEG pequena o bastante para o Firestore.
 * maxSize: maior lado em pixels. Lança Error('image-too-large') se mesmo assim ficar grande demais.
 */
export async function toCompressedDataUrl(uri, { maxSize = 800, quality = 0.7 } = {}) {
	if (isStoredImage(uri) && uri.startsWith('data:') && uri.length <= MAX_IMAGE_CHARS) return uri;

	if (Manipulator?.manipulateAsync) {
		try {
			const { width, height } = await getSize(uri);
			const resize = width && height
				? (width >= height ? { width: Math.min(maxSize, width) } : { height: Math.min(maxSize, height) })
				: { width: maxSize };
			let attemptQuality = quality;
			for (let attempt = 0; attempt < 3; attempt += 1) {
				const result = await Manipulator.manipulateAsync(uri, [{ resize }], {
					compress: attemptQuality,
					format: Manipulator.SaveFormat.JPEG,
					base64: true,
				});
				const dataUrl = `data:image/jpeg;base64,${result.base64}`;
				if (dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
				attemptQuality *= 0.6;
			}
		} catch (error) {
			console.warn('Compressão de imagem indisponível; usando a imagem original.', error);
		}
	}

	const dataUrl = await readAsDataUrl(uri);
	if (dataUrl.length > MAX_IMAGE_CHARS) throw new Error('image-too-large');
	return dataUrl;
}
