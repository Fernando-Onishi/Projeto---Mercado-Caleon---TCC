import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ADMIN_THEME } from '../Config/AdminTheme';

export default function AdminHeaderActions({ left, right }) {
	return (
		<View style={styles.row}>
			{left}
			<View style={styles.right}>{right}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		width: '100%',
		height: ADMIN_THEME.layout.headerActionSize,
		paddingHorizontal: ADMIN_THEME.layout.headerSidePadding,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	right: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
});