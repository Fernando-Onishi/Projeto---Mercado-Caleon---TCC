import React, { useCallback, useEffect } from 'react';
import TabsPager from '../Componentes/TabsPager';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import { syncSeedCatalog } from '../Config/CatalogoFirebase';
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
	// Ao abrir o painel, o admin envia ao Firebase o que faltar do catálogo (produtos e fotos).
	// A partir daí todos os aparelhos leem o catálogo do Firestore e veem as mudanças na hora.
	useEffect(() => {
		if (userRole !== 'admin') return;
		syncSeedCatalog().then(({ created, failed }) => {
			if (created) showGlobalNotification(`Catálogo enviado ao Firebase: ${created} produtos`);
			if (failed.length) console.warn(`Produtos não sincronizados agora: ${failed.join(', ')}`);
		});
	}, [userRole]);

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
