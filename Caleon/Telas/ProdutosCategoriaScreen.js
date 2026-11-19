import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	StatusBar,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
	DeviceEventEmitter,
} from 'react-native';
import { useFonts } from 'expo-font';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import Feather from '@expo/vector-icons/Feather';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import BotaoNotificacoesCliente from '../Componentes/BotaoNotificacoesCliente';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { db } from '../Config/FireBaseConfig';
import {
	formatProductUnit,
	getProductPrice,
	productImageFor,
	PRODUCTS,
} from '../Config/Produtos';
import {
	addProductToCart,
	getCartProductIds,
	CART_CHANGED_EVENT,
	FAVORITES_CHANGED_EVENT,
	getFavorites,
	removeProductFromCart,
	toggleFavorite,
} from '../Config/ProdutoStorage';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import CircularIconButton from '../Componentes/CircularIconButton';
import CardProduto from '../Componentes/CardProduto';
import { isCatalogSeeded } from '../Config/CatalogoFirebase';
import { themedStyles, tc } from '../Config/Tema';
import { productName } from '../Config/Produtos';

const colors = {
	green: '#1B4B3D',
	mint: '#40B190',
	price: '#00A878',
	red: '#FF383C',
	white: '#FFFFFF',
	muted: '#8A9490',
	background: '#F1F3F5',
};

function mapProduct(snapshot) {
	const data = snapshot.data();
	const defaultWeightGrams = Number(data.defaultWeightGrams);
	const pricePerKg = Number(data.pricePerKg);

	if (
		data.active !== true
		|| typeof data.name !== 'string'
		|| !data.name.trim()
		|| !Number.isFinite(defaultWeightGrams)
		|| defaultWeightGrams <= 0
		|| !Number.isFinite(pricePerKg)
		|| pricePerKg <= 0
	) {
		return null;
	}

	const product = {
		...data,
		id: snapshot.id,
		name: productName(data.name),
		imageUrl: productImageFor(snapshot.id, data.imageUrl || data.imageUri, data.imageUrls),
		pricePerKg,
		originalPricePerKg: Number(data.originalPricePerKg) > pricePerKg
			? Number(data.originalPricePerKg)
			: null,
		defaultWeightGrams,
		availableWeights: Array.isArray(data.availableWeights)
			? data.availableWeights
				.map(Number)
				.filter((weight) => Number.isFinite(weight) && weight > 0)
			: [defaultWeightGrams],
	};

	return {
		...product,
		price: getProductPrice(product, defaultWeightGrams),
		originalPrice: product.originalPricePerKg
			? getProductPrice(
				{ ...product, pricePerKg: product.originalPricePerKg },
				defaultWeightGrams,
			)
			: null,
		weight: formatProductUnit(product, defaultWeightGrams),
		discount: product.originalPricePerKg
			? `${Math.round((1 - pricePerKg / product.originalPricePerKg) * 100)}% OFF`
			: null,
	};
}

function normalizeCategory(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9]/g, '')
		.toLocaleLowerCase('pt-BR');
}

// Produtos que já vêm no app (Config/Produtos.js), no mesmo formato dos que vêm do Firebase.
function getLocalProducts(category) {
	return PRODUCTS
		.filter((product) => normalizeCategory(product.category) === normalizeCategory(category))
		.map((product) => mapProduct({ id: product.id, data: () => ({ ...product, active: true }) }))
		.filter(Boolean);
}

function getAllLocalProducts() {
	return PRODUCTS
		.map((product) => mapProduct({ id: product.id, data: () => ({ ...product, active: true }) }))
		.filter(Boolean);
}

function getCategoryQueryValues(category) {
	const normalizedCategory = category
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]/g, '')
		.toLocaleLowerCase('pt-BR');
	const values = new Set([
		category,
		category.toLocaleLowerCase('pt-BR'),
		category.toLocaleUpperCase('pt-BR'),
	]);

	if (normalizedCategory === 'hortifruti') {
		['Horti-Fruti', 'HortiFruti', 'Hortifruti'].forEach((value) => values.add(value));
	}

	return [...values];
}

