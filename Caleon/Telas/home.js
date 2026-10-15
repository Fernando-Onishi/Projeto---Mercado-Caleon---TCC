import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	Alert,
	Animated,
	FlatList,
	Image,
	Modal,
	PanResponder,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	StatusBar,
	Text,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	useWindowDimensions,
	View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { auth } from '../Config/FireBaseConfig';
import BotaoSacola from '../Componentes/BotaoSacola';
import { getProfileStorageKey } from '../Config/PerfilStorage';
import { formatCurrency, formatWeight, getProductPrice, PRODUCTS } from '../Config/Produtos';
import {
	addProductToCart,
	getCartProductIds,
	getFavorites,
	removeProductFromCart,
	toggleFavorite,
} from '../Config/ProdutoStorage';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';

const colors = {
	green: '#1B4B3D',
	lightGreen: '#00AA6A',
	red: '#FF383C',
	ink: '#111715',
	muted: '#75807c',
	surface: '#f5f7f7',
	white: '#ffffff',
};

const FILTER_SHEET_HEIGHT_RATIO = 0.57;

const products = PRODUCTS.map((product) => ({
	...product,
	price: formatCurrency(getProductPrice(product, product.defaultWeightGrams)),
	originalPrice: product.originalPricePerKg
		? formatCurrency(getProductPrice(
			{ ...product, pricePerKg: product.originalPricePerKg },
			product.defaultWeightGrams,
		))
		: null,
	weight: formatWeight(product.defaultWeightGrams),
	discount: product.originalPricePerKg
		? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
		: null,
}));

const categories = [
	'HortiFruti',
	'Carnes',
	'Bebidas',
	'Laticínios',
	'Doces',
	'Congelados',
	'Higiene',
	'Padaria',
	'Limpeza',
];

const filterOptions = [
	{ name: 'Horti-Fruti', category: 'HortiFruti', icon: 'food-apple-outline' },
	{ name: 'Carnes', category: 'Carnes', icon: 'food-steak' },
	{ name: 'Bebidas', category: 'Bebidas', icon: 'cup-outline' },
	{ name: 'Laticínios', category: 'Laticínios', icon: 'cheese' },
	{ name: 'Doces', category: 'Doces', icon: 'candy-outline' },
	{ name: 'Congelados', category: 'Congelados', icon: 'snowflake' },
	{ name: 'Higiene', category: 'Higiene', icon: 'hand-wash' },
	{ name: 'Padaria', category: 'Padaria', icon: 'bread-slice' },
	{ name: 'Limpeza', category: 'Limpeza', icon: 'spray-bottle' },
	{ name: 'Preço', type: 'price', icon: 'sort-ascending' },
];

function normalizeSearchText(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.trim();
}

