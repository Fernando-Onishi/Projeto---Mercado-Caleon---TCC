import React, { useEffect, useMemo, useState } from 'react';
import {
	Image,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	DeviceEventEmitter,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import BotaoNotificacoesCliente from '../Componentes/BotaoNotificacoesCliente';
import LinkVerMais from '../Componentes/LinkVerMais';
import CircularIconButton from '../Componentes/CircularIconButton';
import { formatCurrency, formatProductUnit, getProductById, getProductPrice, productImageFor, productName, PRODUCTS } from '../Config/Produtos';
import { addProductToCart, FAVORITES_CHANGED_EVENT, getFavorites, toggleFavorite } from '../Config/ProdutoStorage';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { isCatalogSeeded } from '../Config/CatalogoFirebase';
import { db } from '../Config/FireBaseConfig';
import { themedStyles, tc } from '../Config/Tema';

const COLORS = {
	dark: '#1B4B3D',
	mint: '#40B190',
	price: '#00AA6A',
	background: '#F1F3F5',
	white: '#FFFFFF',
	black: '#000000',
	muted: '#757575',
	red: '#FF0000',
};

const BASE_WEIGHTS = [300, 600, 1000, 1500];
const EXTRA_WEIGHTS = [2000, 2500, 3000];
// Carnes por peso: mais variedade (de 100 g a 5 kg); as mais pedidas aparecem primeiro.
const MEAT_MAIN_WEIGHTS = [250, 500, 1000, 2000];
const MEAT_EXTRA_WEIGHTS = [100, 200, 300, 400, 600, 750, 1500, 2500, 3000, 4000, 5000];

// Converte um documento do Firestore no formato usado pela tela; null se o produto estiver inativo ou incompleto.
function mapStoredDetailProduct(id, data) {
	const defaultWeightGrams = Number(data.defaultWeightGrams);
	const pricePerKg = Number(data.pricePerKg);
	if (data.active !== true || !data.name || !(defaultWeightGrams > 0) || !(pricePerKg > 0)) return null;
	return {
		...data,
		id,
		name: productName(data.name),
		imageUrl: productImageFor(id, data.imageUrl, data.imageUrls),
		category: data.category === 'Horti-Fruti' ? 'HortiFruti' : data.category,
		defaultWeightGrams,
		pricePerKg,
		originalPricePerKg: Number(data.originalPricePerKg) > pricePerKg ? Number(data.originalPricePerKg) : null,
		averageWeightGrams: Number(data.averageWeightGrams) || defaultWeightGrams,
		availableWeights: Array.isArray(data.availableWeights) && data.availableWeights.length
			? data.availableWeights.map(Number).filter((weight) => Number.isFinite(weight) && weight > 0)
			: [defaultWeightGrams],
	};
}

function calculateDiscount(product) {
	if (!product.originalPricePerKg || product.originalPricePerKg <= product.pricePerKg) return null;
	return Math.round((1 - product.pricePerKg / product.originalPricePerKg) * 100);
}

function ProductImage({ uri, style }) {
	const [failed, setFailed] = useState(false);
	if (!uri || failed) {
		return <View style={[style, styles.imageFallback]} />;
	}
	return <Image source={{ uri }} style={style} resizeMode="contain" onError={() => setFailed(true)} />;
}

function SimilarProductCard({ product, onPress, onFavorite, onAdd, isFavorite }) {
	const discount = calculateDiscount(product);
	const weight = product.defaultWeightGrams;
	return (
		<View style={styles.similarCard}>
			<TouchableOpacity
				style={styles.similarMain}
				onPress={onPress}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel={`Ver detalhes de ${product.name}`}
			>
				{discount !== null && <Text style={styles.similarDiscount}>{discount}% OFF</Text>}
				<ProductImage uri={product.imageUrl} style={styles.similarImage} />
				<Text style={styles.similarName} numberOfLines={1}>
					{product.name}<Text style={styles.similarWeight}> {formatProductUnit(product, weight)}</Text>
				</Text>
				{(!product.unitBase || product.unitBase === 'g') && product.averageWeightGrams ? (
					<Text style={styles.similarAverage}>Aprox. {product.averageWeightGrams}g/cada</Text>
				) : null}
				<View style={styles.similarPriceRow}>
					<Text style={styles.similarPrice}>{formatCurrency(getProductPrice(product, weight))}</Text>
					{product.originalPricePerKg && (
						<Text style={styles.similarOldPrice}>
							{formatCurrency(getProductPrice({ pricePerKg: product.originalPricePerKg }, weight))}
						</Text>
					)}
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.similarHeart, isFavorite && styles.favoriteActive]}
				onPress={onFavorite}
				accessibilityRole="button"
				accessibilityLabel={`${isFavorite ? 'Remover' : 'Adicionar'} ${product.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
			>
				<MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={17} color={tc(COLORS.white)} />
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.similarAdd}
				onPress={onAdd}
				accessibilityRole="button"
				accessibilityLabel={`Adicionar ${product.name} à sacola`}
			>
				<Feather name="plus" size={20} color={tc(COLORS.white)} />
			</TouchableOpacity>
		</View>
	);
}

export default function DetalheProduto({ navigation, route }) {
	const productId = String(route?.params?.productId || '');
	// O produto vem sempre do Firestore (sincronizado entre aparelhos); o catálogo do app só aparece
	// enquanto o Firebase responde ou se o produto ainda não foi enviado para lá.
	const localProduct = getProductById(productId);
	const [storedProduct, setStoredProduct] = useState(null);
	const [storedProductReady, setStoredProductReady] = useState(false);
	const [storedSimilar, setStoredSimilar] = useState(null);
	const [removed, setRemoved] = useState(false);
	const product = storedProduct || localProduct || PRODUCTS[0];
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [selectedWeight, setSelectedWeight] = useState(product.defaultWeightGrams);
	const [favoriteIds, setFavoriteIds] = useState([]);

	// Favoritos/sacola mudaram em outra tela ou em outro aparelho: coração e sacola atualizam na hora.
	useEffect(() => {
		const favoritesSubscription = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, (ids) => setFavoriteIds(ids));
		return () => {
			favoritesSubscription.remove();
		};
	}, []);
	const [showMoreWeights, setShowMoreWeights] = useState(false);
	const total = getProductPrice(product, selectedWeight);
	const discount = calculateDiscount(product);
	const similarProducts = useMemo(
		() => (storedSimilar || PRODUCTS).filter((item) => item.id !== product.id && item.category === product.category),
		[storedSimilar, product.id, product.category],
	);

	useEffect(() => {
		if (!productId) {
			setStoredProduct(null);
			setStoredProductReady(true);
			return undefined;
		}
		setStoredProduct(null);
		setStoredProductReady(false);
		return onSnapshot(doc(db, 'products', productId), (snapshot) => {
			setStoredProduct(snapshot.exists() ? mapStoredDetailProduct(snapshot.id, snapshot.data()) : null);
			setRemoved(snapshot.exists() && !mapStoredDetailProduct(snapshot.id, snapshot.data()));
			setStoredProductReady(true);
		}, (error) => {
			console.error('Não foi possível carregar o produto cadastrado.', error);
			setStoredProductReady(true);
		});
	}, [productId]);

	// Produtos semelhantes da mesma categoria, também do Firestore.
	useEffect(() => {
		if (!product.category) return undefined;
		return onSnapshot(query(collection(db, 'products'), where('category', '==', product.category)), (snapshot) => {
			if (!isCatalogSeeded(snapshot.docs)) {
				const merged = new Map(PRODUCTS.map((item) => [item.id, item]));
				snapshot.docs.forEach((item) => {
					const mapped = mapStoredDetailProduct(item.id, item.data());
					if (mapped) merged.set(mapped.id, mapped);
					else merged.delete(item.id);
				});
				setStoredSimilar([...merged.values()]);
				return;
			}
			setStoredSimilar(snapshot.docs.map((item) => mapStoredDetailProduct(item.id, item.data())).filter(Boolean));
		}, (error) => console.error('Não foi possível carregar produtos semelhantes.', error));
	}, [product.category]);

	useEffect(() => {
		// Carne por peso: começa num peso que aparece entre os botões principais.
		const meatByWeight = product.category === 'Carnes' && (!product.unitBase || product.unitBase === 'g');
		setSelectedWeight(meatByWeight && !MEAT_MAIN_WEIGHTS.includes(product.defaultWeightGrams) ? 500 : product.defaultWeightGrams);
	}, [product.id, product.defaultWeightGrams, product.category, product.unitBase]);

	useEffect(() => {
		let active = true;
		const loadFavorites = async () => {
			const ids = await getFavorites();
			if (active) setFavoriteIds(ids);
		};
		loadFavorites();
		const unsubscribe = navigation?.addListener?.('focus', loadFavorites);
		return () => {
			active = false;
			if (typeof unsubscribe === 'function') unsubscribe();
		};
	}, [navigation]);

	if (!fontsLoaded || (!localProduct && !storedProductReady)) return null;
	if (removed || (!localProduct && !storedProduct)) {
		return (
			<SafeAreaScreen style={styles.safeArea}>
				<View style={styles.topBand} />
				<View style={[styles.screen, styles.unavailableProduct]}>
					<Text style={styles.sectionTitle}>Produto indisponível</Text>
					<TouchableOpacity style={styles.unavailableBack} onPress={() => navigation.goBack()} accessibilityRole="button">
						<Text style={styles.unavailableBackText}>Voltar</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaScreen>
		);
	}

	async function handleFavorite(productId) {
		try {
			const result = await toggleFavorite(productId);
			setFavoriteIds(result.favoriteIds);
			showGlobalNotification(
				result.isFavorite
					? `${product.name} salvo nos favoritos`
					: `${product.name} removido dos favoritos`
			);
		} catch {
			showGlobalNotification('Não foi possível atualizar seus favoritos.');
		}
	}

	async function handleAdd(productToAdd = product, weightGrams = selectedWeight) {
		try {
			const nextItems = await addProductToCart(productToAdd, weightGrams);
			publishSacolaCount(nextItems);
			showGlobalNotification(`${productToAdd.name} adicionado à sacola`);
		} catch {
			showGlobalNotification('Não foi possível adicionar o produto.');
		}
	}

	// O "+" abre mais opções de peso na própria tela (o Alert do Android só mostra 3 botões e não funciona na web).
	const isSoldByWeight = !product.unitBase || product.unitBase === 'g';
	const isMeat = isSoldByWeight && product.category === 'Carnes';
	const mainWeights = isMeat ? MEAT_MAIN_WEIGHTS : product.availableWeights.slice(0, 4);
	const extraWeights = isSoldByWeight
		? [...new Set(isMeat
			? [...product.availableWeights, ...MEAT_EXTRA_WEIGHTS]
			: [...product.availableWeights.slice(4), ...BASE_WEIGHTS, ...EXTRA_WEIGHTS])]
			.filter((weight) => !mainWeights.includes(weight))
			.sort((a, b) => a - b)
		: [];
	const visibleWeights = showMoreWeights
		? [...mainWeights, ...extraWeights]
		: mainWeights.includes(selectedWeight) || !extraWeights.includes(selectedWeight)
			? mainWeights
			: [...mainWeights, selectedWeight];

	function openProduct(productId) {
		if (productId !== product.id) navigation.push('TelaDetalheProduto', { productId });
	}

	function goBack() {
		if (navigation?.canGoBack()) navigation.goBack();
		else navigation?.navigate('TelaHome');
	}

	return (
		<SafeAreaScreen style={styles.safeArea} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<CircularIconButton
						style={styles.roundButton}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color={tc(COLORS.white)} />}
						onPress={goBack}
						accessibilityLabel="Voltar"
					/>
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<BotaoNotificacoesCliente navigation={navigation} size={40} />
					</View>
				</View>

				<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
					<View style={styles.hero}>
						<ProductImage uri={product.imageUrl} style={styles.heroImage} />
					</View>

					<View style={styles.productInfo}>
						<View style={styles.categoryLine}>
							<Text style={styles.category}>{product.category}</Text>
							{discount !== null && <Text style={styles.discountBadge}>{discount}% OFF</Text>}
						</View>
						<View style={styles.titleRow}>
							<Text style={styles.productName}>{product.name}</Text>
							<TouchableOpacity
								style={[styles.favoriteButton, favoriteIds.includes(product.id) && styles.favoriteButtonActive]}
								onPress={() => handleFavorite(product.id)}
								accessibilityRole="button"
								accessibilityLabel={`${favoriteIds.includes(product.id) ? 'Remover' : 'Adicionar'} aos favoritos`}
							>
								<MaterialCommunityIcons name={favoriteIds.includes(product.id) ? 'heart' : 'heart-outline'} size={23} color={tc(COLORS.white)} />
							</TouchableOpacity>
						</View>
						<Text style={styles.averageWeight}>{product.unitBase && product.unitBase !== 'g' ? `Venda por ${product.unit}` : `Aprox. ${product.averageWeightGrams}g/cada`}</Text>
						<View style={styles.priceRow}>
							<Text style={styles.mainPrice}>{formatCurrency(product.pricePerKg)}<Text style={styles.priceUnit}>/{product.unitBase && product.unitBase !== 'g' ? product.unit : 'kg'}</Text></Text>
							{product.originalPricePerKg && (
								<Text style={styles.originalPrice}>
									{formatCurrency(product.originalPricePerKg)}/{product.unitBase && product.unitBase !== 'g' ? product.unit : 'kg'}
								</Text>
							)}
						</View>
						{product.originalPricePerKg && (
							<Text style={styles.savings}>
								Economize {formatCurrency(product.originalPricePerKg - product.pricePerKg)}
							</Text>
						)}
					</View>

					<View style={styles.weightSection}>
						<Text style={styles.weightHeading}>{product.unitBase && product.unitBase !== 'g' ? 'Unidade de venda:' : 'Selecione o peso:'}</Text>
						<View style={styles.weightOptions}>
							{visibleWeights.map((weight) => {
								const selected = selectedWeight === weight;
								return (
									<TouchableOpacity
										key={weight}
										style={[styles.weightOption, selected && styles.selectedWeight]}
										onPress={() => {
											setSelectedWeight(weight);
											setShowMoreWeights(false);
										}}
										accessibilityRole="button"
										accessibilityState={{ selected }}
									>
										<Text style={[styles.weightText, selected && styles.selectedWeightText]}>{formatProductUnit(product, weight)}</Text>
									</TouchableOpacity>
								);
							})}
							{extraWeights.length > 0 && (
								<TouchableOpacity
									style={[styles.moreWeight, showMoreWeights && styles.moreWeightOpen]}
									onPress={() => setShowMoreWeights((open) => !open)}
									accessibilityRole="button"
									accessibilityState={{ expanded: showMoreWeights }}
									accessibilityLabel={showMoreWeights ? 'Mostrar menos opções de peso' : 'Mais opções de peso'}
								>
									<Feather name={showMoreWeights ? 'minus' : 'plus'} size={19} color={tc(showMoreWeights ? COLORS.white : COLORS.dark)} />
								</TouchableOpacity>
							)}
						</View>
					</View>

					<View style={styles.similarSection}>
						<View style={styles.similarHeading}>
							<Text style={styles.similarTitle}>Produtos Semelhantes</Text>
							<LinkVerMais
								onPress={() => navigation.navigate('ProdutosCategoriaScreen', { categoria: product.category === 'HortiFruti' ? 'Horti-Fruti' : product.category })}
								accessibilityLabel={`Ver mais produtos de ${product.category}`}
							/>
						</View>
						{similarProducts.length > 0 ? (
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
								{similarProducts.map((similarProduct) => (
									<SimilarProductCard
										key={similarProduct.id}
										product={similarProduct}
										onPress={() => openProduct(similarProduct.id)}
										onFavorite={() => handleFavorite(similarProduct.id)}
										onAdd={() => handleAdd(similarProduct)}
										isFavorite={favoriteIds.includes(similarProduct.id)}
									/>
								))}
							</ScrollView>
						) : <Text style={styles.noSimilar}>Nenhum produto semelhante disponível.</Text>}
					</View>
				</ScrollView>

				<View style={styles.purchaseBar}>
					<View style={styles.totalBlock}>
						<Text style={styles.totalLabel}>Total:</Text>
						<Text style={styles.totalValue}>{formatCurrency(total)}</Text>
					</View>
					<TouchableOpacity style={styles.addButton} onPress={() => handleAdd()} accessibilityRole="button">
						<MaterialCommunityIcons name="shopping-outline" size={28} color={tc(COLORS.white)} />
						<Text style={styles.addButtonText}>Adicionar</Text>
					</TouchableOpacity>
				</View>
				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: COLORS.dark },
	topBand: { height: 40, backgroundColor: COLORS.dark },
	screen: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: COLORS.background,
		overflow: 'hidden',
	},
	unavailableProduct: { alignItems: 'center', justifyContent: 'center', padding: 24 },
	unavailableBack: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.mint },
	unavailableBackText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 16 },
	// Botões de voltar e sacola flutuam sobre a foto, como no protótipo.
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 2,
		paddingHorizontal: 16,
		paddingTop: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	roundButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	scroll: { flex: 1 },
	scrollContent: { paddingBottom: 18 },
	hero: { height: 330, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', paddingTop: 44, paddingHorizontal: 12, paddingBottom: 8 },
	heroImage: { width: '100%', height: '100%' },
	imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFCFC' },
	productInfo: { paddingHorizontal: 20, paddingTop: 12 },
	categoryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	category: { color: COLORS.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 21 },
	discountBadge: { color: COLORS.white, backgroundColor: COLORS.red, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 3, fontFamily: 'LilitaOne_400Regular', fontSize: 16, lineHeight: 22, includeFontPadding: false },
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
	productName: { flex: 1, color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 40 },
	favoriteButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
	favoriteButtonActive: { backgroundColor: COLORS.red },
	averageWeight: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 14, marginTop: -2 },
	priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', marginTop: 2 },
	mainPrice: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 42 },
	priceUnit: { fontSize: 26 },
	originalPrice: { color: COLORS.muted, textDecorationLine: 'line-through', fontFamily: 'Montserrat_700Bold', fontSize: 13 },
	savings: { color: COLORS.price, fontFamily: 'Montserrat_700Bold', fontSize: 13, marginTop: -2 },
	weightSection: { marginTop: 18, paddingHorizontal: 20, paddingBottom: 12 },
	weightHeading: { color: COLORS.black, fontFamily: 'Montserrat_700Bold', fontSize: 15, marginBottom: 10 },
	weightOptions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
	weightOption: { minWidth: 56, height: 36, paddingHorizontal: 10, borderWidth: 1.5, borderColor: COLORS.dark, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
	selectedWeight: { borderColor: COLORS.mint, backgroundColor: COLORS.mint },
	weightText: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 17 },
	selectedWeightText: { color: COLORS.white },
	moreWeight: { width: 36, height: 36, borderWidth: 1.5, borderColor: COLORS.dark, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
	moreWeightOpen: { borderColor: COLORS.dark, backgroundColor: COLORS.dark },
	similarSection: { backgroundColor: COLORS.background, paddingTop: 16, paddingBottom: 14 },
	similarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10 },
	similarTitle: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 23 },
	seeMore: { color: COLORS.black, fontFamily: 'Montserrat_500Medium', fontSize: 12 },
	similarList: { gap: 10, paddingHorizontal: 14, paddingBottom: 8, paddingTop: 2 },
	similarCard: {
		width: 172,
		minHeight: 210,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		padding: 12,
		position: 'relative',
		elevation: 3,
		shadowColor: COLORS.black,
		shadowOpacity: 0.08,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	similarMain: { flex: 1, alignItems: 'flex-start' },
	similarDiscount: { zIndex: 1, position: 'absolute', top: 0, left: 0, color: COLORS.white, backgroundColor: COLORS.red, borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, fontFamily: 'LilitaOne_400Regular', fontSize: 12 },
	similarImage: { alignSelf: 'center', width: 136, height: 98, marginTop: 18 },
	similarHeart: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark },
	favoriteActive: { backgroundColor: COLORS.red },
	similarName: { color: '#226842', fontFamily: 'LilitaOne_400Regular', fontSize: 20, marginTop: 4, paddingRight: 36 },
	similarWeight: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 11 },
	similarAverage: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 10 },
	similarPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
	similarPrice: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 20 },
	similarOldPrice: { color: COLORS.muted, textDecorationLine: 'line-through', fontFamily: 'Montserrat_500Medium', fontSize: 11 },
	similarAdd: { position: 'absolute', right: 12, bottom: 58, width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	noSimilar: { paddingHorizontal: 14, paddingVertical: 17, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12 },
	purchaseBar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.background },
	totalBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
	totalLabel: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 23 },
	totalValue: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 24 },
	addButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 14, backgroundColor: COLORS.price },
	addButtonText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 24 },
}));
