import React from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabPagerPage } from './TabPagerContext';

export default function SafeAreaScreen({ children, edges = ['top', 'bottom'], style, ...props }) {
	const insets = useSafeAreaInsets();
	const pagerPage = useTabPagerPage();

	// No carrossel do admin as páginas ficam fora da tela enquanto deslizam;
	// o SafeAreaView nativo mede a área visível e zeraria os espaços. Aqui usamos os valores fixos.
	if (pagerPage) {
		const has = (edge) => Array.isArray(edges) && edges.includes(edge);
		return (
			<View
				{...props}
				style={[style, {
					paddingTop: has('top') ? insets.top : 0,
					paddingBottom: has('bottom') ? insets.bottom : 0,
					paddingLeft: has('left') ? insets.left : 0,
					paddingRight: has('right') ? insets.right : 0,
				}]}
			>
				{children}
			</View>
		);
	}

	return (
		<SafeAreaView {...props} style={style} edges={edges}>
			{children}
		</SafeAreaView>
	);
}
