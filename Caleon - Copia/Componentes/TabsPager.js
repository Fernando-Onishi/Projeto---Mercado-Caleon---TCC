import React, { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Animated,
	BackHandler,
	Easing,
	Platform,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabPagerContext, TabPagerPageContext } from './TabPagerContext';
import { themeColor, themedStyles } from '../Config/Tema';

// Última aba aberta em cada carrossel (sobrevive ao redesenho do app quando o tema muda).
const lastTabByRoute = new Map();

// Duração base + um pouco por tela atravessada: pular várias abas passa por todas, mas rápido.
const BASE_DURATION = 260;
const DURATION_PER_PAGE = 70;

// Uma página do carrossel. Só é redesenhada quando muda o que ela recebe
// (trocar de aba não redesenha as outras telas — era isso que atrasava o toque na barra).
const PagerPage = memo(function PagerPage({ pageRoute, Component, navigation, route, pageProps, isActive, width }) {
	return (
		<View
			style={[styles.page, { width }]}
			importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
			accessibilityElementsHidden={!isActive}
		>
			<TabPagerPageContext.Provider value={pageRoute}>
				<Component navigation={navigation} route={route} {...pageProps} />
			</TabPagerPageContext.Provider>
		</View>
	);
}, (prev, next) => {
	const keys = new Set([...Object.keys(prev.pageProps || {}), ...Object.keys(next.pageProps || {})]);
	const samePageProps = [...keys].every((key) => prev.pageProps?.[key] === next.pageProps?.[key]);
	return samePageProps
		&& prev.isActive === next.isActive
		&& prev.width === next.width
		&& prev.navigation === next.navigation
		&& prev.route === next.route
		&& prev.Component === next.Component;
});

/**
 * Carrossel de abas: todas as páginas ficam lado a lado e a troca de aba desliza na horizontal,
 * passando pelas abas do meio. A barra inferior é única e fica fixa por cima.
 *
 * pages: [{ route, label, Component }] na ordem da barra.
 * renderBar({ navigation, activeLabel }): desenha a barra inferior.
 */
