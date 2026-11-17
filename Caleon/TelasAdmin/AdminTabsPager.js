import React, { useCallback } from 'react';
import TabsPager from '../Componentes/TabsPager';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';
import AdminHome from './AdminHome';
import AdminQrCode from './AdminQrCode';
import AdminProdutos from './AdminProdutos';
import AdminConfiguracoes from './AdminConfiguracoes';

const PAGES = [
	{ route: 'AdminHome', label: 'Início', Component: AdminHome },
	{ route: 'AdminQrCode', label: 'QR Code', Component: AdminQrCode },
	{ route: 'AdminProdutos', label: 'Catálogo', Component: AdminProdutos },
	{ route: 'AdminConfiguracoes', label: 'Configurações', Component: AdminConfiguracoes },
];

export default function AdminTabsPager({ navigation, route, userRole }) {
	const renderBar = useCallback(({ navigation: tabNavigation, activeLabel }) => (
		<NavegacaoAdmin navigation={tabNavigation} activeTab={activeLabel} showAdd={userRole === 'admin'} />
	), [userRole]);

	return (
		<TabsPager
			navigation={navigation}
			route={route}
			pages={PAGES}
			pageProps={{ userRole }}
			renderBar={renderBar}
			backgroundColor={ADMIN_THEME.colors.adminHeaderBg}
			barBackgroundColor={ADMIN_THEME.colors.white}
		/>
	);
}
