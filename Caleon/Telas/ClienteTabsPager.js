import React, { useCallback } from 'react';
import TabsPager from '../Componentes/TabsPager';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import TelaHome from './home';
import TelaFavorito from './Favoritos';
import TelaSacola from './sacola';
import TelaProdutos from './produto';
import TelaPerfil from './Perfil';

const PAGES = [
	{ route: 'TelaHome', label: 'Início', Component: TelaHome },
	{ route: 'TelaFavorito', label: 'Favoritos', Component: TelaFavorito },
	{ route: 'TelaSacola', label: 'Sacola', Component: TelaSacola },
	{ route: 'TelaProdutos', label: 'Catálogo', Component: TelaProdutos },
	{ route: 'TelaPerfil', label: 'Perfil', Component: TelaPerfil },
];

export default function ClienteTabsPager({ navigation, route }) {
	const renderBar = useCallback(({ navigation: tabNavigation, activeLabel }) => (
		<NavegacaoInferior navigation={tabNavigation} activeTab={activeLabel} />
	), []);

	return (
		<TabsPager
			navigation={navigation}
			route={route}
			pages={PAGES}
			renderBar={renderBar}
			backgroundColor="#1B4B3D"
			barBackgroundColor="#f2f3f4"
		/>
	);
}
