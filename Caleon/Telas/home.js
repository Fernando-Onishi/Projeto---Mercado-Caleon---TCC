import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { onAuthStateChanged } from 'firebase/auth';
import {
	Alert,
	Animated,
	FlatList,
	Image,
	Modal,
	PanResponder,
	ScrollView,
	StyleSheet,
	StatusBar,
	Text,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Linking,
	useWindowDimensions,
	View,
	DeviceEventEmitter,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';
import CardProduto from '../Componentes/CardProduto';
import LinkVerMais from '../Componentes/LinkVerMais';
import CarrosselOfertas from '../Componentes/CarrosselOfertas';
import CarrosselModal from '../Componentes/CarrosselModal';
import { FotoMeuPerfil, useMeuPerfil } from '../Componentes/MeuPerfil';
import { subscribeActiveBanners } from '../Config/Banners';
import BotaoNotificacoesCliente from '../Componentes/BotaoNotificacoesCliente';
import { loadProfileData, saveProfileData, subscribeProfileData } from '../Config/PerfilStorage';
import { isCatalogSeeded } from '../Config/CatalogoFirebase';
import { formatCurrency, formatProductUnit, getProductPrice, productImageFor, productName, PRODUCTS } from '../Config/Produtos';
import {
	addProductToCart,
	getCartProductIds,
	CART_CHANGED_EVENT,
	FAVORITES_CHANGED_EVENT,
	getFavorites,
	removeProductFromCart,
	toggleFavorite,
} from '../Config/ProdutoStorage';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import CircularIconButton from '../Componentes/CircularIconButton';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import { getUserRole } from '../src/utils/getUserRole';
import { themedStyles, tc } from '../Config/Tema';

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

const initialProducts = PRODUCTS.map((product) => ({
	...product,
	price: formatCurrency(getProductPrice(product, product.defaultWeightGrams)),
	originalPrice: product.originalPricePerKg
		? formatCurrency(getProductPrice(
			{ ...product, pricePerKg: product.originalPricePerKg },
			product.defaultWeightGrams,
		))
		: null,
	weight: formatProductUnit(product, product.defaultWeightGrams),
	discount: product.originalPricePerKg
		? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
		: null,
}));

function mapStoredProduct(documentSnapshot) {
	const data = documentSnapshot.data();
	const defaultWeightGrams = Number(data.defaultWeightGrams);
	const pricePerKg = Number(data.pricePerKg);
	if (data.active !== true || !data.name || !Number.isFinite(defaultWeightGrams) || defaultWeightGrams <= 0 || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return null;

	const product = {
		...data,
		id: documentSnapshot.id,
		name: productName(data.name),
		category: data.category === 'Horti-Fruti' ? 'HortiFruti' : data.category,
		imageUrl: productImageFor(documentSnapshot.id, data.imageUrl, data.imageUrls),
		pricePerKg,
		originalPricePerKg: Number(data.originalPricePerKg) > pricePerKg ? Number(data.originalPricePerKg) : null,
		averageWeightGrams: Number(data.averageWeightGrams) || defaultWeightGrams,
		defaultWeightGrams,
		availableWeights: Array.isArray(data.availableWeights) && data.availableWeights.length
			? data.availableWeights.filter((weight) => Number.isFinite(Number(weight)) && Number(weight) > 0).map(Number)
			: [defaultWeightGrams],
	};
	return {
		...product,
		price: formatCurrency(getProductPrice(product, defaultWeightGrams)),
		originalPrice: product.originalPricePerKg
			? formatCurrency(getProductPrice({ ...product, pricePerKg: product.originalPricePerKg }, defaultWeightGrams))
			: null,
		weight: formatProductUnit(product, defaultWeightGrams),
		discount: product.originalPricePerKg
			? `${Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100)}% OFF`
			: null,
	};
}

const categories = [
	'HortiFruti',
	'Carnes',
	'Bebidas',
	'Laticínios',
	'Doces',
	'Congelados',
	'Higiene',
	'Padaria',
	'Mercearia',
	'Limpeza',
];

const filterOptions = [
	{ name: 'Horti-Fruti', category: 'HortiFruti', icon: 'food-apple-outline' },
	{ name: 'Carnes', category: 'Carnes', icon: 'food-steak' },
	{ name: 'Bebidas', category: 'Bebidas', icon: 'cup-outline' },
	{ name: 'Laticínios', category: 'Laticínios', icon: 'cheese' },
	{ name: 'Limpeza', category: 'Limpeza', icon: 'spray-bottle' },
	{ name: 'Doces', category: 'Doces', icon: 'candy-outline' },
	{ name: 'Congelados', category: 'Congelados', icon: 'snowflake' },
	{ name: 'Higiene', category: 'Higiene', icon: 'hand-wash' },
	{ name: 'Padaria', category: 'Padaria', icon: 'bread-slice' },
	{ name: 'Mercearia', category: 'Mercearia', icon: 'basket-outline' },
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

function ProductSection({ title, products: sectionProducts, cardWidth, navigation, favoriteIds, cartProductIds, onToggleFavorite, onToggleCart, onSeeMore }) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={[styles.sectionTitle, ['Em Destaque', 'Em Promoção', 'Produtos'].includes(title) && styles.productSectionTitle]}>{title}</Text>
				{onSeeMore ? <LinkVerMais onPress={onSeeMore} accessibilityLabel={`Ver mais: ${title}`} /> : null}
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
				{sectionProducts.map((product) => (
					<CardProduto
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

function EmptyProductsState() {
	return (
		<View style={styles.emptyProducts}>
			<Feather name="search" size={40} color={tc('#9CA3AF')} />
			<Text style={styles.emptyProductsTitle}>Nenhum produto encontrado</Text>
			<Text style={styles.emptyProductsDescription}>
				Não há produtos disponíveis nesta categoria ou busca no momento.
			</Text>
		</View>
	);
}

function BannerSlide({ banner, width, onPress }) {
	const [aspectRatio, setAspectRatio] = useState(3);
	const imageHeight = Math.max(120, width / aspectRatio);

	useEffect(() => {
		let active = true;
		Image.getSize(
			banner.imageUrl,
			(imageWidth, imageHeight) => {
				if (active && imageWidth > 0 && imageHeight > 0) {
					setAspectRatio(imageWidth / imageHeight);
				}
			},
			(error) => {
				console.error(`Não foi possível carregar as dimensões do banner ${banner.id}.`, error);
			},
		);
		return () => { active = false; };
	}, [banner.id, banner.imageUrl]);

	return (
		<TouchableOpacity
			style={[styles.promoBanner, { width, height: imageHeight }]}
			onPress={onPress}
			activeOpacity={banner.link || banner.categoryId ? 0.85 : 1}
			accessibilityRole="imagebutton"
			accessibilityLabel={banner.title || 'Banner promocional'}
		>
			<Image
				source={{ uri: banner.imageUrl }}
				style={styles.promoBannerImage}
				resizeMode="contain"
				onError={(error) => console.error(`Não foi possível carregar o banner ${banner.id}.`, error.nativeEvent)}
			/>
		</TouchableOpacity>
	);
}

function BannerCarousel({ banners, width, onBannerPress, isAdmin, onEditBanner, offerProducts, onOpenProduct, onSeeOffers }) {
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (activeIndex >= banners.length) setActiveIndex(Math.max(0, banners.length - 1));
	}, [activeIndex, banners.length]);

	// Sem banners cadastrados pelo admin: mostra as ofertas reais do catálogo.
	const editButton = isAdmin ? (
		<TouchableOpacity
			style={styles.editBannerButton}
			onPress={() => onEditBanner()}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="Editar carrossel de promoções"
		>
			<Feather name="edit-2" size={17} color={tc(colors.white)} />
		</TouchableOpacity>
	) : null;

	if (banners.length === 0) {
		return (
			<View style={styles.promoCarousel}>
				<CarrosselOfertas products={offerProducts || []} width={width} onOpenProduct={onOpenProduct} onSeeOffers={onSeeOffers} />
				{editButton}
			</View>
		);
	}

	return (
		<View style={styles.promoCarousel}>
			<FlatList
				data={banners}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				decelerationRate="fast"
				keyExtractor={(banner) => banner.id}
				getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
				onMomentumScrollEnd={(event) => {
					setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
				}}
				renderItem={({ item }) => (
					<BannerSlide
						banner={item}
						width={width}
						onPress={() => onBannerPress(item)}
					/>
				)}
			/>
			{editButton}
			{banners.length > 1 ? (
				<View style={styles.promoDots} accessibilityLabel={`Banner ${activeIndex + 1} de ${banners.length}`}>
					{banners.map((banner, index) => (
						<View
							key={banner.id}
							style={[styles.promoDot, index === activeIndex && styles.promoDotActive]}
						/>
					))}
				</View>
			) : null}
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
		<SafeAreaScreen style={catalogStyles.safeArea}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<View style={catalogStyles.topBand} />
			<View style={catalogStyles.screen}>
				<View style={catalogStyles.header}>
					<CircularIconButton
						style={catalogStyles.backButton}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color={tc('white')} />}
						onPress={() => {
							if (navigation.canGoBack()) navigation.goBack();
							else navigation.navigate('TelaHome');
						}}
						accessibilityLabel="Voltar"
					/>
					<Text style={catalogStyles.title}>Produtos</Text>
					<BotaoNotificacoesCliente navigation={navigation} size={40} />
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
		</SafeAreaScreen>
	);
}

const catalogStyles = themedStyles(StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.green },
	topBand: { height: 40, backgroundColor: colors.green },
	screen: { flex: 1, marginTop: -1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F1F3F5', overflow: 'hidden' },
	header: { height: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#40B190' },
	title: { position: 'absolute', left: 56, right: 56, textAlign: 'center', color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 30 },
	list: { flex: 1 },
	grid: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22, gap: 48 },
	row: { justifyContent: 'space-between', gap: 18 },
	card: { padding: 9, alignItems: 'center', justifyContent: 'space-between', borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D6D4', backgroundColor: colors.white, shadowColor: '#525A57', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
	image: { width: '100%', flex: 1, borderRadius: 9 },
	categoryName: { marginTop: 7, color: colors.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 18, textAlign: 'center' },
}));

export default function Home({ navigation, route }) {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const meuPerfil = useMeuPerfil();
	// Cards proporcionais à tela: cerca de 2 cards visíveis por vez (o pedaço do próximo indica que dá para rolar).
	const productCardWidth = Math.round(Math.min(200, Math.max(165, (windowWidth - 36) / 2.05)));
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
	// Começa sem filtro: a Home mostra todos os produtos; o cliente filtra por categoria se quiser.
	const [selectedCategories, setSelectedCategories] = useState([]);

	// "Ver mais": abre a lista completa. Com uma categoria escolhida, só ela; senão, todos os produtos.
	function openSeeMore(onlyPromo) {
		const single = selectedCategories.length === 1
			? filterOptions.find((option) => option.category === selectedCategories[0])
			: null;
		navigation.navigate('ProdutosCategoriaScreen', single
			? { categoria: single.name, promocao: onlyPromo }
			: { todos: true, promocao: onlyPromo });
	}
	const [priceSortDirection, setPriceSortDirection] = useState(null);
	const [promoBanners, setPromoBanners] = useState([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [carouselEditorVisible, setCarouselEditorVisible] = useState(false);
	const [products, setProducts] = useState(initialProducts);
	const [favoriteIds, setFavoriteIds] = useState([]);
	const [cartProductIds, setCartProductIds] = useState([]);

	// Favoritos/sacola mudaram em outra tela ou em outro aparelho: coração e sacola atualizam na hora.
	useEffect(() => {
		const favoritesSubscription = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, (ids) => setFavoriteIds(ids));
		const cartSubscription = DeviceEventEmitter.addListener(CART_CHANGED_EVENT, (items) => {
			setCartProductIds([...new Set(items.map((item) => item.productId).filter(Boolean))]);
		});
		return () => {
			favoritesSubscription.remove();
			cartSubscription.remove();
		};
	}, []);
	const pendingCartProductIds = useRef(new Set());
	const filterSheetTranslateY = useRef(new Animated.Value(0)).current;
	const promoBannerWidth = Math.max(0, windowWidth - 36);

	useEffect(() => {
		if (route?.params?.categoria) {
			setSelectedCategories([route.params.categoria]);
		}
	}, [route?.params?.categoria]);

	useEffect(() => {
		return subscribeActiveBanners(
			setPromoBanners,
			(error) => {
				console.error('Não foi possível carregar os banners promocionais.', error);
			},
		);
	}, []);

	useEffect(() => {
		let active = true;
		let latestRoleRequest = 0;
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			const request = ++latestRoleRequest;
			if (!user) {
				if (active) setIsAdmin(false);
				return;
			}
			try {
				const role = await getUserRole(user);
				if (active && request === latestRoleRequest) setIsAdmin(role === 'admin');
			} catch (error) {
				console.error('Não foi possível verificar o papel do usuário na Home.', error);
				if (active && request === latestRoleRequest) setIsAdmin(false);
			}
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	useEffect(() => onSnapshot(
		collection(db, 'products'),
		(snapshot) => {
			// Depois que o admin enviou o catálogo ao Firebase, só vale o que está no Firestore (sincronizado entre aparelhos).
			const mergedProducts = new Map(isCatalogSeeded(snapshot.docs) ? [] : initialProducts.map((product) => [product.id, product]));
			snapshot.docs.forEach((productDocument) => {
				if (productDocument.data().active === false) {
					mergedProducts.delete(productDocument.id);
					return;
				}
				const product = mapStoredProduct(productDocument);
				if (product) mergedProducts.set(product.id, product);
			});
			setProducts([...mergedProducts.values()]);
		},
		(error) => console.error('Não foi possível carregar os produtos cadastrados.', error),
	), []);
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
				// Endereço e CEP da conta (Firebase), iguais em qualquer celular.
				const stored = await loadProfileData(user?.uid);
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

		// Endereço/CEP mudaram em outro aparelho (ou no Perfil): o cabeçalho atualiza sozinho.
		let stopProfile = () => {};
		const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
			loadHeaderProfile(user);
			stopProfile();
			stopProfile = subscribeProfileData(user?.uid, () => loadHeaderProfile(auth.currentUser));
		});
		const unsubscribeFocus = navigation.addListener('focus', () => {
			loadHeaderProfile(auth.currentUser);
		});

		return () => {
			active = false;
			unsubscribeAuth();
			unsubscribeFocus();
			stopProfile();
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
			showGlobalNotification('Informe a rua e os dados do seu endereço.');
			return;
		}
		if (cepDigits.length > 0 && cepDigits.length !== 8) {
			showGlobalNotification('Informe os 8 números do CEP.');
			return;
		}

		try {
			await saveProfileData(auth.currentUser?.uid, {
				address: trimmedAddress,
				cep: formattedCep,
			});
			setAddress(trimmedAddress);
			setCep(formattedCep);
			setIsCepModalVisible(false);
		} catch (error) {
			console.error('Não foi possível salvar o endereço do perfil.', error);
			showGlobalNotification('Não foi possível salvar o endereço. Tente novamente.');
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
			showGlobalNotification(
				isInCart
					? `${product.name} removido da sacola`
					: `${product.name} adicionado à sacola`
			);
		} catch (error) {
			console.error('Erro ao atualizar a sacola:', error);
			showGlobalNotification(`Não foi possível ${isInCart ? 'remover o produto da' : 'adicionar o produto à'} sacola.`);
		} finally {
			pendingCartProductIds.current.delete(product.id);
		}
	}

	async function handleToggleFavorite(productId) {
		try {
			const result = await toggleFavorite(productId);
			setFavoriteIds(result.favoriteIds);
			const product = products.find((item) => item.id === productId);
			if (product) {
				showGlobalNotification(
					result.isFavorite
						? `${product.name} salvo nos favoritos`
						: `${product.name} removido dos favoritos`
				);
			}
		} catch {
			showGlobalNotification('Não foi possível atualizar seus favoritos.');
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

	function handleBannerPress(banner) {
		if (banner.target === 'ofertas') {
			navigation.navigate('ProdutosCategoriaScreen', { todos: true, promocao: true });
			return;
		}
		const productId = banner.productId || banner.produtoId || banner.link;
		const matchingProduct = products.find((product) => String(product.id) === String(productId));
		if (matchingProduct) {
			navigation.navigate('TelaDetalheProduto', { productId: matchingProduct.id });
			return;
		}

		if (banner.categoryId) {
			const matchingCategory = categories.find((category) => (
				normalizeSearchText(category) === normalizeSearchText(String(banner.categoryId))
			));
			if (matchingCategory) {
				setSelectedCategories([matchingCategory]);
				return;
			}
		}

		if (typeof banner.link === 'string' && /^https?:\/\//i.test(banner.link)) {
			Linking.openURL(banner.link).catch((error) => {
				console.error('Não foi possível abrir o link do banner.', error);
				showGlobalNotification('Não foi possível abrir o link.');
			});
		}
	}

	return (
		<SafeAreaScreen style={styles.safeArea} edges={[]}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<ScrollView
				style={styles.screenScroll}
				contentContainerStyle={styles.screenScrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Mesma altura do cabeçalho do painel admin: barra de status + 72. */}
				<View style={[styles.header, { paddingTop: insets.top }]}>
					<TouchableOpacity
						style={styles.locationIcon}
						onPress={() => navigation.navigate('TelaPerfil')}
						activeOpacity={0.8}
						accessibilityRole="button"
						accessibilityLabel="Abrir meu perfil"
					>
						<FotoMeuPerfil photo={meuPerfil.photo} size={40} />
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
					<View style={styles.headerActions}>
						<BotaoNotificacoesCliente navigation={navigation} size={40} />
					</View>
				</View>

				<View style={styles.contentArea}>
					<View style={styles.searchBox}>
						<Feather name="search" size={24} color={tc('black')} style={styles.searchIcon} />
						<TextInput
							placeholder="Pesquise produtos, categorias"
							placeholderTextColor={tc('#8b9491')}
							style={styles.searchInput}
							value={searchText}
							onChangeText={setSearchText}
							returnKeyType="search"
							accessibilityLabel="Pesquisar produtos e categorias"
						/>
					</View>
					<BannerCarousel
						banners={promoBanners}
						width={promoBannerWidth}
						onBannerPress={handleBannerPress}
						isAdmin={isAdmin}
						onEditBanner={() => setCarouselEditorVisible(true)}
						offerProducts={products}
						onOpenProduct={(product) => navigation.navigate('TelaDetalheProduto', { productId: product.id })}
						onSeeOffers={() => navigation.navigate('ProdutosCategoriaScreen', { todos: true, promocao: true })}
					/>
					<ScrollView
						horizontal
						style={styles.categoriesBar}
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.categoriesRow}
					>
						<TouchableOpacity
							style={styles.categoryFilter}
							onPress={() => setIsFilterModalVisible(true)}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel="Abrir filtros de produtos"
						>
							<Feather name="sliders" size={17} color={tc(colors.white)} />
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
					<View style={styles.scrollContent}>
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
								{matchingProducts.length > 0 ? (
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
								) : (
									<EmptyProductsState />
								)}
							</>
						) : (
							<>
								{displayedCategoryProducts.length > 0 ? (
									<>
										<ProductSection title="Em Destaque" onSeeMore={() => openSeeMore(false)} products={displayedCategoryProducts} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
										<ProductSection title="Em Promoção" onSeeMore={() => openSeeMore(true)} products={displayedCategoryProducts.filter((product) => product.discount)} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
										<ProductSection title="Produtos" onSeeMore={() => openSeeMore(false)} products={displayedCategoryProducts} cardWidth={productCardWidth} navigation={navigation} favoriteIds={favoriteIds} cartProductIds={cartProductIds} onToggleFavorite={handleToggleFavorite} onToggleCart={handleToggleCart} />
									</>
								) : (
									<EmptyProductsState />
								)}
							</>
						)}
					</View>
				</View>
			</ScrollView>

			<Modal
				visible={isCepModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsCepModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalBackdrop}
					behavior="padding"
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
							placeholderTextColor={tc(colors.muted)}
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
							placeholderTextColor={tc(colors.muted)}
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
								<Feather name="x" size={16} color={tc(colors.white)} />
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
										name={item.type === 'price' && priceSortDirection !== null
											? priceSortDirection === 'ascending' ? 'arrow-up' : 'arrow-down'
											: item.icon}
										size={34}
										color={tc(colors.green)}
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
											color={tc(colors.lightGreen)}
										/>
									) : null}
								</TouchableOpacity>
							)}
						/>
					</Animated.View>
				</View>
			</Modal>

			<NavegacaoInferior activeTab="Início" navigation={navigation} />
			<View style={[styles.safeAreaBottom, { height: insets.bottom }]} />
			{isAdmin ? <CarrosselModal visible={carouselEditorVisible} onClose={() => setCarouselEditorVisible(false)} /> : null}
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#194B38',
	},
	safeAreaBottom: {
		backgroundColor: '#F1F3F5',
	},
	screenScroll: {
		flex: 1,
	},
	screenScrollContent: {
		flexGrow: 1,
	},
	contentArea: {
		flex: 1,
		justifyContent: 'flex-start',
		paddingTop: 18,
		paddingBottom: 12,
		backgroundColor: '#F1F3F5',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	header: {
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	// O conteúdo do cabeçalho tem 72 de altura, igual ao do admin.
	locationIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: 16,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	locationText: {
		flex: 1,
		marginLeft: 12,
		marginRight: 12,
		height: 72,
		justifyContent: 'center',
	},
	greeting: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 17,
		lineHeight: 21,
	},
	address: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 11,
		lineHeight: 14,
		marginTop: 1,
	},
	editCep: {
		color: '#35D59A',
		fontFamily: 'Montserrat_500Medium',
		fontSize: 10,
		lineHeight: 13,
		marginTop: 1,
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
		height: 46,
		marginHorizontal: 18,
		borderRadius: 16,
		backgroundColor: '#E8ECEB',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: '#DCE3E0',
	},
	searchIcon: {
		marginRight: 8,
		color: '#3D4A46',
	},
	searchInput: {
		flex: 1,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 13,
		color: colors.ink,
		paddingVertical: 0,
	},
	promoCarousel: {
		marginTop: 14,
		marginHorizontal: 18,
		marginBottom: 16,
		position: 'relative',
	},
	editBannerButton: {
		position: 'absolute',
		top: 12,
		right: 12,
		zIndex: 1,
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: colors.lightGreen,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 4,
	},
	promoEmptyState: {
		minHeight: 116,
		paddingHorizontal: 20,
		paddingVertical: 18,
		borderRadius: 16,
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	promoEmptyIcon: {
		width: 54,
		height: 54,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2B6654',
	},
	promoEmptyCopy: {
		flex: 1,
	},
	promoEmptyTitle: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 16,
	},
	promoEmptyDescription: {
		marginTop: 5,
		color: '#D5E9E1',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 12,
	},
	promoBanner: {
		minHeight: 120,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	promoBannerImage: {
		width: '100%',
		height: '100%',
	},
	promoDots: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 8,
	},
	promoDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#B8C0BD',
	},
	promoDotActive: {
		width: 16,
		backgroundColor: colors.green,
	},
	categoriesBar: {
		height: 34,
		flexGrow: 0,
		flexShrink: 0,
		marginTop: 16,
		marginBottom: 16,
	},
	categoriesRow: {
		paddingHorizontal: 18,
		gap: 8,
		alignItems: 'center',
	},
	categoryFilter: {
		width: 44,
		height: 34,
		backgroundColor: colors.green,
		borderRadius: 18,
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
		backgroundColor: '#1D6A56',
		paddingHorizontal: 14,
		height: 34,
		justifyContent: 'center',
		borderRadius: 18,
	},
	selectedCategory: {
		backgroundColor: '#40B190',
	},
	categoryText: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 11,
	},

	scrollContent: {
		flex: 1,
		paddingBottom: 18,
	},
	emptyProducts: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	emptyProductsTitle: {
		marginTop: 12,
		color: '#1B4B3D',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 16,
	},
	emptyProductsDescription: {
		marginTop: 4,
		color: '#6B7280',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 13,
		textAlign: 'center',
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
	section: {
		marginTop: 6,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		marginBottom: 10,
	},
	sectionTitle: {
		color: colors.ink,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 18,
	},
	productSectionTitle: {
		fontSize: 22,
	},
	seeAll: {
		color: '#656f6c',
		fontFamily: 'Montserrat_400Regular',
		fontSize: 11,
	},
	productsRow: {
		alignItems: 'flex-start',
		gap: 12,
		paddingHorizontal: 18,
		paddingBottom: 12,
	},
	productCard: {
		backgroundColor: '#FFFFFF',
		elevation: 3,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
	},
	productImage: {
		backgroundColor: colors.white,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	productImageContent: {
		width: '84%',
		height: '100%',
	},
	heartButton: {
		position: 'absolute',
		backgroundColor: '#1B4B3D',
		alignItems: 'center',
		justifyContent: 'center',
	},
	heartButtonActive: {
		backgroundColor: colors.red,
	},
	discount: {
		position: 'absolute',
		backgroundColor: '#FF3B30',
		color: colors.white,
		fontFamily: 'LilitaOne_400Regular',
	},
	productName: {
		color: colors.green,
		fontFamily: 'Montserrat_700Bold',
	},
	weight: {
		color: '#7e8985',
		fontFamily: 'Montserrat_400Regular',
	},
	price: {
		color: colors.green,
		fontFamily: 'LilitaOne_400Regular',
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
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	addedButton: {
		backgroundColor: colors.lightGreen,
		borderColor: '#008F5A',
	},
	addButtonText: {
		color: colors.white,
		fontFamily: 'Montserrat_500Medium',
	},

}));