export default function ProdutosCategoriaScreen({ navigation, route }) {
	const { width: windowWidth } = useWindowDimensions();
	const category = typeof route?.params?.categoria === 'string'
		? route.params.categoria.trim()
		: '';
	// "Ver mais" da Home: todos os produtos (sem categoria) e/ou só os que estão em promoção.
	const showAll = route?.params?.todos === true || !category;
	const onlyPromo = route?.params?.promocao === true;
	const [allProducts, setProducts] = useState([]);
	const products = useMemo(
		() => (onlyPromo ? allProducts.filter((product) => product.discount) : allProducts),
		[allProducts, onlyPromo],
	);
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
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const pendingCartProductIds = useRef(new Set());
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const cardWidth = Math.max(120, (windowWidth - 36) / 2);

	useEffect(() => {
		const localProducts = showAll ? getAllLocalProducts() : getLocalProducts(category);
		setLoading(localProducts.length === 0);
		setLoadError(false);
		setProducts(localProducts);
		const productsQuery = showAll
			? collection(db, 'products')
			: query(collection(db, 'products'), where('category', 'in', getCategoryQueryValues(category)));

		return onSnapshot(
			productsQuery,
			(snapshot) => {
				// O Firebase sobrescreve o produto local de mesmo id (edição pelo admin) ou o esconde (excluído).
				const merged = new Map(isCatalogSeeded(snapshot.docs) ? [] : localProducts.map((product) => [product.id, product]));
				snapshot.docs.forEach((productDocument) => {
					const mapped = mapProduct(productDocument);
					if (mapped) merged.set(mapped.id, mapped);
					else merged.delete(productDocument.id);
				});
				setProducts([...merged.values()]);
				setLoading(false);
			},
			(error) => {
				console.error(`Não foi possível carregar os produtos da categoria ${category}.`, error);
				setLoadError(localProducts.length === 0);
				setLoading(false);
			},
		);
	}, [category, showAll]);

	useEffect(() => {
		let active = true;

		async function loadProductStates() {
			try {
				const [favoriteProductIds, cartIds] = await Promise.all([
					getFavorites(),
					getCartProductIds(),
				]);
				if (active) {
					setFavoriteIds(favoriteProductIds);
					setCartProductIds(cartIds);
				}
			} catch (error) {
				console.error('Não foi possível carregar os favoritos e a sacola.', error);
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

	function renderEmptyState() {
		if (loading) {
			return <ActivityIndicator style={styles.emptyState} size="large" color={tc(colors.green)} />;
		}
		if (loadError) {
			return <Text style={styles.emptyText}>Não foi possível carregar os produtos desta categoria.</Text>;
		}
		return <Text style={styles.emptyText}>{onlyPromo ? 'Nenhum produto em promoção agora.' : 'Ainda não há produtos nesta categoria.'}</Text>;
	}

	async function handleToggleFavorite(productId) {
		const wasFavorite = favoriteIds.includes(productId);
		setFavoriteIds((ids) => (
			wasFavorite ? ids.filter((id) => id !== productId) : [...ids, productId]
		));

		try {
			const result = await toggleFavorite(productId);
			setFavoriteIds(result.favoriteIds);
			const product = products.find((item) => item.id === productId);
			if (product) {
				showGlobalNotification(
					result.isFavorite
						? `${product.name} salvo nos favoritos`
						: `${product.name} removido dos favoritos`,
				);
			}
		} catch (error) {
			console.error('Não foi possível atualizar os favoritos.', error);
			setFavoriteIds((ids) => (
				wasFavorite ? [...ids, productId] : ids.filter((id) => id !== productId)
			));
			showGlobalNotification('Não foi possível atualizar seus favoritos.');
		}
	}

	async function handleToggleCart(product, isInCart) {
		if (pendingCartProductIds.current.has(product.id)) return;
		pendingCartProductIds.current.add(product.id);

		setCartProductIds((ids) => (
			isInCart
				? ids.filter((id) => id !== product.id)
				: ids.includes(product.id) ? ids : [...ids, product.id]
		));

		try {
			const nextItems = isInCart
				? await removeProductFromCart(product.id)
				: await addProductToCart(product, product.defaultWeightGrams);
			publishSacolaCount(nextItems);
			showGlobalNotification(
				isInCart
					? `${product.name} removido da sacola`
					: `${product.name} adicionado à sacola`,
			);
		} catch (error) {
			console.error('Não foi possível atualizar a sacola.', error);
			setCartProductIds((ids) => (
				isInCart
					? ids.includes(product.id) ? ids : [...ids, product.id]
					: ids.filter((id) => id !== product.id)
			));
			Alert.alert(
				'Sacola',
				`Não foi possível ${isInCart ? 'remover o produto da' : 'adicionar o produto à'} sacola.`,
			);
		} finally {
			pendingCartProductIds.current.delete(product.id);
		}
	}

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<View style={styles.headerActions}>
						<CircularIconButton
							style={styles.backButton}
							borderRadius={12}
							icon={<Feather name="chevron-left" size={27} color={tc(colors.white)} />}
							onPress={() => navigation.goBack()}
							accessibilityLabel="Voltar"
						/>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<BotaoNotificacoesCliente navigation={navigation} size={40} />
						</View>
					</View>
					<Text style={styles.title}>Produtos</Text>
					<Text style={styles.subtitle}>{[onlyPromo ? 'Em Promoção' : null, showAll ? 'Todos os produtos' : category].filter(Boolean).join(' · ')}</Text>
				</View>

				<FlatList
					style={styles.productList}
					data={products}
					numColumns={2}
					keyExtractor={(product) => product.id}
					columnWrapperStyle={styles.productRow}
					contentContainerStyle={styles.productGrid}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={renderEmptyState}
					renderItem={({ item }) => (
						<CardProduto
							product={item}
							width={cardWidth}
							isFavorite={favoriteIds.includes(item.id)}
							isInCart={cartProductIds.includes(item.id)}
							onOpen={() => navigation.navigate('TelaDetalheProduto', { productId: item.id })}
							onToggleFavorite={handleToggleFavorite}
							onToggleCart={handleToggleCart}
						/>
					)}
				/>
				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.green,
	},
	topBand: {
		height: 40,
		backgroundColor: colors.green,
	},
	screen: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: colors.background,
		overflow: 'hidden',
	},
	header: {
		height: 132,
		alignItems: 'center',
		paddingTop: 15,
	},
	headerActions: {
		width: '100%',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: colors.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginTop: 14,
		color: colors.black,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 30,
	},
	subtitle: {
		marginTop: 1,
		color: '#226842',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 18,
	},
	productList: {
		flex: 1,
	},
	productGrid: {
		paddingHorizontal: 13,
		paddingTop: 0,
		paddingBottom: 20,
	},
	productRow: {
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	productCard: {
		position: 'relative',
		padding: 10,
		borderRadius: 18,
		backgroundColor: colors.white,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E7ECE9',
		shadowColor: '#1B4B3D',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 2,
	},
	productImageArea: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	productImage: {
		width: '100%',
		height: '100%',
	},
	discountBadge: {
		position: 'absolute',
		top: 2,
		left: 2,
		zIndex: 1,
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#FF0000',
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 12,
	},
	favoriteButton: {
		position: 'absolute',
		top: 9,
		right: 9,
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
	},
	productDetails: {
		marginTop: 6,
	},
	productName: {
		color: colors.green,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 15,
	},
	productWeight: {
		marginTop: 1,
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 11,
	},
	priceRow: {
		minHeight: 26,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	productPrice: {
		color: colors.price,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 20,
	},
	originalPrice: {
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 11,
		textDecorationLine: 'line-through',
	},
	addButton: {
		height: 42,
		marginTop: 8,
		borderRadius: 12,
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	addedButton: {
		backgroundColor: colors.mint,
	},
	addButtonText: {
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	emptyState: {
		paddingTop: 40,
	},
	emptyText: {
		paddingHorizontal: 20,
		paddingTop: 42,
		color: colors.muted,
		fontFamily: 'Montserrat_500Medium',
		fontSize: 14,
		textAlign: 'center',
	},
}));
