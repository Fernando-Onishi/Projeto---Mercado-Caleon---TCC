import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import BotaoSacola from '../Componentes/BotaoSacola';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { db } from '../Config/FireBaseConfig';
import {
	formatCurrency,
	formatProductUnit,
	getProductPrice,
} from '../Config/Produtos';
import {
	addProductToCart,
	getCartProductIds,
	getFavorites,
	removeProductFromCart,
	toggleFavorite,
} from '../Config/ProdutoStorage';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';

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
		name: data.name.trim(),
		imageUrl: typeof data.imageUrl === 'string'
			? data.imageUrl
			: typeof data.imageUri === 'string' ? data.imageUri : '',
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

function ProductCard({
	product,
	width,
	isFavorite,
	isInCart,
	onOpen,
	onToggleFavorite,
	onToggleCart,
}) {
	const imageHeight = width * 0.62;

	return (
		<View style={[styles.productCard, { width, minHeight: width * 1.58 }]}>
			<TouchableOpacity
				style={[styles.productImageArea, { height: imageHeight }]}
				onPress={onOpen}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel={`Ver detalhes de ${product.name}`}
			>
				{product.discount ? (
					<Text style={styles.discountBadge}>{product.discount}</Text>
				) : null}
				{product.imageUrl ? (
					<Image
						source={{ uri: product.imageUrl }}
						style={styles.productImage}
						resizeMode="contain"
					/>
				) : (
					<MaterialCommunityIcons name="food-apple-outline" size={50} color={colors.mint} />
				)}
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.favoriteButton}
				onPress={() => onToggleFavorite(product.id)}
				activeOpacity={0.8}
				accessibilityRole="button"
				accessibilityLabel={`${isFavorite ? 'Remover' : 'Adicionar'} ${product.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
			>
				<MaterialCommunityIcons
					name={isFavorite ? 'heart' : 'heart-outline'}
					size={18}
					color={colors.white}
				/>
			</TouchableOpacity>
			<View style={styles.productDetails}>
				<Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
				<Text style={styles.productWeight}>{product.weight}</Text>
				<View style={styles.priceRow}>
					<Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
					{product.originalPrice ? (
						<Text style={styles.originalPrice}>{formatCurrency(product.originalPrice)}</Text>
					) : null}
				</View>
				<TouchableOpacity
					style={[styles.addButton, isInCart && styles.addedButton]}
					onPress={() => onToggleCart(product, isInCart)}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel={`${product.name}, ${isInCart ? 'remover da' : 'adicionar à'} sacola`}
				>
					<MaterialCommunityIcons
						name={isInCart ? 'check' : 'plus'}
						size={17}
						color={colors.white}
					/>
					<Text style={styles.addButtonText}>{isInCart ? 'Adicionado' : 'Adicionar'}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

export default function ProdutosCategoriaScreen({ navigation, route }) {
	const { width: windowWidth } = useWindowDimensions();
	const category = typeof route?.params?.categoria === 'string'
		? route.params.categoria.trim()
		: '';
	const [products, setProducts] = useState([]);
	const [favoriteIds, setFavoriteIds] = useState([]);
	const [cartProductIds, setCartProductIds] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const pendingCartProductIds = useRef(new Set());
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const cardWidth = Math.max(120, (windowWidth - 60) / 2);

	useEffect(() => {
		if (!category) {
			setProducts([]);
			setLoading(false);
			setLoadError(true);
			return undefined;
		}

		setLoading(true);
		setLoadError(false);
		const productsQuery = query(
			collection(db, 'products'),
			where('category', '==', category),
		);

		return onSnapshot(
			productsQuery,
			(snapshot) => {
				setProducts(snapshot.docs.map(mapProduct).filter(Boolean));
				setLoading(false);
			},
			(error) => {
				console.error(`Não foi possível carregar os produtos da categoria ${category}.`, error);
				setLoadError(true);
				setLoading(false);
			},
		);
	}, [category]);

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
			return <ActivityIndicator style={styles.emptyState} size="large" color={colors.green} />;
		}
		if (loadError) {
			return <Text style={styles.emptyText}>Não foi possível carregar os produtos desta categoria.</Text>;
		}
		return <Text style={styles.emptyText}>Ainda não há produtos nesta categoria.</Text>;
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
			Alert.alert('Favoritos', 'Não foi possível atualizar seus favoritos.');
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
		<SafeAreaView style={styles.safeArea}>
			<StatusBar backgroundColor={colors.green} barStyle="light-content" />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={() => navigation.goBack()}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel="Voltar"
						>
							<Feather name="arrow-left" size={20} color={colors.white} />
						</TouchableOpacity>
						<BotaoSacola navigation={navigation} size={42} />
					</View>
					<Text style={styles.title}>Produtos</Text>
					<Text style={styles.subtitle}>{category || 'Categoria'}</Text>
				</View>

				<View style={styles.listPanel}>
					<FlatList
						data={products}
						numColumns={2}
						keyExtractor={(product) => product.id}
						columnWrapperStyle={styles.productRow}
						contentContainerStyle={styles.productGrid}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyState}
						renderItem={({ item }) => (
							<ProductCard
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
				</View>
				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.green,
	},
	topBand: {
		height: 28,
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
		height: 140,
		alignItems: 'center',
		paddingTop: 12,
	},
	headerActions: {
		width: '100%',
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginTop: 5,
		color: colors.green,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 30,
	},
	subtitle: {
		marginTop: 1,
		color: colors.green,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 15,
	},
	listPanel: {
		flex: 1,
		marginHorizontal: 12,
		marginBottom: 8,
		borderRadius: 24,
		backgroundColor: colors.white,
		overflow: 'hidden',
	},
	productGrid: {
		paddingHorizontal: 12,
		paddingTop: 14,
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
		left: 0,
		zIndex: 1,
		paddingHorizontal: 7,
		paddingVertical: 4,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: colors.red,
		color: colors.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 9,
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
		flex: 1,
		marginTop: 4,
	},
	productName: {
		color: colors.green,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	productWeight: {
		marginTop: 1,
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 10,
	},
	priceRow: {
		minHeight: 23,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	productPrice: {
		color: colors.price,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	originalPrice: {
		color: colors.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 9,
		textDecorationLine: 'line-through',
	},
	addButton: {
		height: 34,
		marginTop: 5,
		borderRadius: 11,
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
		fontSize: 10,
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
});
