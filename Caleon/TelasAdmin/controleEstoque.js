import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { collection, onSnapshot } from 'firebase/firestore';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { db } from '../Config/FireBaseConfig';
import { isExpiringSoon, isLowStock, isOutOfStock, mapAdminProduct } from './adminProdutoUtils';

const C = {
	green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF',
	ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C',
};

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

export default function ControleEstoque({ navigation, userRole }) {
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	useEffect(() => onSnapshot(collection(db, 'products'), (snapshot) => {
		setProducts(snapshot.docs.map(mapAdminProduct).filter(Boolean));
		setLoading(false);
		setLoadError(false);
	}, (error) => {
		console.error('Não foi possível carregar os indicadores de estoque.', error);
		setLoadError(true);
		setLoading(false);
	}), []);

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
		<SafeAreaScreen style={styles.safe} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<View style={styles.topbar}>
				<CircularIconButton
					style={styles.backButton}
					icon={<Feather name="chevron-left" size={30} color={C.white} />}
					onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('AdminHome')}
					accessibilityLabel="Voltar"
				/>
				<View style={styles.headerSpacer} />
				<CircularIconButton
					style={styles.notificationButton}
					icon={<Feather name="bell" size={30} color={C.white} />}
					onPress={() => openFilteredProducts('Estoque baixo')}
					accessibilityLabel="Ver alertas de estoque"
				/>
			</View>
			<ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={styles.title}>Controle de Estoque</Text>
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
			<NavegacaoAdmin navigation={navigation} activeTab="Catálogo" showAdd={userRole === 'admin'} />
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.green },
	topbar: { minHeight: 50, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.green },
	backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.mint },
	headerSpacer: { flex: 1 },
	notificationButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.mint },
	screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: 'hidden' },
	content: { paddingHorizontal: 12, paddingTop: 7, paddingBottom: 16 },
	title: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 16, lineHeight: 21, textAlign: 'center', marginBottom: 15 },
	cards: { gap: 19 },
	loading: { paddingVertical: 28 },
	card: { minHeight: 73, borderWidth: 1, borderRadius: 9, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
	accent: { width: 7, alignSelf: 'stretch' },
	cardCopy: { flex: 1, paddingLeft: 8, paddingVertical: 6 },
	cardTitle: { fontFamily: 'LilitaOne_400Regular', fontSize: 8, lineHeight: 10 },
	valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 },
	value: { fontSize: 13, lineHeight: 16, fontWeight: '900' },
	detail: { color: '#252A28', fontSize: 7, fontWeight: '700' },
	monthly: { color: C.success, fontSize: 7, lineHeight: 9, fontWeight: '700', marginTop: 1 },
	iconBox: { width: 48, height: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
});
