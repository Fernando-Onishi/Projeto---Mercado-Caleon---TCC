import React, { useMemo, useRef, useState } from 'react';
import { Image, Linking, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { STORE } from '../Config/Pagamento';
import { themedStyles, tc } from '../Config/Tema';

// Mapa de verdade (Esri World Street Map, sem chave de API nem módulo nativo):
// dá para arrastar e dar zoom, e o ponto de retirada fica fixo no SENAI de Suzano.
const TILE_SIZE = 256;
const TILE_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;
const START_ZOOM = 16;
const GREEN = '#1B4B3D';

function project(latitude, longitude, zoom) {
	const scale = TILE_SIZE * 2 ** zoom;
	const sin = Math.sin((latitude * Math.PI) / 180);
	return {
		x: ((longitude + 180) / 360) * scale,
		y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
	};
}

export function openDirections(store = STORE) {
	const destination = `${store.latitude},${store.longitude}`;
	// Abre a rota no Google Maps (app, se instalado; senão no navegador).
	const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
	Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`));
}

/**
 * onDragChange(true/false): avisa a tela para travar a rolagem enquanto o mapa é arrastado.
 */
export function MapaTiles({ height = 260, style, onDragChange, showDirections = true, rounded = true }) {
	const store = STORE;
	const [width, setWidth] = useState(0);
	const [zoom, setZoom] = useState(START_ZOOM);
	// Deslocamento (em pixels) do centro do mapa em relação à loja.
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const dragStart = useRef({ x: 0, y: 0 });
	const offsetRef = useRef(offset);
	offsetRef.current = offset;

	const panResponder = useMemo(() => PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
		onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
		onPanResponderTerminationRequest: () => false,
		onPanResponderGrant: () => {
			dragStart.current = offsetRef.current;
			onDragChange?.(true);
		},
		onPanResponderMove: (_, g) => {
			setOffset({ x: dragStart.current.x - g.dx, y: dragStart.current.y - g.dy });
		},
		onPanResponderRelease: () => onDragChange?.(false),
		onPanResponderTerminate: () => onDragChange?.(false),
	}), [onDragChange]);

	function changeZoom(delta) {
		const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
		if (next === zoom) return;
		const factor = 2 ** (next - zoom);
		setOffset((current) => ({ x: current.x * factor, y: current.y * factor }));
		setZoom(next);
	}

	function recenter() {
		setOffset({ x: 0, y: 0 });
		setZoom(START_ZOOM);
	}

	const map = useMemo(() => {
		if (!width) return null;
		const storePx = project(store.latitude, store.longitude, zoom);
		const center = { x: storePx.x + offset.x, y: storePx.y + offset.y };
		const origin = { x: center.x - width / 2, y: center.y - height / 2 };
		const maxTile = 2 ** zoom;
		const tiles = [];
		for (let tx = Math.floor(origin.x / TILE_SIZE); tx <= Math.floor((origin.x + width) / TILE_SIZE); tx += 1) {
			for (let ty = Math.floor(origin.y / TILE_SIZE); ty <= Math.floor((origin.y + height) / TILE_SIZE); ty += 1) {
				if (ty < 0 || ty >= maxTile) continue;
				tiles.push({
					key: `${zoom}-${tx}-${ty}`,
					uri: TILE_URL(zoom, ((tx % maxTile) + maxTile) % maxTile, ty),
					left: Math.round(tx * TILE_SIZE - origin.x),
					top: Math.round(ty * TILE_SIZE - origin.y),
				});
			}
		}
		return { tiles, pin: { x: storePx.x - origin.x, y: storePx.y - origin.y } };
	}, [width, height, zoom, offset, store.latitude, store.longitude]);

	const moved = Math.abs(offset.x) > 2 || Math.abs(offset.y) > 2 || zoom !== START_ZOOM;

	return (
		<View style={[styles.root, rounded && styles.rounded, { height }, style]}>
			<View
				style={StyleSheet.absoluteFill}
				onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
				{...panResponder.panHandlers}
				accessible
				accessibilityLabel={`Mapa do ponto de retirada: ${store.address}`}
			>
				{map?.tiles.map((tile) => (
					<Image key={tile.key} source={{ uri: tile.uri }} style={[styles.tile, { left: tile.left, top: tile.top }]} />
				))}
				{map ? (
					<View pointerEvents="none" style={[styles.pinWrap, { left: map.pin.x - 22, top: map.pin.y - 50 }]}>
						<View style={styles.pin}>
							<Feather name="shopping-bag" size={18} color={tc('#FFFFFF')} />
						</View>
						<View style={styles.pinTip} />
					</View>
				) : null}
			</View>

			<View style={styles.controls} pointerEvents="box-none">
				<TouchableOpacity style={styles.controlButton} onPress={() => changeZoom(1)} accessibilityRole="button" accessibilityLabel="Aproximar o mapa">
					<Feather name="plus" size={20} color={tc(GREEN)} />
				</TouchableOpacity>
				<TouchableOpacity style={styles.controlButton} onPress={() => changeZoom(-1)} accessibilityRole="button" accessibilityLabel="Afastar o mapa">
					<Feather name="minus" size={20} color={tc(GREEN)} />
				</TouchableOpacity>
				{moved ? (
					<TouchableOpacity style={styles.controlButton} onPress={recenter} accessibilityRole="button" accessibilityLabel="Centralizar no mercado">
						<Feather name="crosshair" size={18} color={tc(GREEN)} />
					</TouchableOpacity>
				) : null}
			</View>

			{showDirections ? (
				<TouchableOpacity style={styles.directions} onPress={() => openDirections(store)} accessibilityRole="button" accessibilityLabel="Abrir rota até o mercado">
					<Feather name="navigation" size={15} color={tc('#FFFFFF')} />
					<Text style={styles.directionsText}>Como chegar</Text>
				</TouchableOpacity>
			) : null}

			<Text style={styles.attribution} pointerEvents="none">Mapa © Esri</Text>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	root: { width: '100%', overflow: 'hidden', backgroundColor: '#E8ECEA' },
	webview: { flex: 1, backgroundColor: '#E8ECEA' },
	rounded: { borderRadius: 16 },
	tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },
	pinWrap: { position: 'absolute', width: 44, height: 52, alignItems: 'center' },
	pin: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: GREEN,
		borderWidth: 3,
		borderColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 5,
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	pinTip: { width: 0, height: 0, marginTop: -2, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: GREEN },
	controls: { position: 'absolute', right: 10, top: 10, gap: 8 },
	controlButton: {
		width: 38,
		height: 38,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
	},
	directions: {
		position: 'absolute',
		left: 10,
		bottom: 10,
		minHeight: 36,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 18,
		backgroundColor: GREEN,
		elevation: 3,
	},
	directionsText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 13 },
	attribution: { position: 'absolute', right: 6, bottom: 4, fontSize: 9, color: '#55605C', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 4, borderRadius: 3 },
}));

// ---------- Google Maps ----------
// Mapa do Google Maps "incorporado" (o mesmo do site do Google, sem chave de API):
// dá para arrastar, dar zoom e ver o pino fixo no SENAI de Suzano.

export function googleEmbedUrl(store = STORE, zoom = 16) {
	return `https://maps.google.com/maps?q=${store.latitude},${store.longitude}&z=${zoom}&output=embed&hl=pt-BR`;
}

function GoogleFrame({ uri }) {
	if (Platform.OS === 'web') {
		return React.createElement('iframe', {
			src: uri,
			title: 'Mapa do ponto de retirada',
			style: { border: 0, width: '100%', height: '100%' },
			loading: 'lazy',
			referrerPolicy: 'no-referrer-when-downgrade',
			allowFullScreen: true,
		});
	}
	// eslint-disable-next-line global-require
	const { WebView } = require('react-native-webview');
	// O Google só mostra o mapa incorporado dentro de um iframe, então o WebView carrega uma página com ele.
	const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>html,body{margin:0;height:100%;background:#E8ECEA}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="${uri.replace(/&/g, '&amp;')}" allowfullscreen loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>`;
	return (
		<WebView
			source={{ html }}
			originWhitelist={['*']}
			style={styles.webview}
			nestedScrollEnabled
			javaScriptEnabled
			domStorageEnabled
			setSupportMultipleWindows={false}
			// Links do mapa ("Ver mapa maior", rotas) abrem no app do Google Maps.
			onShouldStartLoadWithRequest={(request) => {
				if (request.url.startsWith('https://www.google.com/maps/embed') || request.url.startsWith('https://maps.google.com/maps') || request.url.startsWith('about:') || request.url.startsWith('data:')) return true;
				if (request.isTopFrame === false) return true;
				Linking.openURL(request.url).catch(() => {});
				return false;
			}}
		/>
	);
}

export default function MapaLoja({ height = 260, style, onDragChange, showDirections = true, rounded = true }) {
	// O WebView já vem no Expo Go e entra em qualquer APK gerado a partir de agora.
	return (
		<View
			style={[styles.root, rounded && styles.rounded, { height }, style]}
			// Enquanto o dedo está no mapa, a tela não rola (o gesto é do mapa).
			onTouchStart={() => onDragChange?.(true)}
			onTouchEnd={() => onDragChange?.(false)}
			onTouchCancel={() => onDragChange?.(false)}
			accessibilityLabel={`Google Maps: ${STORE.address}`}
		>
			<GoogleFrame uri={googleEmbedUrl()} />
			{showDirections ? (
				<TouchableOpacity style={styles.directions} onPress={() => openDirections()} accessibilityRole="button" accessibilityLabel="Abrir rota no Google Maps">
					<Feather name="navigation" size={15} color={tc('#FFFFFF')} />
					<Text style={styles.directionsText}>Como chegar</Text>
				</TouchableOpacity>
			) : null}
		</View>
	);
}