function capitalizeFirstLetter(value) {
	return value.replace(/^./u, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function formatCep(value) {
	const digits = value.replace(/\D/g, '').slice(0, 8);
	return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

function ProductCard({ product, width, onOpen, onToggleCart, onToggleFavorite, isFavorite, isInCart }) {
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
						<MaterialCommunityIcons
							name={isFavorite ? 'heart' : 'heart-outline'}
							size={12 * scale}
							color={isFavorite ? colors.white : '#7A8581'}
						/>
					</TouchableOpacity>
				</View>
				<Text style={[styles.productName, { fontSize: 10 * scale, marginTop: 4 * scale }]} numberOfLines={1}>
					{product.name} <Text style={[styles.weight, { fontSize: 7 * scale }]}>{product.weight}</Text>
				</Text>
				<View style={styles.priceRow}>
					<Text style={[styles.price, { fontSize: 12 * scale, marginTop: 1 * scale }]}>{product.price}</Text>
					{product.originalPrice ? (
						<Text style={[styles.originalPrice, { fontSize: 7 * scale }]}>
							{product.originalPrice}
						</Text>
					) : null}
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.addButton, isInCart && styles.addedButton, {
					height: 15 * scale,
					borderRadius: 8 * scale,
					marginTop: 4 * scale,
				}]}
				activeOpacity={0.8}
				onPress={() => onToggleCart(product, isInCart)}
				accessibilityRole="button"
				accessibilityLabel={`${product.name}, ${isInCart ? 'remover da' : 'adicionar à'} sacola`}
			>
				<MaterialCommunityIcons name={isInCart ? 'shopping' : 'shopping-outline'} size={9 * scale} color={colors.white} />
				<Text style={[styles.addButtonText, { fontSize: 6 * scale }]}>
					{isInCart ? 'Adicionado' : 'Adicionar à sacola'}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

function ProductSection({ title, products: sectionProducts, cardWidth, navigation, favoriteIds, cartProductIds, onToggleFavorite, onToggleCart }) {
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
						onToggleCart={onToggleCart}
						onToggleFavorite={onToggleFavorite}
						isFavorite={favoriteIds.includes(product.id)}
						isInCart={cartProductIds.includes(product.id)}
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
						<Feather name="chevron-left" size={27} color="white" />
					</TouchableOpacity>
					<Text style={catalogStyles.title}>Produtos</Text>
					<BotaoSacola navigation={navigation} />
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
	screen: { flex: 1, marginTop: -1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F1F3F5', overflow: 'hidden' },
	header: { height: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#40B190' },
	title: { position: 'absolute', left: 56, right: 56, textAlign: 'center', color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 30 },
	list: { flex: 1 },
	grid: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22, gap: 48 },
	row: { justifyContent: 'space-between', gap: 18 },
	card: { padding: 9, alignItems: 'center', justifyContent: 'space-between', borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D6D4', backgroundColor: colors.white, shadowColor: '#525A57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
	image: { width: '100%', flex: 1, borderRadius: 9 },
	categoryName: { marginTop: 7, color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 18, textAlign: 'center' },
});

export default function Home({ navigation }) {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const productCardWidth = windowWidth * 0.335;
	const [fontsLoaded] = useFonts({
		Lalezar_400Regular: require('@expo-google-fonts/lalezar/400Regular/Lalezar_400Regular.ttf'),
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [userName, setUserName] = useState('usuário');
	const [address, setAddress] = useState('');
	const [addressDraft, setAddressDraft] = useState('');
	const [cep, setCep] = useState('');
	const [cepDraft, setCepDraft] = useState('');
	const [isCepModalVisible, setIsCepModalVisible] = useState(false);
	const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [selectedCategories, setSelectedCategories] = useState(['HortiFruti']);
	const [priceSortDirection, setPriceSortDirection] = useState(null);
	const [favoriteIds, setFavoriteIds] = useState([]);
	const [cartProductIds, setCartProductIds] = useState([]);
	const pendingCartProductIds = useRef(new Set());
	const filterSheetTranslateY = useRef(new Animated.Value(0)).current;
	const filterSheetPanResponder = useMemo(() => PanResponder.create({
		onMoveShouldSetPanResponder: (_, gestureState) => (
			gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
		),
		onPanResponderMove: (_, gestureState) => {
			filterSheetTranslateY.setValue(Math.max(0, gestureState.dy));
		},
		onPanResponderRelease: (_, gestureState) => {
			if (gestureState.dy > 100 || (gestureState.dy > 20 && gestureState.vy > 0.7)) {
				Animated.timing(filterSheetTranslateY, {
					toValue: windowHeight,
					duration: 180,
					useNativeDriver: true,
				}).start(({ finished }) => {
					if (finished) {
						setIsFilterModalVisible(false);
						filterSheetTranslateY.setValue(0);
					}
				});
				return;
			}
			Animated.spring(filterSheetTranslateY, {
				toValue: 0,
				useNativeDriver: true,
				tension: 90,
				friction: 12,
			}).start();
		},
		onPanResponderTerminate: () => {
			Animated.spring(filterSheetTranslateY, {
				toValue: 0,
				useNativeDriver: true,
				tension: 90,
				friction: 12,
			}).start();
		},
	}), [filterSheetTranslateY, windowHeight]);
	const normalizedSearchText = normalizeSearchText(searchText);
	const isSearching = normalizedSearchText.length > 0;
	const matchingProducts = isSearching
		? products.filter((product) => normalizeSearchText(product.name).includes(normalizedSearchText))
		: products;
	const matchingCategories = isSearching
		? categories.filter((category) => normalizeSearchText(category).includes(normalizedSearchText))
		: [];

	useEffect(() => {
		let active = true;

		async function loadHeaderProfile(user) {
			try {
				const stored = JSON.parse(
					await AsyncStorage.getItem(getProfileStorageKey(user?.uid)) || '{}',
				);
				if (!active) return;
				const displayName = user?.displayName?.trim()
					|| (typeof stored.name === 'string' ? stored.name.trim() : '')
					|| 'Usuário';
				setUserName(capitalizeFirstLetter(displayName));
				setAddress(
					(typeof stored.address === 'string' ? stored.address.trim() : '')
					|| '',
				);
				setCep(formatCep(typeof stored.cep === 'string' ? stored.cep : ''));
			} catch (error) {
				console.error('Não foi possível carregar o perfil para o cabeçalho.', error);
				if (!active) return;
				setUserName(user?.displayName?.trim() || 'Usuário');
				console.error('Não foi possível carregar o endereço salvo do perfil.');
			}
		}

		const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
			loadHeaderProfile(user);
		});
		const unsubscribeFocus = navigation.addListener('focus', () => {
			loadHeaderProfile(auth.currentUser);
		});

		return () => {
			active = false;
			unsubscribeAuth();
			unsubscribeFocus();
		};
	}, [navigation]);

	useEffect(() => {
		let active = true;
		async function loadProductStates() {
			const [ids, productIds] = await Promise.all([
				getFavorites(),
				getCartProductIds(),
			]);
			if (active) {
				setFavoriteIds(ids);
				setCartProductIds(productIds);
			}
		}
		loadProductStates();
		const unsubscribe = navigation.addListener('focus', loadProductStates);
		return () => {
			active = false;
			unsubscribe();
		};
	}, [navigation]);

	if (!fontsLoaded) return null;

	function openCepEditor() {
		setAddressDraft(address);
		setCepDraft(cep);
		setIsCepModalVisible(true);
	}

	async function saveAddress() {
		const trimmedAddress = addressDraft.trim();
		const formattedCep = formatCep(cepDraft);
		const cepDigits = formattedCep.replace(/\D/g, '');

		if (!trimmedAddress) {
			Alert.alert('Endereço', 'Informe a rua e os dados do seu endereço.');
			return;
		}
		if (cepDigits.length > 0 && cepDigits.length !== 8) {
			Alert.alert('CEP inválido', 'Informe os 8 números do CEP.');
			return;
		}

		try {
			const profileKey = getProfileStorageKey(auth.currentUser?.uid);
			const stored = JSON.parse(await AsyncStorage.getItem(profileKey) || '{}');
			await AsyncStorage.setItem(profileKey, JSON.stringify({
				...stored,
				address: trimmedAddress,
				cep: formattedCep,
			}));
			setAddress(trimmedAddress);
			setCep(formattedCep);
			setIsCepModalVisible(false);
		} catch (error) {
			console.error('Não foi possível salvar o endereço do perfil.', error);
			Alert.alert('Endereço', 'Não foi possível salvar o endereço. Tente novamente.');
		}
	}

	async function handleToggleCart(product, isInCart) {
		if (pendingCartProductIds.current.has(product.id)) return;
		pendingCartProductIds.current.add(product.id);

		try {
			const nextItems = isInCart
				? await removeProductFromCart(product.id)
				: await addProductToCart(product, product.defaultWeightGrams);
			setCartProductIds((currentIds) => (
				isInCart
					? currentIds.filter((id) => id !== product.id)
					: currentIds.includes(product.id) ? currentIds : [...currentIds, product.id]
			));
			publishSacolaCount(nextItems);
		} catch (error) {
			console.error('Erro ao atualizar a sacola:', error);
			Alert.alert('Sacola', `Não foi possível ${isInCart ? 'remover o produto da' : 'adicionar o produto à'} sacola.`);
		} finally {
			pendingCartProductIds.current.delete(product.id);
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

	const categoryProducts = selectedCategories.length === 0
		? products
		: products.filter((product) => selectedCategories.some(
			(category) => normalizeSearchText(product.category) === normalizeSearchText(category),
		));
	const displayedCategoryProducts = priceSortDirection
		? [...categoryProducts].sort((first, second) => {
			const priceDifference = getProductPrice(first, first.defaultWeightGrams)
				- getProductPrice(second, second.defaultWeightGrams);
			return priceSortDirection === 'ascending' ? priceDifference : -priceDifference;
		})
		: categoryProducts;

	function selectFilter(option) {
		if (option.type === 'price') {
			setPriceSortDirection((direction) => (
				direction === null
					? 'ascending'
					: direction === 'ascending'
						? 'descending'
						: null
			));
		} else {
			setSelectedCategories((currentCategories) => (
				currentCategories.some((category) => (
					normalizeSearchText(category) === normalizeSearchText(option.category)
				))
					? currentCategories.filter((category) => (
						normalizeSearchText(category) !== normalizeSearchText(option.category)
					))
					: [...currentCategories, option.category]
			));
		}
	}

	function isFilterSelected(option) {
		return option.type === 'price'
			? priceSortDirection !== null
			: selectedCategories.some((category) => (
				normalizeSearchText(category) === normalizeSearchText(option.category)
			));
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.locationIcon}
					onPress={openCepEditor}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Editar endereço e CEP"
				>
					<Feather name="map-pin" size={30} color={colors.white} />
				</TouchableOpacity>
				<View style={styles.locationText}>
					<Text style={styles.greeting} numberOfLines={1}>Olá, {userName}</Text>
					<Text style={styles.address} numberOfLines={1}>{address}</Text>
					<TouchableOpacity onPress={openCepEditor} accessibilityRole="button">
						<Text style={styles.editCep}>
							{cep || 'não cadastrado'}
						</Text>
					</TouchableOpacity>
				</View>
				<BotaoSacola navigation={navigation} />
			</View>

			<Modal
				visible={isCepModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsCepModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalBackdrop}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={styles.cepModal}>
						<Text style={styles.cepModalTitle}>Editar endereço</Text>
						<Text style={styles.cepModalDescription}>
							Atualize o endereço completo e o CEP para suas entregas.
						</Text>
						<TextInput
							style={[styles.cepInput, styles.addressInput]}
							value={addressDraft}
							onChangeText={setAddressDraft}
							placeholder="Rua, número, bairro e cidade"
							placeholderTextColor={colors.muted}
							multiline
							textAlignVertical="top"
							maxLength={180}
							accessibilityLabel="Endereço completo"
						/>
						<Text style={styles.cepFieldLabel}>CEP</Text>
						<TextInput
							style={styles.cepInput}
							value={cepDraft}
							onChangeText={(value) => setCepDraft(formatCep(value))}
							placeholder="00000-000"
							placeholderTextColor={colors.muted}
							keyboardType="number-pad"
							maxLength={9}
							accessibilityLabel="CEP do endereço"
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
								onPress={saveAddress}
							>
								<Text style={styles.saveCepText}>Salvar</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
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
							<TouchableOpacity
								style={styles.categoryFilter}
								onPress={() => setIsFilterModalVisible(true)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Abrir filtros de produtos"
							>
								<Feather name="sliders" size={17} color={colors.white} />
							</TouchableOpacity>
							{filterOptions.map((option) => (
								<TouchableOpacity
									key={option.name}
									style={[styles.category, isFilterSelected(option) && styles.selectedCategory]}
									onPress={() => selectFilter(option)}
									accessibilityRole="button"
									accessibilityState={{ selected: isFilterSelected(option) }}
								>
									<Text style={styles.categoryText}>
										{option.type === 'price'
											? `Preço ${priceSortDirection === 'ascending' ? '↑' : priceSortDirection === 'descending' ? '↓' : ''}`
											: option.name}
									</Text>
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
									cartProductIds={cartProductIds}
									onToggleFavorite={handleToggleFavorite}
									onToggleCart={handleToggleCart}
								/>
							)}
							{matchingCategories.length === 0 && matchingProducts.length === 0 && (
								<Text style={styles.noSearchResults}>Nenhum produto ou categoria encontrado.</Text>
							)}
						</>
					) : (
						<>
							{displayedCategoryProducts.length > 0 ? (
								<>
									<ProductSection title="Em Destaque" products={displayedCategoryProducts} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
									<ProductSection title="Em Promoção" products={displayedCategoryProducts.filter((product) => product.discount)} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
									<ProductSection title="Produtos" products={displayedCategoryProducts} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
								</>
							) : (
								<Text style={styles.noSearchResults}>Ainda não há produtos nesta categoria.</Text>
							)}
						</>
					)}
				</ScrollView>
			</View>

			<Modal
				visible={isFilterModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setIsFilterModalVisible(false)}
			>
				<View style={styles.filterModalOverlay}>
					<TouchableOpacity
						style={styles.filterBackdrop}
						activeOpacity={1}
						onPress={() => setIsFilterModalVisible(false)}
						accessibilityRole="button"
						accessibilityLabel="Fechar filtros"
					/>
					<Animated.View
						style={[
							styles.filterSheet,
							{
								height: windowHeight * FILTER_SHEET_HEIGHT_RATIO,
								transform: [{ translateY: filterSheetTranslateY }],
							},
						]}
					>
						<View
							style={styles.filterHandleArea}
							{...filterSheetPanResponder.panHandlers}
							accessibilityRole="adjustable"
							accessibilityLabel="Arraste para baixo para fechar os filtros"
						>
							<View style={styles.filterHandle} />
						</View>
						<View style={styles.filterHeader}>
							<TouchableOpacity
								style={styles.filterCloseButton}
								onPress={() => setIsFilterModalVisible(false)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Fechar filtros"
							>
								<Feather name="x" size={16} color={colors.white} />
							</TouchableOpacity>
							<Text style={styles.filterTitle}>Filtros</Text>
							<View style={styles.filterHeaderSpacer} />
						</View>
						<FlatList
							data={filterOptions}
							numColumns={2}
							keyExtractor={(item) => item.name}
							columnWrapperStyle={styles.filterGridRow}
							contentContainerStyle={styles.filterGrid}
							showsVerticalScrollIndicator={false}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.filterOption,
										isFilterSelected(item) && styles.filterOptionSelected,
									]}
									onPress={() => selectFilter(item)}
									activeOpacity={0.8}
									accessibilityRole="button"
									accessibilityState={{ selected: isFilterSelected(item) }}
									accessibilityLabel={`Filtrar por ${item.name}`}
								>
									<MaterialCommunityIcons
										name={item.type === 'price' && priceSortDirection === 'descending'
											? 'sort-descending'
											: item.icon}
										size={34}
										color={colors.green}
									/>
									<Text style={styles.filterOptionText} numberOfLines={1}>
										{item.type === 'price'
											? `Preço ${priceSortDirection === 'ascending' ? '↑' : priceSortDirection === 'descending' ? '↓' : ''}`
											: item.name}
									</Text>
									{isFilterSelected(item) ? (
										<MaterialCommunityIcons
											name="check-circle"
											size={18}
											color={colors.lightGreen}
										/>
									) : null}
								</TouchableOpacity>
							)}
						/>
					</Animated.View>
				</View>
			</Modal>

			<NavegacaoInferior activeTab="Início" navigation={navigation} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#194B38',
	},
	contentArea: {
		flex: 1,
		marginTop: -36,
		paddingTop: 26,
		backgroundColor: '#F1F3F5',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		zIndex: 1,
		elevation: 2,
	},

	header: {
		height: 140,
		backgroundColor: '#194B38',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 30,
		zIndex: 0,
	},
	locationIcon: {
		width: 50,
		height: 50,
		borderRadius: 16,
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
		fontFamily: 'Montserrat_700Bold',
		fontSize: 19,
		lineHeight: 24,
	},
	address: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 14,
		lineHeight: 18,
	},
	editCep: {
		color: '#35D59A',
		fontFamily: 'Montserrat_500Medium',
		fontSize: 12,
		lineHeight: 16,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.48)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	cepModal: {
		width: '100%',
		maxWidth: 380,
		padding: 22,
		borderRadius: 20,
		backgroundColor: colors.white,
	},
	cepModalTitle: {
		color: colors.ink,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 20,
	},
	cepModalDescription: {
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 13,
		marginTop: 6,
		marginBottom: 16,
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
	addressInput: {
		height: 88,
		paddingTop: 12,
		marginBottom: 14,
	},
	cepFieldLabel: {
		color: colors.ink,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 12,
		marginBottom: 6,
	},
	cepModalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 18,
	},
	cepModalButton: {
		minWidth: 96,
		height: 42,
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

	searchBox: {
		height: 43,
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
	filterModalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	filterBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	filterSheet: {
		width: '100%',
		paddingTop: 10,
		paddingHorizontal: 16,
		paddingBottom: 10,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		backgroundColor: '#F1F3F5',
	},
	filterHandle: {
		width: 44,
		height: 5,
		borderRadius: 3,
		backgroundColor: '#7A8581',
	},
	filterHandleArea: {
		height: 22,
		alignItems: 'center',
		justifyContent: 'flex-start',
		marginBottom: 2,
	},
	filterHeader: {
		minHeight: 42,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	filterCloseButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.red,
	},
	filterHeaderSpacer: {
		width: 34,
		height: 34,
	},
	filterTitle: {
		color: colors.ink,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 22,
	},
	filterGrid: {
		paddingBottom: 8,
	},
	filterGridRow: {
		gap: 10,
		marginBottom: 10,
	},
	filterOption: {
		flex: 1,
		minHeight: 78,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 14,
		backgroundColor: colors.white,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	filterOptionSelected: {
		borderWidth: 1.5,
		borderColor: colors.lightGreen,
		backgroundColor: '#FFFFFF',
	},
	filterOptionText: {
		flex: 1,
		color: colors.ink,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	category: {
		backgroundColor: colors.green,
		paddingHorizontal: 12,
		height: 36,
		justifyContent: 'center',
		borderRadius: 20,
	},
	selectedCategory: {
		backgroundColor: '#40B190',
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
		backgroundColor: '#FFFFFF',
		borderRadius: 25,
	},
	productMain: {
		flex: 1,
	},
	productImage: {
		height: 61,
		backgroundColor: '#FFFFFF',
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
		backgroundColor: colors.red,
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
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	originalPrice: {
		color: '#9aa39f',
		fontFamily: 'Montserrat_400Regular',
		textDecorationLine: 'line-through',
		marginTop: 1,
	},
	addButton: {
		height: 15,
		borderRadius: 8,
		backgroundColor: colors.green,
		flexDirection: 'row',
		borderWidth: 1,
		borderColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
		marginTop: 4,
	},
	addedButton: {
		backgroundColor: colors.lightGreen,
		borderColor: '#2E9BFF',
	},
	addButtonText: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 6,
	},

});