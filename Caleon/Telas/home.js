import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
	Alert,
	FlatList,
	Image,
	Modal,
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
import Feather from '@expo/vector-icons/Feather';
import { auth } from '../Config/FireBaseConfig';
import { formatCurrency, formatWeight, getProductPrice, PRODUCTS } from '../Config/Produtos';
import { addProductToCart, getFavorites, toggleFavorite } from '../Config/ProdutoStorage';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import useSacolaCount, { publishSacolaCount } from '../Componentes/useSacolaCount';

const colors = {
	green: '#1B4B3D',
	ink: '#111715',
	muted: '#75807c',
	surface: '#f5f7f7',
	white: '#ffffff',
};

const products = PRODUCTS.map((product) => ({
	...product,
	price: formatCurrency(getProductPrice(product, product.defaultWeightGrams)),
	weight: formatWeight(product.defaultWeightGrams),
	discount: product.originalPricePerKg
		? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
		: null,
}));

const categories = ['Hortifruti', 'Carnes', 'Bebidas', 'Laticínios', 'Limpeza'];

function normalizeSearchText(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase()
		.trim();
}

function capitalizeFirstLetter(value) {
	return value.replace(/^./u, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function formatCep(value) {
	const digits = value.replace(/\D/g, '').slice(0, 8);
	return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function ProductCard({ product, width, onOpen, onAddToBag, onToggleFavorite, isFavorite }) {
	const scale = width / 145;

	return (
		<View style={[styles.productCard, {
			width,
			minHeight: 180 * scale,
			padding: 7 * scale,
			borderRadius: 25 * scale,
		}]}>
			<TouchableOpacity style={styles.productMain} onPress={onOpen} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${product.name}`}>
				<View style={[styles.productImage, {
					height: 61 * scale,
					borderRadius: 7 * scale,
				}]}>
					{product.discount ? <Text style={[styles.discount, {
						left: 2 * scale,
						top: 3 * scale,
						fontSize: 6 * scale,
						paddingHorizontal: 3 * scale,
						borderRadius: 3 * scale,
					}]}>{product.discount}</Text> : null}
					<Image source={{ uri: product.imageUrl }} style={styles.productImageContent} resizeMode="contain" />
					<TouchableOpacity
						style={[styles.heartButton, isFavorite && styles.heartButtonActive]}
						onPress={(event) => { event.stopPropagation(); onToggleFavorite(product.id); }}
						accessibilityRole="button"
						accessibilityLabel={`${isFavorite ? 'Remover' : 'Adicionar'} ${product.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
					>
						<MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={12 * scale} color={isFavorite ? '#FF0000' : colors.green} />
					</TouchableOpacity>
				</View>
				<Text style={[styles.productName, { fontSize: 10 * scale, marginTop: 4 * scale }]} numberOfLines={1}>
					{product.name} <Text style={[styles.weight, { fontSize: 7 * scale }]}>{product.weight}</Text>
				</Text>
				<Text style={[styles.price, { fontSize: 12 * scale, marginTop: 1 * scale }]}>{product.price}</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.addButton, {
					height: 15 * scale,
					borderRadius: 8 * scale,
					marginTop: 4 * scale,
				}]}
				activeOpacity={0.8}
				onPress={() => onAddToBag(product)}
			>
				<Text style={[styles.addButtonText, { fontSize: 6 * scale }]}>＋ Adicionar à sacola</Text>
			</TouchableOpacity>
		</View>
	);
}

function ProductSection({ title, products: sectionProducts, cardWidth, navigation, favoriteIds, onToggleFavorite, onAddToBag }) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
				<TouchableOpacity>
					<Text style={styles.seeAll}>Ver mais ›</Text>
				</TouchableOpacity>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
				{sectionProducts.map((product) => (
					<ProductCard
						product={product}
						width={cardWidth}
						onOpen={() => navigation.navigate('TelaDetalheProduto', { productId: product.id })}
						onAddToBag={onAddToBag}
						onToggleFavorite={onToggleFavorite}
						isFavorite={favoriteIds.includes(product.id)}
						key={`${title}-${product.id}`}
					/>
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
						<MaterialCommunityIcons name="shopping-outline" size={25} color="white" />
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
				<NavegacaoInferior
					activeTab="Catálogo"
					navigation={navigation}
					onUnavailable={unavailable}
				/>
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
});

export default function Home({ navigation }) {
	const { width: windowWidth } = useWindowDimensions();
	const productCardWidth = windowWidth * 0.335;
	const bagCount = useSacolaCount();
	const [fontsLoaded] = useFonts({
		Lalezar_400Regular: require('@expo-google-fonts/lalezar/400Regular/Lalezar_400Regular.ttf'),
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [userName, setUserName] = useState('usuário');
	const [cep, setCep] = useState('61760-640');
	const [cepDraft, setCepDraft] = useState('61760-640');
	const [isCepModalVisible, setIsCepModalVisible] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [favoriteIds, setFavoriteIds] = useState([]);
	const normalizedSearchText = normalizeSearchText(searchText);
	const isSearching = normalizedSearchText.length > 0;
	const matchingProducts = isSearching
		? products.filter((product) => normalizeSearchText(product.name).includes(normalizedSearchText))
		: products;
	const matchingCategories = isSearching
		? categories.filter((category) => normalizeSearchText(category).includes(normalizedSearchText))
		: [];

	useEffect(() => onAuthStateChanged(auth, (user) => {
		const displayName = user?.displayName?.trim() || 'usuário';
		setUserName(capitalizeFirstLetter(displayName));
	}), []);

	useEffect(() => {
		let active = true;
		async function loadFavorites() {
			const ids = await getFavorites();
			if (active) setFavoriteIds(ids);
		}
		loadFavorites();
		const unsubscribe = navigation.addListener('focus', loadFavorites);
		return () => {
			active = false;
			unsubscribe();
		};
	}, [navigation]);

	if (!fontsLoaded) return null;

	async function handleSignOut() {
		try {
			await signOut(auth);
			navigation.replace('TelaLogin');
		} catch {
			Alert.alert('Sair', 'Não foi possível encerrar sua sessão. Tente novamente.');
		}
	}

	async function handleAddToBag(product) {
		try {
			const nextItems = await addProductToCart(product, product.defaultWeightGrams);
			publishSacolaCount(nextItems);
			navigation.navigate('TelaSacola');
		} catch (error) {
			console.error('Erro ao adicionar item na sacola:', error);
			Alert.alert('Sacola', 'Não foi possível adicionar o produto à sacola.');
		}
	}

	async function handleToggleFavorite(productId) {
		try {
			const result = await toggleFavorite(productId);
			setFavoriteIds(result.favoriteIds);
		} catch {
			Alert.alert('Favoritos', 'Não foi possível atualizar seus favoritos.');
		}
	}

	function openCepEditor() {
		setCepDraft(cep);
		setIsCepModalVisible(true);
	}

	function saveCep() {
		const formattedCep = formatCep(cepDraft);
		if (formattedCep.replace(/\D/g, '').length !== 8) {
			Alert.alert('CEP inválido', 'Informe os 8 números do CEP.');
			return;
		}

		setCep(formattedCep);
		setIsCepModalVisible(false);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.locationIcon}>
					<Feather name="map-pin" size={40} color="white" />
				</View>
				<View style={styles.locationText}>
					<Text style={styles.greeting} numberOfLines={1}>Olá, {userName}</Text>
					<Text style={styles.address} numberOfLines={1}>
						{capitalizeFirstLetter('R. Joaquim Nabuco, 131 - Fátima')}
					</Text>
					<View style={styles.cepRow}>
						<Text style={styles.cep}>{cep}</Text>
						<TouchableOpacity
							style={styles.editCepButton}
							onPress={openCepEditor}
							accessibilityRole="button"
							accessibilityLabel="Alterar CEP"
						>
							<Feather name="edit-2" size={13} color={colors.white} />
						</TouchableOpacity>
					</View>
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
				<TouchableOpacity
					style={styles.bagButton}
					onPress={() => navigation.navigate('TelaSacola')}
					accessibilityRole="button"
					accessibilityLabel={`Sacola, ${bagCount} ${bagCount === 1 ? 'produto' : 'produtos'}`}
				>
					<MaterialCommunityIcons name="shopping-outline" size={40} color="white" />
					{bagCount > 0 && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{bagCount > 99 ? '99+' : bagCount}</Text>
						</View>
					)}
				</TouchableOpacity>
			</View>

			<Modal
				visible={isCepModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsCepModalVisible(false)}
			>
				<View style={styles.modalBackdrop}>
					<View style={styles.cepModal}>
						<Text style={styles.cepModalTitle}>Alterar CEP</Text>
						<TextInput
							style={styles.cepInput}
							value={cepDraft}
							onChangeText={(value) => setCepDraft(formatCep(value))}
							placeholder="00000-000"
							placeholderTextColor={colors.muted}
							keyboardType="number-pad"
							maxLength={9}
							accessibilityLabel="Novo CEP"
						/>
						<View style={styles.cepModalActions}>
							<TouchableOpacity
								style={[styles.cepModalButton, styles.cancelCepButton]}
								onPress={() => setIsCepModalVisible(false)}
							>
								<Text style={styles.cancelCepText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.cepModalButton, styles.saveCepButton]}
								onPress={saveCep}
							>
								<Text style={styles.saveCepText}>Salvar</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

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
								<Feather name="sliders" size={17} color={colors.white} />
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
									navigation={navigation}
									favoriteIds={favoriteIds}
									onToggleFavorite={handleToggleFavorite}
									onAddToBag={handleAddToBag}
								/>
							)}
							{matchingCategories.length === 0 && matchingProducts.length === 0 && (
								<Text style={styles.noSearchResults}>Nenhum produto ou categoria encontrado.</Text>
							)}
						</>
					) : (
						<>
							<ProductSection title="Em Destaque" products={products} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} onAddToBag={handleAddToBag} />
							<ProductSection title="Em Promoção" products={products} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} onAddToBag={handleAddToBag} />
							<ProductSection title="Produtos" products={products} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} onAddToBag={handleAddToBag} />
						</>
					)}
				</ScrollView>
			</View>

			<NavegacaoInferior activeTab="Início" navigation={navigation} />
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
		height: 122,
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	locationIcon: {
		width: 60,
		height: 60,
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
		fontFamily: 'Lalezar_400Regular',
		fontSize: 21,
		lineHeight: 26,
	},
	address: {
		color: colors.white,
		fontFamily: 'Lalezar_400Regular',
		fontSize: 18,
		lineHeight: 23,
	},
	cep: {
		color: '#9dc6b7',
		fontFamily: 'Lalezar_400Regular',
		fontSize: 16,
		lineHeight: 21,
	},
	cepRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
	},
	editCepButton: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bagButton: {
		width: 60,
		height: 60,
		borderRadius: 9,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutButton: {
		height: 40,
		paddingHorizontal: 12,
		marginLeft: 10,
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
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.45)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	cepModal: {
		width: '100%',
		maxWidth: 360,
		padding: 20,
		borderRadius: 18,
		backgroundColor: colors.white,
	},
	cepModalTitle: {
		color: colors.ink,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 22,
		marginBottom: 14,
	},
	cepInput: {
		height: 48,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: '#cbd2cf',
		borderRadius: 10,
		color: colors.ink,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 16,
	},
	cepModalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 16,
	},
	cepModalButton: {
		minWidth: 90,
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelCepButton: {
		backgroundColor: '#e7ecea',
	},
	saveCepButton: {
		backgroundColor: colors.green,
	},
	cancelCepText: {
		color: colors.ink,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 13,
	},
	saveCepText: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	badge: {
		position: 'absolute',
		right: -6,
		top: -6,
		backgroundColor: '#ff3f44',
		borderRadius: 12,
		minWidth: 24,
		height: 24,
		paddingHorizontal: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 11,
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
		gap: 9,
		paddingVertical: 10,
		alignItems: 'center',
	},
	categoryFilter: {
		width: 50,
		height: 36,
		backgroundColor: colors.green,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	category: {
		backgroundColor: colors.green,
		paddingHorizontal: 12,
		height: 36,
		justifyContent: 'center',
		borderRadius: 20,
	},
	categoryText: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 14,
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
	productMain: {
		flex: 1,
	},
	productImage: {
		height: 61,
		backgroundColor: '#f7f7f7',
		borderRadius: 7,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	productImageContent: {
		width: '68%',
		height: '100%',
	},
	heartButton: {
		position: 'absolute',
		right: 3,
		top: 3,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#d7ece4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	heartButtonActive: {
		backgroundColor: '#ffe9e9',
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

});