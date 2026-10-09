import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Image,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import useSacolaCount, { publishSacolaCount } from '../Componentes/useSacolaCount';
import { formatCurrency, formatWeight, getProductById, getProductPrice, PRODUCTS } from '../Config/Produtos';
import { addProductToCart, getFavorites, toggleFavorite } from '../Config/ProdutoStorage';

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
				<Text style={styles.similarName} numberOfLines={1}>{product.name}</Text>
				<Text style={styles.similarWeight}>{formatWeight(weight)}</Text>
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
				<MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={15} color={isFavorite ? COLORS.red : COLORS.dark} />
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.similarAdd}
				onPress={onAdd}
				accessibilityRole="button"
				accessibilityLabel={`Adicionar ${product.name} à sacola`}
			>
				<Feather name="plus" size={16} color={COLORS.white} />
			</TouchableOpacity>
		</View>
	);
}

export default function DetalheProduto({ navigation, route }) {
	const product = getProductById(route?.params?.productId) || PRODUCTS[0];
	const bagCount = useSacolaCount();
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [selectedWeight, setSelectedWeight] = useState(product.defaultWeightGrams);
	const [favoriteIds, setFavoriteIds] = useState([]);
	const total = getProductPrice(product, selectedWeight);
	const discount = calculateDiscount(product);
	const similarProducts = useMemo(
		() => PRODUCTS.filter((item) => item.id !== product.id && item.category === product.category),
		[product.id, product.category],
	);

	useEffect(() => {
		setSelectedWeight(product.defaultWeightGrams);
	}, [product.id, product.defaultWeightGrams]);

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

	if (!fontsLoaded) return null;

	async function handleFavorite(productId) {
		try {
			const result = await toggleFavorite(productId);
			setFavoriteIds(result.favoriteIds);
		} catch {
			Alert.alert('Favoritos', 'Não foi possível atualizar seus favoritos.');
		}
	}

	async function handleAdd(productToAdd = product, weightGrams = selectedWeight) {
		try {
			const nextItems = await addProductToCart(productToAdd, weightGrams);
			publishSacolaCount(nextItems);
			Alert.alert('Sacola', `${productToAdd.name} adicionado à sacola.`);
		} catch {
			Alert.alert('Sacola', 'Não foi possível adicionar o produto.');
		}
	}

	function selectExtraWeight() {
		const available = [...BASE_WEIGHTS, ...EXTRA_WEIGHTS]
			.filter((weight) => !product.availableWeights.includes(weight));
		if (available.length === 0) return;
		Alert.alert('Outros pesos', 'Selecione um peso disponível:', [
			...available.map((weight) => ({ text: formatWeight(weight), onPress: () => setSelectedWeight(weight) })),
			{ text: 'Cancelar', style: 'cancel' },
		]);
	}

	function openProduct(productId) {
		if (productId !== product.id) navigation.push('TelaDetalheProduto', { productId });
	}

	function goBack() {
		if (navigation?.canGoBack()) navigation.goBack();
		else navigation?.navigate('TelaHome');
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<TouchableOpacity style={styles.roundButton} onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar">
						<Feather name="chevron-left" size={27} color={COLORS.white} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.bagButton}
						onPress={() => navigation.navigate('TelaSacola')}
						accessibilityRole="button"
						accessibilityLabel="Abrir sacola"
					>
						<Feather name="shopping-bag" size={22} color={COLORS.white} />
						{bagCount > 0 && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{bagCount > 99 ? '99+' : bagCount}</Text></View>}
					</TouchableOpacity>
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
								style={styles.favoriteButton}
								onPress={() => handleFavorite(product.id)}
								accessibilityRole="button"
								accessibilityLabel={`${favoriteIds.includes(product.id) ? 'Remover' : 'Adicionar'} aos favoritos`}
							>
								<MaterialCommunityIcons name={favoriteIds.includes(product.id) ? 'heart' : 'heart-outline'} size={23} color={favoriteIds.includes(product.id) ? COLORS.red : COLORS.white} />
							</TouchableOpacity>
						</View>
						<Text style={styles.averageWeight}>Aprox. {product.averageWeightGrams}g/cada</Text>
						<View style={styles.priceRow}>
							<Text style={styles.mainPrice}>{formatCurrency(product.pricePerKg)}<Text style={styles.priceUnit}>/kg</Text></Text>
							{product.originalPricePerKg && (
								<Text style={styles.originalPrice}>
									{formatCurrency(product.originalPricePerKg)}/kg
								</Text>
							)}
						</View>
						{product.originalPricePerKg && (
							<Text style={styles.savings}>
								Economize {formatCurrency(product.originalPricePerKg - product.pricePerKg)} por kg
							</Text>
						)}
					</View>

					<View style={styles.weightSection}>
						<Text style={styles.weightHeading}>Selecione o peso:</Text>
						<View style={styles.weightOptions}>
							{product.availableWeights.slice(0, 4).map((weight) => {
								const selected = selectedWeight === weight;
								return (
									<TouchableOpacity
										key={weight}
										style={[styles.weightOption, selected && styles.selectedWeight]}
										onPress={() => setSelectedWeight(weight)}
										accessibilityRole="button"
										accessibilityState={{ selected }}
									>
										<Text style={[styles.weightText, selected && styles.selectedWeightText]}>{formatWeight(weight)}</Text>
									</TouchableOpacity>
								);
							})}
							<TouchableOpacity style={styles.moreWeight} onPress={selectExtraWeight} accessibilityRole="button" accessibilityLabel="Mais opções de peso">
								<Feather name="plus" size={19} color={COLORS.dark} />
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.similarSection}>
						<View style={styles.similarHeading}>
							<Text style={styles.similarTitle}>Produtos Semelhantes</Text>
							<TouchableOpacity onPress={() => navigation.navigate('TelaProdutos')} accessibilityRole="button">
								<Text style={styles.seeMore}>Ver mais ›</Text>
							</TouchableOpacity>
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
						<Feather name="shopping-bag" size={22} color={COLORS.white} />
						<Text style={styles.addButtonText}>Adicionar</Text>
					</TouchableOpacity>
				</View>
				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: COLORS.dark },
	topBand: { height: 40, backgroundColor: COLORS.dark },
	screen: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: COLORS.white,
		overflow: 'hidden',
	},
	header: {
		height: 58,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: COLORS.white,
	},
	roundButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	bagButton: { width: 40, height: 38, borderRadius: 10, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	headerBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
	headerBadgeText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 9 },
	scroll: { flex: 1 },
	scrollContent: { paddingBottom: 18 },
	hero: { height: 252, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
	heroImage: { width: '100%', height: '100%' },
	imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFCFC' },
	productInfo: { paddingHorizontal: 21, paddingTop: 4 },
	categoryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	category: { color: COLORS.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 21 },
	discountBadge: { color: COLORS.white, backgroundColor: COLORS.red, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 4, fontFamily: 'LilitaOne_400Regular', fontSize: 13 },
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -1 },
	productName: { flex: 1, color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 39 },
	favoriteButton: { width: 43, height: 43, borderRadius: 22, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
	averageWeight: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 14, marginTop: -2 },
	priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 1 },
	mainPrice: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 37 },
	priceUnit: { fontSize: 21 },
	originalPrice: { color: COLORS.muted, textDecorationLine: 'line-through', fontFamily: 'Montserrat_400Regular', fontSize: 14 },
	savings: { color: COLORS.price, fontFamily: 'Montserrat_500Medium', fontSize: 13, marginTop: -2 },
	weightSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D8DEDB', marginTop: 13, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 11 },
	weightHeading: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 16, marginBottom: 8 },
	weightOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
	weightOption: { minWidth: 55, height: 35, paddingHorizontal: 9, borderWidth: 1, borderColor: COLORS.price, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
	selectedWeight: { borderColor: COLORS.mint, backgroundColor: COLORS.mint },
	weightText: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 14 },
	selectedWeightText: { color: COLORS.white },
	moreWeight: { width: 34, height: 34, borderWidth: 1, borderColor: COLORS.price, borderRadius: 17, backgroundColor: '#F7FCFA', alignItems: 'center', justifyContent: 'center' },
	similarSection: { backgroundColor: COLORS.background, paddingTop: 12, paddingBottom: 13 },
	similarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, marginBottom: 8 },
	similarTitle: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 22 },
	seeMore: { color: COLORS.black, fontFamily: 'Montserrat_400Regular', fontSize: 11 },
	similarList: { gap: 9, paddingHorizontal: 13, paddingBottom: 3 },
	similarCard: { width: 145, minHeight: 172, borderRadius: 9, backgroundColor: COLORS.white, padding: 8, position: 'relative' },
	similarMain: { flex: 1, alignItems: 'flex-start' },
	similarDiscount: { zIndex: 1, position: 'absolute', top: 1, left: 0, color: COLORS.white, backgroundColor: COLORS.red, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, fontFamily: 'LilitaOne_400Regular', fontSize: 8 },
	similarImage: { alignSelf: 'center', width: 105, height: 83, marginTop: 3 },
	similarHeart: { position: 'absolute', top: 7, right: 7, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F2EE' },
	favoriteActive: { backgroundColor: '#FFE9E9' },
	similarName: { color: '#226842', fontFamily: 'LilitaOne_400Regular', fontSize: 16, marginTop: 1 },
	similarWeight: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 9 },
	similarPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
	similarPrice: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 13 },
	similarOldPrice: { color: COLORS.muted, textDecorationLine: 'line-through', fontFamily: 'Montserrat_400Regular', fontSize: 8 },
	similarAdd: { position: 'absolute', right: 7, bottom: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	noSimilar: { paddingHorizontal: 14, paddingVertical: 17, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12 },
	purchaseBar: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.white },
	totalBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
	totalLabel: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 20 },
	totalValue: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 21 },
	addButton: { flex: 1, minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 11, backgroundColor: COLORS.price },
	addButtonText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 22 },
});
