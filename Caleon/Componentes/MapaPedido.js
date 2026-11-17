import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

// Mapa leve feito com "tiles" (quadradinhos de mapa) do CARTO/OpenStreetMap, sem chave de API nem módulo nativo.
const TILE_SIZE = 256;
const TILE_URL = (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
const GREEN = '#1B4B3D';

function project(latitude, longitude, zoom) {
	const scale = TILE_SIZE * 2 ** zoom;
	const sin = Math.sin((latitude * Math.PI) / 180);
	return {
		x: ((longitude + 180) / 360) * scale,
		y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
	};
}

// Maior zoom em que todos os pontos cabem na área, com folga nas bordas.
function fitZoom(points, width, height, padding) {
	if (points.length < 2) return 16;
	for (let zoom = 17; zoom >= 3; zoom -= 1) {
		const projected = points.map((point) => project(point.latitude, point.longitude, zoom));
		const xs = projected.map((p) => p.x);
		const ys = projected.map((p) => p.y);
		if (Math.max(...xs) - Math.min(...xs) <= width - padding * 2
			&& Math.max(...ys) - Math.min(...ys) <= height - padding * 2) return zoom;
	}
	return 3;
}

function Marker({ point, children }) {
	return <View style={[styles.marker, { left: point.x - 18, top: point.y - 18 }]}>{children}</View>;
}

/**
 * store: { latitude, longitude } — ponto de retirada (mercado).
 * customer: { latitude, longitude } | null — onde o cliente está (opcional).
 */
export default function MapaPedido({ store, customer, height = 340, style }) {
	const [width, setWidth] = useState(0);
	const points = useMemo(() => [store, customer].filter((point) => (
		point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
	)), [store, customer]);

	const map = useMemo(() => {
		if (!width || points.length === 0) return null;
		const zoom = fitZoom(points, width, height, 56);
		const projected = points.map((point) => project(point.latitude, point.longitude, zoom));
		const center = {
			x: (Math.min(...projected.map((p) => p.x)) + Math.max(...projected.map((p) => p.x))) / 2,
			y: (Math.min(...projected.map((p) => p.y)) + Math.max(...projected.map((p) => p.y))) / 2,
		};
		const origin = { x: center.x - width / 2, y: center.y - height / 2 };
		const tiles = [];
		const maxTile = 2 ** zoom;
		for (let tx = Math.floor(origin.x / TILE_SIZE); tx <= Math.floor((origin.x + width) / TILE_SIZE); tx += 1) {
			for (let ty = Math.floor(origin.y / TILE_SIZE); ty <= Math.floor((origin.y + height) / TILE_SIZE); ty += 1) {
				if (ty < 0 || ty >= maxTile) continue;
				tiles.push({
					key: `${zoom}-${tx}-${ty}`,
					uri: TILE_URL(zoom, ((tx % maxTile) + maxTile) % maxTile, ty),
					left: tx * TILE_SIZE - origin.x,
					top: ty * TILE_SIZE - origin.y,
				});
			}
		}
		const toScreen = (p) => ({ x: p.x - origin.x, y: p.y - origin.y });
		return { tiles, screen: projected.map(toScreen) };
	}, [width, height, points]);

	const storePoint = map?.screen[0];
	const customerPoint = map?.screen[1];
	const route = storePoint && customerPoint ? (() => {
		const dx = storePoint.x - customerPoint.x;
		const dy = storePoint.y - customerPoint.y;
		return {
			length: Math.sqrt(dx * dx + dy * dy),
			angle: `${Math.atan2(dy, dx)}rad`,
			mid: { x: (storePoint.x + customerPoint.x) / 2, y: (storePoint.y + customerPoint.y) / 2 },
		};
	})() : null;

	return (
		<View
			style={[styles.root, { height }, style]}
			onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
			accessible
			accessibilityLabel="Mapa com o local de retirada do pedido"
		>
			{map?.tiles.map((tile) => (
				<Image key={tile.key} source={{ uri: tile.uri }} style={[styles.tile, { left: tile.left, top: tile.top }]} />
			))}
			{route ? (
				<View
					style={[styles.route, {
						width: route.length,
						left: route.mid.x - route.length / 2,
						top: route.mid.y - 2,
						transform: [{ rotate: route.angle }],
					}]}
				/>
			) : null}
			{customerPoint ? (
				<Marker point={customerPoint}>
					<View style={styles.customerDot} />
				</Marker>
			) : null}
			{storePoint ? (
				<Marker point={storePoint}>
					<View style={styles.storePin}>
						<Feather name="shopping-bag" size={16} color="#FFFFFF" />
					</View>
				</Marker>
			) : null}
			<Text style={styles.attribution}>© OpenStreetMap © CARTO</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { width: '100%', overflow: 'hidden', backgroundColor: '#E8ECEA' },
	tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },
	route: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: GREEN },
	marker: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
	customerDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#00AA6A', borderWidth: 3, borderColor: '#FFFFFF' },
	storePin: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: GREEN,
		borderWidth: 3,
		borderColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	attribution: { position: 'absolute', right: 6, bottom: 4, fontSize: 9, color: '#55605C', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 4, borderRadius: 3 },
});
