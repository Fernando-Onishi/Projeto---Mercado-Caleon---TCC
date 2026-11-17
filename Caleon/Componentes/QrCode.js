import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import qrcode from 'qrcode-generator';

/**
 * QR Code desenhado só com Views (sem módulo nativo).
 * Junta os módulos escuros vizinhos de cada linha num único bloco para ficar leve.
 */
export default function QrCode({ value, size = 220, color = '#000000', backgroundColor = '#FFFFFF', quietZone = 2 }) {
	const rows = useMemo(() => {
		const qr = qrcode(0, 'M');
		qr.addData(value);
		qr.make();
		const count = qr.getModuleCount();
		const runs = [];
		for (let row = 0; row < count; row += 1) {
			let start = -1;
			for (let col = 0; col <= count; col += 1) {
				const dark = col < count && qr.isDark(row, col);
				if (dark && start < 0) start = col;
				if (!dark && start >= 0) {
					runs.push({ row, col: start, length: col - start });
					start = -1;
				}
			}
		}
		return { count, runs };
	}, [value]);

	const totalModules = rows.count + quietZone * 2;
	const cell = size / totalModules;

	return (
		<View
			style={[styles.root, { width: size, height: size, backgroundColor }]}
			accessible
			accessibilityRole="image"
			accessibilityLabel="QR Code do Pix"
		>
			{rows.runs.map(({ row, col, length }) => (
				<View
					key={`${row}-${col}`}
					style={{
						position: 'absolute',
						top: (row + quietZone) * cell,
						left: (col + quietZone) * cell,
						width: length * cell + 0.5,
						height: cell + 0.5,
						backgroundColor: color,
					}}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	root: { position: 'relative', overflow: 'hidden' },
});
