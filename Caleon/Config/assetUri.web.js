import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';

// Web: o Image.resolveAssetSource não existe; monta o endereço do arquivo do mesmo jeito que o react-native-web.
export default function assetUri(source) {
	if (typeof source === 'string') return source;
	if (source && typeof source.uri === 'string') return source.uri;
	const asset = typeof source === 'number' ? getAssetByID(source) : null;
	if (!asset) return '';
	const scale = asset.scales?.[0] ?? 1;
	const suffix = scale !== 1 ? `@${scale}x` : '';
	return `${asset.httpServerLocation}/${asset.name}${suffix}.${asset.type}`;
}
