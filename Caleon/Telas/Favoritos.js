import React, { useEffect, useRef, useState } from 'react';
import {
	Animated,
	Image,
	PanResponder,
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
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { formatCurrency, getProductPrice, PRODUCTS } from '../Config/Produtos';
import { getFavorites, toggleFavorite } from '../Config/ProdutoStorage';

const palette = {
	green: '#1b4b3d',
	mint: '#40b190',
	price: '#00a878',
	background: '#f1f2f3',
	muted: '#757575',
	white: '#ffffff',
	red: '#ff2929',
};

function FavoriteRow({ item, isOpen, width, onOpen, onDelete, onPress }) {
	const translateX = useRef(new Animated.Value(isOpen ? -80 : 0)).current;
	const openRef = useRef(isOpen);
	const onOpenRef = useRef(onOpen);
	openRef.current = isOpen;
	onOpenRef.current = onOpen;

	useEffect(() => {
		Animated.spring(translateX, {
			toValue: isOpen ? -80 : 0,
			useNativeDriver: true,
			bounciness: 0,
			speed: 22,
		}).start();
	}, [isOpen, translateX]);

	const panResponder = useRef(PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
		onPanResponderGrant: () => translateX.stopAnimation(),
		onPanResponderMove: (_, gesture) => {
			const start = openRef.current ? -80 : 0;
			translateX.setValue(Math.max(-80, Math.min(0, start + gesture.dx)));
		},
		onPanResponderRelease: (_, gesture) => {
			const shouldOpen = gesture.dx < -30 || (openRef.current && gesture.dx < 30);
			onOpenRef.current(shouldOpen ? item.id : null);
		},
		onPanResponderTerminate: () => onOpenRef.current(null),
	})).current;

	return (
		<View style={[styles.rowClip, { width }]}>
			<TouchableOpacity
				style={styles.deleteAction}
				onPress={() => onDelete(item.id)}
				accessibilityRole="button"
				accessibilityLabel={`Remover ${item.name} dos favoritos`}
			>
				<Feather name="trash-2" size={40} color={palette.white} />
			</TouchableOpacity>
			<Animated.View
				style={[styles.favoriteCard, { width, transform: [{ translateX }] }]}
				{...panResponder.panHandlers}
			>
				<TouchableOpacity style={styles.favoriteContent} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
					<Image source={{ uri: item.imageUrl }} style={styles.favoriteImage} resizeMode="contain" />
					<View style={styles.productDetails}>
						<Text style={styles.productName}>{item.name}</Text>
						<Text style={styles.currentPrice}>{formatCurrency(item.pricePerKg)}/kg</Text>
					</View>
					<Feather name="chevron-right" size={24} color="#111111" />
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

export default function Favoritos({ navigation }) {
	const { width } = useWindowDimensions();
	const [favorites, setFavorites] = useState([]);
	const [openId, setOpenId] = useState(null);
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	useEffect(() => {
		let active = true;
		async function loadFavorites() {
			const ids = await getFavorites();
			if (active) setFavorites(PRODUCTS.filter((product) => ids.includes(product.id)));
		}
		loadFavorites();
		const unsubscribe = navigation.addListener('focus', loadFavorites);
		return () => {
			active = false;
			unsubscribe();
		};
	}, [navigation]);

	if (!fontsLoaded) return null;

	async function removeFavorite(id) {
		try {
			await toggleFavorite(id);
			setFavorites((items) => items.filter((item) => item.id !== id));
			if (openId === id) setOpenId(null);
		} catch {
			Alert.alert('Favoritos', 'Não foi possível remover este produto.');
		}
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar backgroundColor={palette.green} barStyle="light-content" />
			<View style={styles.header}>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={styles.roundButton}
						onPress={() => navigation.navigate('TelaHome')}
						accessibilityRole="button"
						accessibilityLabel="Voltar"
					>
						<Feather name="chevron-left" size={28} color={palette.white} />
					</TouchableOpacity>
					<TouchableOpacity style={styles.cartButton} accessibilityRole="button" accessibilityLabel="Sacola, 1 item">
						<MaterialCommunityIcons name="shopping-bag-outline" size={28} color={palette.white} />
						<View style={styles.headerBadge}><Text style={styles.badgeText}>1</Text></View>
					</TouchableOpacity>
				</View>
				<Text style={styles.title}>Favoritos</Text>
			</View>

			<View style={styles.list}>
				{favorites.length === 0 && <Text style={styles.emptyFavorites}>Você ainda não favoritou produtos.</Text>}
				{favorites.map((item) => (
					<FavoriteRow
						key={item.id}
						item={item}
						width={width - 26}
						isOpen={openId === item.id}
						onOpen={setOpenId}
						onDelete={removeFavorite}
						onPress={() => navigation.navigate('TelaDetalheProduto', { productId: item.id })}
					/>
				))}
			</View>

			<NavegacaoInferior activeTab="Favoritos" navigation={navigation} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: palette.background,
	},
	header: {
		height: 134,
		paddingTop: 40,
		paddingHorizontal: 7,
		backgroundColor: palette.background,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	roundButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: palette.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cartButton: {
		width: 30,
		height: 30,
		borderRadius: 8,
		backgroundColor: palette.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerBadge: {
		position: 'absolute',
		right: -4,
		top: -4,
		width: 13,
		height: 13,
		borderRadius: 7,
		backgroundColor: palette.red,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: palette.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 8,
	},
	title: {
		marginTop: 9,
		color: '#050505',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 22,
		textAlign: 'center',
	},
	list: {
		flex: 1,
		paddingHorizontal: 13,
		paddingTop: 0,
		gap: 10,
	},
	emptyFavorites: {
		marginTop: 28,
		color: palette.muted,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 14,
		textAlign: 'center',
	},
	rowClip: {
		height: 85,
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
	favoriteCard: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		backgroundColor: palette.white,
		borderRadius: 13,
		overflow: 'hidden',
		elevation: 3,
		shadowColor: '#000000',
		shadowOpacity: 0.2,
		shadowRadius: 2,
		shadowOffset: { width: 0, height: 2 },
	},
	favoriteImage: {
		width: 60,
		height: 60,
		marginRight: 11,
	},
	favoriteContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
	},
	appleImage: {
		width: 58,
		fontSize: 30,
		letterSpacing: -15,
		marginRight: 10,
	},
	productDetails: {
		flex: 1,
	},
	productName: {
		color: '#236d47',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 18,
		lineHeight: 22,
	},
	currentPrice: {
		color: palette.price,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 14,
		lineHeight: 18,
	},
});