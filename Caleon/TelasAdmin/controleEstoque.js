import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { collection, onSnapshot } from 'firebase/firestore';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import AdminHeaderActions from '../Componentes/AdminHeaderActions';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { db } from '../Config/FireBaseConfig';
import { isExpiringSoon, isLowStock, isOutOfStock, mapAdminProduct } from './adminProdutoUtils';
import { useAdminNotifications } from '../Componentes/AdminNotificationsContext';

const C = ADMIN_THEME.colors;

function IndicatorCard({ title, value, detail, subdetail, icon, color, onPress }) {
	const formattedValue = Number.isFinite(Number(value))
		? Number(value).toLocaleString('pt-BR')
		: value;
	return (
		<TouchableOpacity style={[styles.card, { borderColor: color }]} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`${title}: ${value}`}>
			<View style={[styles.accent, { backgroundColor: color }]} />
			<View style={styles.cardCopy}>
				<Text style={[styles.cardTitle, { color }]}>{title}</Text>
				<View style={styles.valueRow}>
					<Text style={[styles.value, { color }]}>{formattedValue}</Text>
					{title !== 'Total de Produtos' ? <Text style={styles.detail}>{detail}</Text> : null}
				</View>
				{title === 'Total de Produtos' || subdetail ? <Text style={styles.monthly}>{subdetail || detail}</Text> : null}
			</View>
			<View style={[styles.iconBox, { backgroundColor: color }]}>
				<Feather name={icon} size={28} color={C.white} />
			</View>
		</TouchableOpacity>
	);
}

export default function ControleEstoque({ navigation, route, userRole }) {
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const { notifications } = useAdminNotifications();
	const [notificationsVisible, setNotificationsVisible] = useState(Boolean(route?.params?.showNotifications));

	useEffect(() => onSnapshot(collection(db, 'products'), (snapshot) => {
		setProducts(snapshot.docs.map(mapAdminProduct).filter(Boolean));
		setLoading(false);
		setLoadError(false);
	}, (error) => {
		console.error('Não foi possível carregar os indicadores de estoque.', error);
		setLoadError(true);
		setLoading(false);
	}), []);
	useEffect(() => {
		if (!route?.params?.showNotifications) return;
		setNotificationsVisible(true);
		navigation.setParams({ showNotifications: false });
	}, [navigation, route?.params?.showNotifications]);

	const indicators = useMemo(() => {
		const now = new Date();
		const newProductsThisMonth = products.filter((product) => {
			const createdAt = product.createdAt?.toDate?.() ?? new Date(product.createdAt);
			return !Number.isNaN(createdAt.getTime())
				&& createdAt.getMonth() === now.getMonth()
				&& createdAt.getFullYear() === now.getFullYear();
		}).length;
		const lowStockCount = products.filter(isLowStock).length;
		const outOfStockCount = products.filter(isOutOfStock).length;
		const expiringCount = products.filter((product) => isExpiringSoon(product)).length;
		return [
			{ title: 'Total de Produtos', value: String(products.length), detail: `+${newProductsThisMonth} novos este mês`, icon: 'box', color: '#00AA6A', filter: 'Todos' },
			{ title: 'Estoque Baixo', value: String(lowStockCount), detail: `${lowStockCount} itens`, icon: 'alert-circle', color: '#FFC928', filter: 'Estoque baixo' },
			{ title: 'Estoque Zerado', value: String(outOfStockCount), detail: `${outOfStockCount} itens`, icon: 'alert-triangle', color: '#FF383C', filter: 'Estoque zerado' },
			{ title: 'Vencimento Próximo', value: String(expiringCount), detail: `${expiringCount} itens`, subdetail: 'Próximos 15 dias', icon: 'clock', color: '#FFA326', filter: 'Vencimento próximo' },
		];
	}, [products]);

	function openFilteredProducts(filter) {
		navigation.navigate('AdminProdutos', { stockFilter: filter });
	}

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<AdminNotificationsModal
				visible={notificationsVisible}
				onClose={() => setNotificationsVisible(false)}
				navigation={navigation}
			/>
			<AdminScreenLayout
				contentStyle={styles.contentPanel}
				footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Catálogo" showAdd={userRole === 'admin'} />}
			>
				<View style={styles.header}>
					<AdminHeaderActions
						left={<CircularIconButton
							style={styles.backButton}
							icon={<Feather name="chevron-left" size={27} color={C.white} />}
							onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('AdminHome')}
							accessibilityLabel="Voltar"
						/>}
						right={<View style={styles.notificationButtonWrap}>
							<CircularIconButton
								style={styles.notificationButton}
								icon={<Feather name="bell" size={22} color={C.white} />}
								onPress={() => setNotificationsVisible(true)}
								accessibilityLabel={`Abrir notificações, ${notifications.length} disponíveis`}
							/>
							{notifications.length > 0 ? (
								<View style={styles.notificationBadge}>
									<Text style={styles.notificationBadgeText}>{notifications.length > 99 ? '99+' : notifications.length}</Text>
								</View>
							) : null}
						</View>}
					/>
					<Text style={styles.title}>Controle de Estoque</Text>
				</View>
			<ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{loading ? <ActivityIndicator style={styles.loading} size="large" color={C.green} /> : null}
				{!loading ? <View style={styles.cards}>
					{indicators.map((indicator) => <IndicatorCard
						key={indicator.title}
						{...indicator}
						value={loadError ? '—' : indicator.value}
						detail={loadError ? '—' : indicator.detail}
						subdetail={loadError ? '—' : indicator.subdetail}
						onPress={() => openFilteredProducts(indicator.filter)}
					/>)}
				</View> : null}
			</ScrollView>
			</AdminScreenLayout>
		</>
	);
}

const styles = StyleSheet.create({
	backButton: { width: ADMIN_THEME.layout.headerActionSize, height: ADMIN_THEME.layout.headerActionSize, borderRadius: 12, backgroundColor: C.mint },
	notificationButton: { width: ADMIN_THEME.layout.headerActionSize, height: ADMIN_THEME.layout.headerActionSize, borderRadius: 12, backgroundColor: C.mint },
	notificationButtonWrap: { position: 'relative' },
	notificationBadge: { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: C.background, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
	notificationBadgeText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 9, lineHeight: 12, textAlign: 'center' },
	screen: { flex: 1 },
	contentPanel: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 },
	content: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 8 },
	header: { height: ADMIN_THEME.layout.panelHeaderHeight, alignItems: 'center', paddingTop: 15 },
	title: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: 14 },
	cards: { gap: 35 },
	loading: { paddingVertical: 32 },
	card: { minHeight: 96, borderWidth: 3, borderRadius: ADMIN_THEME.layout.cardRadius, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
	accent: { width: 10, alignSelf: 'stretch' },
	cardCopy: { flex: 1, paddingLeft: 12, paddingVertical: 10 },
	cardTitle: { fontFamily: ADMIN_THEME.fonts.display, fontSize: 16, lineHeight: 20 },
	valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 2 },
	value: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 24, lineHeight: 30 },
	detail: { color: '#252A28', fontFamily: ADMIN_THEME.fonts.medium, fontSize: 11 },
	monthly: { color: C.success, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 11, lineHeight: 15, marginTop: 2 },
	iconBox: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
});
