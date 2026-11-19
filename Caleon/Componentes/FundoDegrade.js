import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { themedStyles } from '../Config/Tema';

function hexToRgb(hex) {
	const value = parseInt(hex.replace('#', ''), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Degradê vertical feito com faixas finas de cor (sem módulo nativo, funciona em qualquer build).
 */
export default function FundoDegrade({ from = '#1B4B3D', to = '#40B190', steps = 48, style, children }) {
	const bands = useMemo(() => {
		const start = hexToRgb(from);
		const end = hexToRgb(to);
		return Array.from({ length: steps }, (_, index) => {
			const t = index / (steps - 1);
			const [r, g, b] = start.map((channel, c) => Math.round(channel + (end[c] - channel) * t));
			return `rgb(${r}, ${g}, ${b})`;
		});
	}, [from, to, steps]);

	return (
		<View style={[styles.root, { backgroundColor: to }, style]}>
			<View style={StyleSheet.absoluteFill} pointerEvents="none">
				{bands.map((color, index) => (
					// Cada faixa avança 1px sobre a seguinte para não sobrar fresta entre elas.
					<View
						key={index}
						style={[styles.band, {
							backgroundColor: color,
							top: `${(index * 100) / steps}%`,
							bottom: `${100 - ((index + 1) * 100) / steps}%`,
							marginBottom: index === steps - 1 ? 0 : -1,
						}]}
					/>
				))}
			</View>
			{children}
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	root: { flex: 1, overflow: 'hidden' },
	band: { position: 'absolute', left: 0, right: 0 },
}));
