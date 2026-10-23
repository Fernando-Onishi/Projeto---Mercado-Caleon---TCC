import React from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BotaoSacola from '../Componentes/BotaoSacola';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';

const COLORS = {
	primaryDark: '#1B4B3D',
	primaryLight: '#40B190',
	icon: '#194B38',
	background: '#F1F3F5',
	white: '#FFFFFF',
	black: '#000000',
	cardBorder: '#EAEAEA',
};

const categories = [
	{ name: 'Horti-Fruti', routeCategory: 'Horti-Fruti', icon: 'food-apple-outline' },
	{ name: 'Carnes', icon: 'food-steak' },
	{ name: 'Bebidas', icon: 'cup-outline' },
	{ name: 'Laticínios', icon: 'cheese' },
	{ name: 'Doces', icon: 'candy-outline' },
	{ name: 'Congelados', icon: 'snowflake' },
	{ name: 'Higiene', icon: 'hand-wash' },
	{ name: 'Padaria', icon: 'bread-slice' },
	{ name: 'Limpeza', icon: 'spray-bottle' },
];

export default function TelaProdutos({ navigation, onBack }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	if (!fontsLoaded) return null;

	function goBack() {
		if (onBack) {
			onBack();
		} else if (navigation?.canGoBack()) {
			navigation.goBack();
		} else {
			navigation?.navigate('TelaHome');
		}
	}

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar style="light" backgroundColor={COLORS.primaryDark} />
			<View style={styles.topBand} />
			<View style={styles.screenPanel}>
				<View style={styles.header}>
					<View style={styles.headerActions}>
						<CircularIconButton
							style={styles.backButton}
							borderRadius={12}
							icon={<Feather name="chevron-left" size={27} color={COLORS.white} />}
							onPress={goBack}
							accessibilityLabel="Voltar"
						/>
						<BotaoSacola navigation={navigation} size={40} />
					</View>
					<Text style={styles.title}>Produtos</Text>
					<Text style={styles.subtitle}>Categorias</Text>
				</View>

				<View style={styles.content}>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.contentContainer}
					>
						<View style={styles.categoriesGrid}>
							{categories.map((category) => (
								<TouchableOpacity
									key={category.name}
									style={styles.categoryCard}
									onPress={() => navigation.navigate('ProdutosCategoriaScreen', {
										categoria: category.routeCategory || category.name,
									})}
									activeOpacity={0.8}
									accessibilityRole="button"
									accessibilityLabel={`Ver produtos de ${category.name}`}
								>
									<View style={styles.categoryIcon}>
										<MaterialCommunityIcons
											name={category.icon}
											size={34}
											color={COLORS.icon}
										/>
									</View>
									<Text style={styles.categoryName}>{category.name}</Text>
								</TouchableOpacity>
							))}
						</View>
					</ScrollView>
				</View>

				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: COLORS.primaryDark,
	},
	topBand: {
		height: 40,
		backgroundColor: COLORS.primaryDark,
	},
	screenPanel: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: COLORS.background,
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
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		color: COLORS.black,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 30,
		marginTop: 14,
	},
	content: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	contentContainer: {
		paddingHorizontal: 20,
		paddingTop: 71,
		paddingBottom: 22,
	},
	subtitle: {
		marginTop: 1,
		color: '#226842',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 18,
		textAlign: 'center',
	},
	categoriesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 14,
	},
	categoryCard: {
		width: '48%',
		minHeight: 137,
		padding: 20,
		borderWidth: 1,
		borderColor: COLORS.cardBorder,
		borderRadius: 18,
		backgroundColor: COLORS.white,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 5,
		elevation: 2,
	},
	selectedCategoryCard: {
		borderColor: COLORS.primaryLight,
	},
	categoryIcon: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: '#E6F4EF',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	categoryName: {
		color: COLORS.black,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 20,
		textAlign: 'center',
	},
});