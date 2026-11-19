import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Animated,
	Image,
	PanResponder,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
	DeviceEventEmitter,
} from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { formatCurrency, formatProductUnit, getProductPrice, productImageFor, productName, PRODUCTS } from '../Config/Produtos';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../Config/FireBaseConfig';
import { isCatalogSeeded } from '../Config/CatalogoFirebase';
import { addProductToCart, FAVORITES_CHANGED_EVENT, getFavorites, toggleFavorite } from '../Config/ProdutoStorage';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import BotaoNotificacoesCliente from '../Componentes/BotaoNotificacoesCliente';
import { themedStyles, tc } from '../Config/Tema';

const palette = {
	green: '#1b4b3d',
	mint: '#40b190',
	price: '#00a878',
	background: '#F1F3F5',
	muted: '#757575',
	white: '#ffffff',
	red: '#ff2929',
};

// Produto do Firestore no formato que a lista de favoritos usa (vale também para os cadastrados pelo admin).
function mapCatalogProduct(id, data) {
	const pricePerKg = Number(data.pricePerKg);
	const defaultWeightGrams = Number(data.defaultWeightGrams) || 1000;
	if (data.active === false || !data.name || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return null;
	return {
		...data,
		id,
		name: productName(data.name),
		imageUrl: productImageFor(id, data.imageUrl, data.imageUrls),
		pricePerKg,
		originalPricePerKg: Number(data.originalPricePerKg) > pricePerKg ? Number(data.originalPricePerKg) : null,
		defaultWeightGrams,
		availableWeights: Array.isArray(data.availableWeights) && data.availableWeights.length ? data.availableWeights.map(Number) : [defaultWeightGrams],
	};
}

function FavoriteRow({ item, width, onDelete, onAdd, onPress }) {
	const translateX = useRef(new Animated.Value(0)).current;
	const onDeleteRef = useRef(onDelete);
	const onAddRef = useRef(onAdd);
	const weightGrams = item.defaultWeightGrams;
	const currentPrice = getProductPrice(item, weightGrams);
	const originalPrice = item.originalPricePerKg
		? getProductPrice({ pricePerKg: item.originalPricePerKg }, weightGrams)
		: null;
	onDeleteRef.current = onDelete;
	onAddRef.current = onAdd;

	function resetPosition() {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
			bounciness: 0,
			speed: 22,
		}).start();
	}

	const panResponder = useRef(PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
		onPanResponderGrant: () => translateX.stopAnimation(),
		onPanResponderMove: (_, gesture) => {
			translateX.setValue(Math.max(-80, Math.min(80, gesture.dx)));
		},
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dx <= -60) onDeleteRef.current(item.id);
			else if (gesture.dx >= 60) onAddRef.current(item);
			resetPosition();
		},
		onPanResponderTerminate: resetPosition,
	})).current;

	return (
		<View style={[styles.rowShadow, { width }]}>
			<View style={styles.rowClip}>
				<View style={styles.addAction}>
					<MaterialCommunityIcons name="shopping-outline" size={38} color={tc(palette.white)} />
				</View>
				<View style={styles.deleteAction}>
					<Feather name="trash-2" size={40} color={tc(palette.white)} />
				</View>
				<Animated.View
					style={[styles.favoriteCard, { width: width + 2, transform: [{ translateX }] }]}
					{...panResponder.panHandlers}
				>
					<TouchableOpacity style={styles.favoriteContent} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
						<Image source={{ uri: item.imageUrl }} style={styles.favoriteImage} resizeMode="contain" />
						<View style={styles.productDetails}>
							<View style={styles.productTitleRow}>
								<Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
								<Text style={styles.productWeight}>{formatProductUnit(item, weightGrams)}</Text>
							</View>
							<View style={styles.productPriceRow}>
								<Text style={styles.currentPrice}>{formatCurrency(currentPrice)}</Text>
								{originalPrice ? (
									<Text style={styles.originalPrice}>{formatCurrency(originalPrice)}</Text>
								) : null}
							</View>
						</View>
						<Feather name="chevron-right" size={24} color={tc('#111111')} />
					</TouchableOpacity>
				</Animated.View>
			</View>
		</View>
	);
}

