import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
	Alert,
	FlatList,
	Image,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	StatusBar,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import Feather from '@expo/vector-icons/Feather';
import { auth } from '../Config/FireBaseConfig';

const colors = {
	green: '#1B4B3D',
	ink: '#111715',
	muted: '#75807c',
	surface: '#f5f7f7',
	white: '#ffffff',
};

const products = [
	{ name: 'Maçã', price: 'R$ 3,99', weight: '500g', discount: '20% OFF', emoji: '🍎' },
	{ name: 'Maçã', price: 'R$ 3,99', weight: '500g', discount: '18% OFF', emoji: '🍎' },
	{ name: 'Luxemburgo', price: 'R$ 3,99', weight: '500g', discount: '20% OFF', emoji: '🍎' },
];

const categories = ['Hortifruti', 'Carnes', 'Bebidas', 'Laticínios', 'Limpeza'];

function normalizeSearchText(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase()
		.trim();
}

function ProductCard({ product, width }) {
	const scale = width / 145;

	return (
		<View style={[styles.productCard, {
			width,
			minHeight: 180 * scale,
			padding: 7 * scale,
			borderRadius: 25 * scale,
		}]}>
			<View style={[styles.productImage, {
				height: 61 * scale,
				borderRadius: 7 * scale,
			}]}>
				<Text style={[styles.discount, {
					left: 2 * scale,
					top: 3 * scale,
					fontSize: 6 * scale,
					paddingHorizontal: 3 * scale,
					borderRadius: 3 * scale,
				}]}>{product.discount}</Text>
				<Text style={[styles.heart, {
					right: 3 * scale,
					top: 2 * scale,
					borderRadius: 8 * scale,
					fontSize: 11 * scale,
					width: 13 * scale,
					height: 13 * scale,
					lineHeight: 12 * scale,
				}]}>♡</Text>
				<Text style={[styles.productEmoji, { fontSize: 39 * scale }]}>{product.emoji}</Text>
			</View>
			<Text style={[styles.productName, { fontSize: 10 * scale, marginTop: 4 * scale }]}>
				{product.name} <Text style={[styles.weight, { fontSize: 7 * scale }]}>{product.weight}</Text>
			</Text>
			<Text style={[styles.price, { fontSize: 12 * scale, marginTop: 1 * scale }]}>{product.price}</Text>
			<TouchableOpacity
				style={[styles.addButton, {
					height: 15 * scale,
					borderRadius: 8 * scale,
					marginTop: 4 * scale,
				}]}
				activeOpacity={0.8}
			>
				<Text style={[styles.addButtonText, { fontSize: 6 * scale }]}>＋ Adicionar à sacola</Text>
			</TouchableOpacity>
		</View>
	);
}

function ProductSection({ title, products: sectionProducts, cardWidth }) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
				<TouchableOpacity>
					<Text style={styles.seeAll}>Ver mais ›</Text>
				</TouchableOpacity>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
				{sectionProducts.map((product, index) => (
					<ProductCard product={product} width={cardWidth} key={`${title}-${index}`} />
				))}
			</ScrollView>
		</View>
	);
}

