import { createContext, useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';

// Abas que ficam lado a lado no carrossel, na ordem da barra inferior.
export const ADMIN_TAB_ROUTES = ['AdminHome', 'AdminQrCode', 'AdminProdutos', 'AdminConfiguracoes'];
export const CLIENT_TAB_ROUTES = ['TelaHome', 'TelaFavorito', 'TelaSacola', 'TelaProdutos', 'TelaPerfil'];

// Fornecido pelo carrossel: aba ativa e função para trocar de aba.
export const TabPagerContext = createContext(null);

// Fornecido para cada página dentro do carrossel: nome da rota daquela página.
export const TabPagerPageContext = createContext(null);

export function useTabPager() {
	return useContext(TabPagerContext);
}

export function useTabPagerPage() {
	return useContext(TabPagerPageContext);
}

// Igual ao useIsFocused, mas dentro do carrossel só é true na aba visível.
export function useTabFocused() {
	const isFocused = useIsFocused();
	const pager = useContext(TabPagerContext);
	const page = useContext(TabPagerPageContext);
	if (!pager || !page) return isFocused;
	return isFocused && pager.activeRoute === page;
}

// Abre uma aba: dentro do carrossel desliza até ela; fora dele volta ao carrossel já na aba certa.
export function openTab(navigation, pager, homeRoute, tabRoute) {
	if (pager) {
		pager.goTo(tabRoute);
		return;
	}
	navigation.navigate(homeRoute, { tab: tabRoute });
}
