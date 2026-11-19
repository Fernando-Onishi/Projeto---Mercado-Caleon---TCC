import { Image } from 'react-native';

// Celular (Android/iOS): transforma um require('...jpg') em endereço de imagem.
// A versão web fica em assetUri.web.js.
export default function assetUri(source) {
	return Image.resolveAssetSource(source)?.uri || '';
}
