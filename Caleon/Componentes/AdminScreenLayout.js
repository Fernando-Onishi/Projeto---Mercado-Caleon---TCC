import React from 'react';
import { StyleSheet, View } from 'react-native';
import SafeAreaScreen from './SafeAreaScreen';
import { ADMIN_THEME } from '../Config/AdminTheme';

export default function AdminScreenLayout({
	children,
	headerContent,
	headerHeight = ADMIN_THEME.layout.topBandHeight,
	footerContent,
	edges = ['top', 'bottom'],
	style,
	contentStyle,
}) {
	return (
		<SafeAreaScreen style={[styles.container, style]} edges={edges}>
			<View style={[styles.topHeaderSpace, { height: headerHeight }]}>
				{headerContent}
			</View>
			<View style={[styles.mainContentCard, contentStyle]}>
				{children}
			</View>
			{footerContent}
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		backgroundColor: ADMIN_THEME.colors.adminHeaderBg,
	},
	topHeaderSpace: {
		width: '100%',
		justifyContent: 'center',
	},
	mainContentCard: {
		flex: 1,
		width: '100%',
		backgroundColor: ADMIN_THEME.colors.background,
		borderTopLeftRadius: ADMIN_THEME.layout.panelRadius,
		borderTopRightRadius: ADMIN_THEME.layout.panelRadius,
		paddingHorizontal: 13,
		paddingTop: 0,
		paddingBottom: 16,
		overflow: 'hidden',
	},
});
