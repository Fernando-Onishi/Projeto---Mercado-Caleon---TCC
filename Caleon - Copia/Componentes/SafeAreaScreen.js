import React from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabPagerPage } from './TabPagerContext';
import { themeColor } from '../Config/Tema';

// Cor padrão da faixa de baixo (área da barra de gestos do Android): a mesma do conteúdo das telas,
// em vez do verde do cabeçalho (que aparecia como uma barrinha verde no rodapé).
const DEFAULT_BOTTOM_COLOR = '#F1F3F5';

/**
 * Tela com as margens seguras do aparelho.
 * bottomColor: cor da faixa de baixo (padrão: fundo claro das telas; acompanha o modo escuro).
 */
export default function SafeAreaScreen({ children, edges = ['top', 'bottom'], style, bottomColor = DEFAULT_BOTTOM_COLOR, ...props }) {
	const insets = useSafeAreaInsets();
	const pagerPage = useTabPagerPage();
	const has = (edge) => Array.isArray(edges) && edges.includes(edge);
	const bottomFill = has('bottom') && insets.bottom > 0
		? <View style={{ height: insets.bottom, backgroundColor: themeColor(bottomColor, 'bg') }} />
		: null;

	// No carrossel de abas as páginas ficam fora da tela enquanto deslizam;
	// o SafeAreaView nativo mediria a área visível e zeraria os espaços. Aqui usamos os valores fixos.
	if (pagerPage) {
		return (
			<View
				{...props}
				style={[style, {
					paddingTop: has('top') ? insets.top : 0,
					paddingLeft: has('left') ? insets.left : 0,
					paddingRight: has('right') ? insets.right : 0,
				}]}
			>
				{children}
				{bottomFill}
			</View>
		);
	}

	return (
		<SafeAreaView {...props} style={style} edges={edges.filter((edge) => edge !== 'bottom')}>
			{children}
			{bottomFill}
		</SafeAreaView>
	);
}