export default function TabsPager({
	navigation,
	route,
	pages,
	renderBar,
	pageProps,
	backgroundColor,
	barBackgroundColor,
}) {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const tabRoutes = useMemo(() => pages.map((page) => page.route), [pages]);
	const homeRoute = tabRoutes[0];
	// Ao trocar o tema o app é redesenhado: volta na mesma aba em que a pessoa estava.
	const requestedIndex = tabRoutes.indexOf(route?.params?.tab);
	const initialIndex = requestedIndex >= 0 ? requestedIndex : (lastTabByRoute.get(route.key) ?? 0);
	const [activeIndex, setActiveIndex] = useState(initialIndex);
	// A barra muda na hora do toque; o resto da troca de aba vem logo depois, sem travar o toque.
	const [barIndex, setBarIndex] = useState(initialIndex);
	const position = useRef(new Animated.Value(initialIndex)).current;
	const activeIndexRef = useRef(initialIndex);
	const historyRef = useRef([]);
	const animationRef = useRef(null);
	const listenersRef = useRef({});

	const emitToPage = useCallback((pageRoute, type) => {
		(listenersRef.current[pageRoute]?.[type] || []).forEach((callback) => callback({ type }));
	}, []);

	const goToIndex = useCallback((nextIndex, recordHistory = true) => {
		const currentIndex = activeIndexRef.current;
		if (nextIndex < 0 || nextIndex === currentIndex) return;
		if (recordHistory) historyRef.current.push(currentIndex);
		activeIndexRef.current = nextIndex;
		lastTabByRoute.set(route.key, nextIndex);
		setBarIndex(nextIndex);
		startTransition(() => setActiveIndex(nextIndex));
		emitToPage(tabRoutes[currentIndex], 'blur');
		emitToPage(tabRoutes[nextIndex], 'focus');

		animationRef.current?.stop();
		const distance = Math.abs(nextIndex - currentIndex);
		animationRef.current = Animated.timing(position, {
			toValue: nextIndex,
			duration: BASE_DURATION + DURATION_PER_PAGE * (distance - 1),
			easing: Easing.inOut(Easing.cubic),
			useNativeDriver: Platform.OS !== 'web',
		});
		animationRef.current.start();
	}, [position, tabRoutes, emitToPage, route.key]);

	const goTo = useCallback((routeName) => {
		goToIndex(tabRoutes.indexOf(routeName));
	}, [goToIndex, tabRoutes]);

	const goBackTab = useCallback(() => {
		const previousIndex = historyRef.current.pop();
		if (previousIndex === undefined) return false;
		goToIndex(previousIndex, false);
		return true;
	}, [goToIndex]);

	// Telas fora do carrossel abrem uma aba com navigate(<rota inicial>, { tab: '<aba>' }).
	const requestedTab = route?.params?.tab;
	useEffect(() => {
		if (!requestedTab) return;
		goTo(requestedTab);
		navigation.setParams({ tab: undefined });
	}, [requestedTab, goTo, navigation]);

	// Quando o carrossel volta a ficar visível (ex.: voltando de um detalhe), avisa a aba ativa.
	useEffect(() => {
		const unsubscribeFocus = navigation.addListener('focus', () => emitToPage(tabRoutes[activeIndexRef.current], 'focus'));
		const unsubscribeBlur = navigation.addListener('blur', () => emitToPage(tabRoutes[activeIndexRef.current], 'blur'));
		return () => {
			unsubscribeFocus();
			unsubscribeBlur();
		};
	}, [navigation, tabRoutes, emitToPage]);

	// Botão voltar do Android volta para a aba anterior antes de sair do carrossel.
	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => (
			navigation.isFocused() ? goBackTab() : false
		));
		return () => subscription.remove();
	}, [navigation, goBackTab]);

	// As telas continuam chamando navigation.navigate('<aba>'), push, goBack etc.;
	// aqui isso vira uma troca de aba animada em vez de empilhar uma tela nova.
	const tabNavigation = useMemo(() => {
		const proxy = Object.create(navigation);
		const handleTabRoute = (name, params) => {
			if (typeof name !== 'string') return false;
			if (name === homeRoute && params?.tab) {
				goTo(params.tab);
				return true;
			}
			const isFilteredCatalog = Boolean(params?.stockFilter || params?.lowStock);
			if (tabRoutes.includes(name) && !isFilteredCatalog) {
				goTo(name);
				return true;
			}
			return false;
		};
		proxy.navigate = (...args) => {
			if (!handleTabRoute(args[0], args[1])) navigation.navigate(...args);
		};
		proxy.push = (...args) => {
			if (!handleTabRoute(args[0], args[1])) navigation.push(...args);
		};
		proxy.canGoBack = () => historyRef.current.length > 0 || navigation.canGoBack();
		proxy.goBack = () => {
			if (!goBackTab()) navigation.goBack();
		};
		return proxy;
	}, [navigation, goTo, goBackTab, homeRoute, tabRoutes]);

	// Cada página recebe sua própria navigation, para que addListener('focus') funcione por aba.
	const pageNavigations = useMemo(() => pages.map(({ route: pageRoute }) => {
		const pageNavigation = Object.create(tabNavigation);
		pageNavigation.addListener = (type, callback) => {
			if (type !== 'focus' && type !== 'blur') return navigation.addListener(type, callback);
			const pageListeners = listenersRef.current[pageRoute] || (listenersRef.current[pageRoute] = {});
			const typeListeners = pageListeners[type] || (pageListeners[type] = []);
			typeListeners.push(callback);
			return () => {
				pageListeners[type] = (pageListeners[type] || []).filter((item) => item !== callback);
			};
		};
		pageNavigation.isFocused = () => navigation.isFocused() && tabRoutes[activeIndexRef.current] === pageRoute;
		return pageNavigation;
	}), [pages, tabNavigation, navigation, tabRoutes]);

	const homeParams = useMemo(() => {
		const { tab, ...rest } = route?.params || {};
		return rest;
	}, [route?.params]);

	const pageRoutes = useMemo(() => pages.map((page, index) => ({
		key: `${route.key}-${page.route}`,
		name: page.route,
		params: index === 0 ? homeParams : {},
	})), [pages, route.key, homeParams]);

	const activeRoute = tabRoutes[activeIndex];
	const barLabel = pages[barIndex].label;
	const bar = useMemo(() => renderBar({ navigation: tabNavigation, activeLabel: barLabel }), [renderBar, tabNavigation, barLabel]);
	const pagerValue = useMemo(() => ({ activeRoute, goTo, homeRoute }), [activeRoute, goTo, homeRoute]);
	const translateX = useMemo(() => Animated.multiply(position, -width), [position, width]);

	return (
		<TabPagerContext.Provider value={pagerValue}>
			<View style={[styles.root, backgroundColor ? { backgroundColor: themeColor(backgroundColor, 'bg') } : null]}>
				<Animated.View style={[styles.track, { width: width * pages.length, transform: [{ translateX }] }]}>
					{pages.map(({ route: pageRoute, Component }, index) => (
						<PagerPage
							key={pageRoute}
							pageRoute={pageRoute}
							Component={Component}
							navigation={pageNavigations[index]}
							route={pageRoutes[index]}
							pageProps={pageProps}
							isActive={index === activeIndex}
							width={width}
						/>
					))}
				</Animated.View>
				<View style={[styles.bottomBar, { paddingBottom: insets.bottom }, barBackgroundColor ? { backgroundColor: themeColor(barBackgroundColor, 'bg') } : null]}>
					{bar}
				</View>
			</View>
		</TabPagerContext.Provider>
	);
}

const styles = themedStyles(StyleSheet.create({
	root: {
		flex: 1,
		overflow: 'hidden',
	},
	track: {
		flex: 1,
		flexDirection: 'row',
	},
	page: {
		height: '100%',
		overflow: 'hidden',
	},
	bottomBar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#FFFFFF',
		zIndex: 10,
	},
}));