const catalogCategories = [
	{ name: 'Hortí-Fruti', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&w=700&q=85' },
	{ name: 'Bebidas', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&w=700&q=85' },
	{ name: 'Laticínios', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&w=700&q=85' },
	{ name: 'Açougue', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&w=700&q=85' },
	{ name: 'Limpeza', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&w=700&q=85' },
	{ name: 'Matinais', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&w=700&q=85' },
];

const catalogTabs = [
	{ label: 'Início', icon: 'home-outline', screen: 'TelaHome' },
	{ label: 'Favoritos', icon: 'heart-outline', screen: 'TelaFavorito' },
	{ label: 'Sacola', icon: 'shopping-outline' },
	{ label: 'Catálogo', icon: 'clipboard-list-outline', active: true },
	{ label: 'Perfil', icon: 'account-outline' },
];

export function Produtos({ navigation }) {
	const { width: windowWidth } = useWindowDimensions();
	const cardWidth = (windowWidth - 50) / 2;

	function unavailable(destination) {
		Alert.alert(destination, 'Esta tela ainda não está disponível no aplicativo.');
	}

	return (
		<SafeAreaView style={catalogStyles.safeArea}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<View style={catalogStyles.topBand} />
			<View style={catalogStyles.screen}>
				<View style={catalogStyles.header}>
					<TouchableOpacity style={catalogStyles.backButton} onPress={() => {
						if (navigation.canGoBack()) navigation.goBack();
						else navigation.navigate('TelaHome');
					}} accessibilityLabel="Voltar">
						<MaterialCommunityIcons name="arrow-left" size={22} color="white" />
					</TouchableOpacity>
					<Text style={catalogStyles.title}>Produtos</Text>
					<TouchableOpacity style={catalogStyles.bagButton} onPress={() => unavailable('Sacola')} accessibilityLabel="Abrir sacola, 1 item">
						<MaterialCommunityIcons name="shopping-outline" size={23} color="white" />
						<View style={catalogStyles.badge}><Text style={catalogStyles.badgeText}>1</Text></View>
					</TouchableOpacity>
				</View>
				<FlatList
					data={catalogCategories}
					numColumns={2}
					keyExtractor={(item) => item.name}
					renderItem={({ item }) => (
						<TouchableOpacity style={[catalogStyles.card, { width: cardWidth, height: cardWidth }]} onPress={() => unavailable(item.name)} accessibilityRole="button">
							<Image source={{ uri: item.image }} style={catalogStyles.image} resizeMode="contain" />
							<Text style={catalogStyles.categoryName}>{item.name}</Text>
						</TouchableOpacity>
					)}
					columnWrapperStyle={catalogStyles.row}
					contentContainerStyle={catalogStyles.grid}
					showsVerticalScrollIndicator={false}
					style={catalogStyles.list}
				/>
				<View style={catalogStyles.tabBar}>
					{catalogTabs.map((tab) => {
						const active = Boolean(tab.active);
						return (
							<TouchableOpacity key={tab.label} style={catalogStyles.tab} onPress={() => {
								if (tab.screen) navigation.navigate(tab.screen);
								else if (!active) unavailable(tab.label);
							}} accessibilityRole="button" accessibilityState={{ selected: active }}>
								<View style={[catalogStyles.tabIcon, active && catalogStyles.activeTabIcon]}>
									<MaterialCommunityIcons name={tab.icon} size={23} color={active ? 'white' : colors.muted} />
								</View>
								<Text style={[catalogStyles.tabLabel, active && catalogStyles.activeTabLabel]}>{tab.label}</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
		</SafeAreaView>
	);
}

const catalogStyles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.green },
	topBand: { height: 40, backgroundColor: colors.green },
	screen: { flex: 1, marginTop: -1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F1F3F4', overflow: 'hidden' },
	header: { height: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	backButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#43B196' },
	title: { position: 'absolute', left: 56, right: 56, textAlign: 'center', color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 30 },
	bagButton: { width: 38, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#43B196' },
	badge: { position: 'absolute', right: -4, top: -5, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04449' },
	badgeText: { color: colors.white, fontFamily: 'Montserrat_700Bold', fontSize: 9 },
	list: { flex: 1 },
	grid: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22, gap: 48 },
	row: { justifyContent: 'space-between', gap: 18 },
	card: { padding: 9, alignItems: 'center', justifyContent: 'space-between', borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D6D4', backgroundColor: colors.white, shadowColor: '#525A57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
	image: { width: '100%', flex: 1, borderRadius: 9 },
	categoryName: { marginTop: 7, color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 18, textAlign: 'center' },
	tabBar: { minHeight: 68, paddingTop: 8, paddingBottom: 5, borderTopWidth: 1, borderTopColor: '#AEB5B2', backgroundColor: '#F1F3F4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
	tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
	tabIcon: { width: 33, height: 30, alignItems: 'center', justifyContent: 'center' },
	activeTabIcon: { borderRadius: 9, backgroundColor: colors.green },
	tabLabel: { color: colors.muted, fontFamily: 'Montserrat_700Bold', fontSize: 9 },
	activeTabLabel: { color: colors.green },
});

export default function Home({ navigation }) {
	const { width: windowWidth } = useWindowDimensions();
	const productCardWidth = windowWidth * 0.335;
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [userName, setUserName] = useState('usuário');
	const [searchText, setSearchText] = useState('');
	const normalizedSearchText = normalizeSearchText(searchText);
	const isSearching = normalizedSearchText.length > 0;
	const matchingProducts = isSearching
		? products.filter((product) => normalizeSearchText(product.name).includes(normalizedSearchText))
		: products;
	const matchingCategories = isSearching
		? categories.filter((category) => normalizeSearchText(category).includes(normalizedSearchText))
		: [];

	useEffect(() => onAuthStateChanged(auth, (user) => {
		setUserName(user?.displayName?.trim() || 'usuário');
	}), []);

	if (!fontsLoaded) return null;

	async function handleSignOut() {
		try {
			await signOut(auth);
			navigation.replace('TelaLogin');
		} catch {
			Alert.alert('Sair', 'Não foi possível encerrar sua sessão. Tente novamente.');
		}
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.locationIcon}>
					<Feather name="map-pin" size={24} color="white" />
				</View>
				<View style={styles.locationText}>
					<Text style={styles.greeting} numberOfLines={1}>Olá, {userName}</Text>
					<Text style={styles.address} numberOfLines={1}>R. Joaquim Nabuco, 131 - Fátima</Text>
					<Text style={styles.cep}>61760-640</Text>
				</View>
				<TouchableOpacity
					style={styles.logoutButton}
					activeOpacity={0.8}
					onPress={handleSignOut}
					accessibilityRole="button"
					accessibilityLabel="Sair da conta"
				>
					<Text style={styles.logoutText}>Sair</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.bagButton}>
					<MaterialCommunityIcons name="shopping-outline" size={30} color="white" />
					<View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
				</TouchableOpacity>
			</View>

			<View style={styles.contentArea}>
				<View style={styles.searchBox}>
					<Feather name="search" size={24} color="black" style={styles.searchIcon} />
					<TextInput
						placeholder="Pesquise produtos, categorias"
						placeholderTextColor="#8b9491"
						style={styles.searchInput}
						value={searchText}
						onChangeText={setSearchText}
						returnKeyType="search"
						accessibilityLabel="Pesquisar produtos e categorias"
					/>
				</View>
				{!isSearching && (
					<>
						<View style={styles.bannerRow}>
							<View style={[styles.banner, styles.bannerWide]} />
							<View style={styles.banner} />
						</View>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
							<View style={styles.categoryFilter} accessibilityLabel="Filtros de categorias">
								<Feather name="sliders" size={25} color={colors.white} />
							</View>
							{categories.map((category) => (
								<TouchableOpacity key={category} style={styles.category}>
									<Text style={styles.categoryText}>{category}</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</>
				)}
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					{isSearching ? (
						<>
							{matchingCategories.length > 0 && (
								<View style={styles.searchResults}>
									<Text style={styles.sectionTitle}>Categorias</Text>
									<View style={styles.searchCategories}>
										{matchingCategories.map((category) => (
											<View key={category} style={styles.category}>
												<Text style={styles.categoryText}>{category}</Text>
											</View>
										))}
									</View>
								</View>
							)}
							{matchingProducts.length > 0 && (
								<ProductSection
									title="Produtos encontrados"
									products={matchingProducts}
									cardWidth={productCardWidth}
								/>
							)}
							{matchingCategories.length === 0 && matchingProducts.length === 0 && (
								<Text style={styles.noSearchResults}>Nenhum produto ou categoria encontrado.</Text>
							)}
						</>
					) : (
						<>
							<ProductSection title="Em Destaque" products={products} cardWidth={productCardWidth} />
							<ProductSection title="Em Promoção" products={products} cardWidth={productCardWidth} />
							<ProductSection title="Produtos" products={products} cardWidth={productCardWidth} />
						</>
					)}
				</ScrollView>
			</View>

			<View style={styles.tabBar}>
				{[
					['⌂', 'Início', true], ['♡', 'Favoritos'], ['♧', 'Sacola'], ['▣', 'Catálogo'], ['♙', 'Perfil'],
				].map(([icon, label, active]) => (
					<TouchableOpacity
						style={styles.tab}
						key={label}
						onPress={() => {
							if (label === 'Catálogo') navigation.navigate('TelaProdutos');
							if (label === 'Favoritos') navigation.navigate('TelaFavorito');
						}}
					>
						<View style={active ? styles.activeTabIcon : styles.tabIcon}>
							{label === 'Início' ? (
								<Octicons name={active ? 'home-fill' : 'home'} size={24} color={active ? 'white' : '#757575'} />
							) : (
								<Text style={active ? styles.activeIconText : styles.iconText}>{icon}</Text>
							)}
						</View>
						<Text style={active ? styles.activeTabLabel : styles.tabLabel}>{label}</Text>
					</TouchableOpacity>
				))}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.surface,
	},
	contentArea: {
		flex: 1,
		paddingTop: 12,
		backgroundColor: colors.surface,
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},

	header: {
		height: 76,
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	locationIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
	},
	locationText: {
		flex: 1,
		marginLeft: 9,
	},
	greeting: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 12,
	},
	address: {
		color: colors.white,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 9,
		marginTop: 3,
	},
	cep: {
		color: '#9dc6b7',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 8,
		marginTop: 2,
	},
	bagButton: {
		width: 40,
		height: 40,
		borderRadius: 9,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutButton: {
		height: 34,
		paddingHorizontal: 10,
		marginLeft: 8,
		borderRadius: 9,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutText: {
		color: colors.green,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 11,
	},
	badge: {
		position: 'absolute',
		right: -3,
		top: -4,
		backgroundColor: '#ff3f44',
		borderRadius: 8,
		minWidth: 13,
		height: 13,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 8,
	},

	searchBox: {
		height: 34,
		marginHorizontal: 18,
		borderRadius: 20,
		backgroundColor: '#dfe2e2',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 11,
	},
	searchIcon: {
		marginRight: 7,
	},
	searchInput: {
		flex: 1,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 10,
		color: colors.ink,
		paddingVertical: 0,
	},
	bannerRow: {
		flexDirection: 'row',
		gap: 7,
		marginTop: 8,
		paddingLeft: 18,
		overflow: 'hidden',
	},
	banner: {
		height: 83,
		width: 112,
		borderRadius: 14,
		backgroundColor: '#d7d8d8',
	},
	bannerWide: {
		width: 143,
	},
	categoriesRow: {
		paddingHorizontal: 15,
		gap: 11,
		paddingVertical: 12,
		alignItems: 'center',
	},
	categoryFilter: {
		width: 60,
		height: 44,
		backgroundColor: colors.green,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	category: {
		backgroundColor: colors.green,
		paddingHorizontal: 15,
		height: 44,
		justifyContent: 'center',
		borderRadius: 24,
	},
	categoryText: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 17,
	},

	scrollContent: {
		paddingBottom: 10,
	},
	searchResults: {
		paddingHorizontal: 18,
		marginBottom: 14,
	},
	searchCategories: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 8,
	},
	noSearchResults: {
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 13,
		marginHorizontal: 18,
		marginTop: 14,
	},
	section: {
		marginTop: 2,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		marginBottom: 6,
	},
	sectionTitle: {
		color: colors.ink,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 14,
	},
	seeAll: {
		color: '#656f6c',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 9,
	},
	productsRow: {
		gap: 7,
		paddingHorizontal: 18,
		paddingBottom: 10,
	},
	productCard: {
		width: 145,
		minHeight: 180,
		padding: 7,
		backgroundColor: colors.white,
		borderRadius: 25,
	},
	productImage: {
		height: 61,
		backgroundColor: '#f7f7f7',
		borderRadius: 7,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	discount: {
		position: 'absolute',
		left: 2,
		top: 3,
		backgroundColor: '#ff3036',
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 6,
		paddingHorizontal: 3,
		borderRadius: 3,
	},
	heart: {
		position: 'absolute',
		right: 3,
		top: 2,
		color: colors.green,
		backgroundColor: '#d7ece4',
		borderRadius: 8,
		fontSize: 11,
		width: 13,
		height: 13,
		lineHeight: 12,
		textAlign: 'center',
	},
	productEmoji: {
		fontSize: 39,
	},
	productName: {
		color: colors.green,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 10,
		marginTop: 4,
	},
	weight: {
		color: '#7e8985',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 7,
	},
	price: {
		color: colors.green,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 12,
		marginTop: 1,
	},
	addButton: {
		height: 15,
		borderRadius: 8,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
	},
	addButtonText: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 6,
	},

	tabBar: {
		height: 56,
		borderTopWidth: 1,
		borderTopColor: '#d7dddd',
		backgroundColor: colors.white,
		flexDirection: 'row',
		justifyContent: 'space-around',
		paddingTop: 5,
	},
	tab: {
		alignItems: 'center',
		width: 55,
	},
	tabIcon: {
		height: 27,
		justifyContent: 'center',
	},
	activeTabIcon: {
		width: 24,
		height: 24,
		borderRadius: 6,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: {
		color: '#7a8381',
		fontSize: 20,
	},
	activeIconText: {
		color: colors.white,
		fontSize: 20,
		lineHeight: 22,
	},
	tabLabel: {
		color: '#7a8381',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 8,
		marginTop: 2,
	},
	activeTabLabel: {
		color: colors.green,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 8,
		marginTop: 2,
	},
});