export default function Favoritos({ navigation }) {
	const { width } = useWindowDimensions();
	const [favoriteIds, setFavoriteIds] = useState([]);
	// Catálogo atual (Firebase): inclui produtos cadastrados pelo admin e preços/fotos atualizados.
	const [catalog, setCatalog] = useState(PRODUCTS);
	const favorites = useMemo(
		() => favoriteIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean),
		[favoriteIds, catalog],
	);
	const [fontsLoaded] = useFonts({
		LuckiestGuy: require('@expo-google-fonts/luckiest-guy/400Regular/LuckiestGuy_400Regular.ttf'),
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});
	useEffect(() => onSnapshot(collection(db, 'products'), (snapshot) => {
		const merged = new Map(isCatalogSeeded(snapshot.docs) ? [] : PRODUCTS.map((product) => [product.id, product]));
		snapshot.docs.forEach((item) => {
			const mapped = mapCatalogProduct(item.id, item.data());
			if (mapped) merged.set(item.id, mapped);
			else merged.delete(item.id);
		});
		setCatalog([...merged.values()]);
	}, (error) => console.error('Não foi possível carregar o catálogo dos favoritos.', error)), []);

	useEffect(() => {
		let active = true;
		async function loadFavorites() {
			const ids = await getFavorites();
			if (active) setFavoriteIds(ids);
		}
		loadFavorites();
		const unsubscribe = navigation.addListener('focus', loadFavorites);
		// Favoritado/desfavoritado em outra tela ou em outro aparelho: a lista atualiza na hora.
		const subscription = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, loadFavorites);
		return () => {
			active = false;
			unsubscribe();
			subscription.remove();
		};
	}, [navigation]);

	if (!fontsLoaded) return null;

	async function removeFavorite(id) {
		try {
			await toggleFavorite(id);
			const removed = favorites.find((item) => item.id === id);
			setFavoriteIds((ids) => ids.filter((itemId) => itemId !== id));
			if (removed) showGlobalNotification(`${removed.name} removido dos favoritos`);
		} catch {
			showGlobalNotification('Não foi possível remover este produto.');
		}
	}

	async function addFavoriteToCart(item) {
		try {
			const nextItems = await addProductToCart(item, item.defaultWeightGrams);
			publishSacolaCount(nextItems);
			showGlobalNotification(`${item.name} adicionado à sacola`);
		} catch {
			showGlobalNotification('Não foi possível adicionar o produto.');
		}
	}

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar backgroundColor={palette.green} barStyle="light-content" />
			<View style={styles.topBand} />
			<View style={styles.screenPanel}>
				<View style={styles.header}>
					<CircularIconButton
						style={styles.roundButton}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color={tc(palette.white)} />}
						onPress={() => navigation.navigate('TelaHome')}
						accessibilityLabel="Voltar"
					/>
					<Text style={styles.title}>Favoritos</Text>
					<View style={styles.notificationButton}>
						<BotaoNotificacoesCliente navigation={navigation} size={40} />
					</View>
				</View>

				<ScrollView
					style={styles.list}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
				>
					{favorites.length === 0 ? (
						<View style={styles.emptyFavorites}>
							<MaterialCommunityIcons name="heart-outline" size={60} color={tc('#C9C9C9')} />
							<Text style={styles.emptyFavoritesText}>Sua lista de favoritos está vazia</Text>
						</View>
					) : (
						favorites.map((item) => (
							<FavoriteRow
								key={item.id}
								item={item}
								width={width - 26}
								onDelete={removeFavorite}
								onAdd={addFavoriteToCart}
								onPress={() => navigation.navigate('TelaDetalheProduto', { productId: item.id })}
							/>
						))
					)}
				</ScrollView>
				<NavegacaoInferior activeTab="Favoritos" navigation={navigation} />
			</View>
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: palette.green,
	},
	topBand: {
		height: 40,
		backgroundColor: palette.green,
	},
	screenPanel: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: palette.background,
		overflow: 'hidden',
	},
	header: {
		height: 116,
		alignItems: 'center',
		paddingTop: 15,
	},
	notificationButton: {
		position: 'absolute',
		top: 15,
		right: 16,
	},
	roundButton: {
		position: 'absolute',
		top: 15,
		left: 16,
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: palette.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginTop: 54,
		color: '#000000',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 30,
		textAlign: 'center',
	},
	list: {
		flex: 1,
	},
	listContent: {
		flexGrow: 1,
		paddingHorizontal: 13,
		paddingTop: 0,
		paddingBottom: 20,
	},
	emptyFavorites: {
		alignItems: 'center',
		paddingTop: 38,
	},
	emptyFavoritesText: {
		marginTop: 12,
		color: '#87918D',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 17,
		textAlign: 'center',
		textTransform: 'uppercase',
	},
	rowShadow: {
		alignSelf: 'stretch',
		marginBottom: 12,
		borderRadius: 13,
		backgroundColor: palette.white,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.24,
		shadowRadius: 6,
		elevation: 6,
	},
	rowClip: {
		height: 78,
		borderRadius: 13,
		backgroundColor: palette.red,
		overflow: 'hidden',
	},
	deleteAction: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		width: 80,
		backgroundColor: palette.red,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addAction: {
		position: 'absolute',
		top: 0,
		left: 0,
		bottom: 0,
		width: 80,
		backgroundColor: palette.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	favoriteCard: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: -1,
		backgroundColor: palette.white,
		borderRadius: 0,
		overflow: 'hidden',
	},
	favoriteImage: {
		width: 58,
		height: 58,
		marginRight: 10,
	},
	favoriteContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	productDetails: {
		flex: 1,
	},
	productTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 4,
	},
	productName: {
		color: '#1b6848',
		fontFamily: 'LuckiestGuy',
		fontSize: 19,
		lineHeight: 23,
	},
	productWeight: {
		color: palette.white,
		backgroundColor: palette.mint,
		borderRadius: 10,
		overflow: 'hidden',
		paddingHorizontal: 8,
		paddingVertical: 3,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 14,
	},
	productPriceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		marginTop: 0,
	},
	currentPrice: {
		color: palette.price,
		fontFamily: 'LuckiestGuy',
		fontSize: 16,
		lineHeight: 20,
	},
	originalPrice: {
		color: palette.muted,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 11,
		textDecorationLine: 'line-through',
	},
}));