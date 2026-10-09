import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import {
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';

const COLORS = {
	primaryDark: '#1B4B3D',
	primaryLight: '#40B190',
	background: '#F1F3F5',
	white: '#FFFFFF',
	black: '#000000',
	cardBorder: '#BFBFBF',
	notification: '#FF0000',
};

const categories = [
	{ name: 'Hortifruti', icon: 'food-apple-outline' },
	{ name: 'Carnes', icon: 'food-steak' },
	{ name: 'Bebidas', icon: 'cup-outline' },
	{ name: 'Laticínios', icon: 'cheese' },
	{ name: 'Limpeza', icon: 'spray-bottle' },
];

function NotificationBadge() {
	return (
		<View style={styles.badge}>
			<Text style={styles.badgeText}>1</Text>
		</View>
	);
}

export default function TelaProdutos({ navigation, onBack }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [selectedCategory, setSelectedCategory] = useState(null);

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
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="light" backgroundColor={COLORS.primaryDark} />
			<View style={styles.topBand} />
			<View style={styles.screenPanel}>
				<View style={styles.header}>
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={goBack}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel="Voltar"
						>
							<Feather name="chevron-left" size={27} color={COLORS.white} />
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.bagButton}
							activeOpacity={0.8}
							onPress={() => navigation?.navigate('TelaSacola')}
							accessibilityRole="button"
							accessibilityLabel="Sacola, 1 item"
						>
							<Feather name="shopping-bag" size={22} color={COLORS.white} />
							<NotificationBadge />
						</TouchableOpacity>
					</View>
					<Text style={styles.title}>Produtos</Text>
				</View>

				<View style={styles.content}>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.contentContainer}
					>
						<View style={styles.sectionHeading}>
							<Text style={styles.sectionTitle}>Categorias</Text>
						</View>
						<View style={styles.categoriesGrid}>
							{categories.map((category) => {
								const selected = selectedCategory === category.name;

								return (
									<TouchableOpacity
										key={category.name}
										style={[styles.categoryCard, selected && styles.selectedCategoryCard]}
										onPress={() => setSelectedCategory(category.name)}
										activeOpacity={0.8}
										accessibilityRole="button"
										accessibilityState={{ selected }}
									>
										<View style={styles.categoryIcon}>
											<MaterialCommunityIcons
												name={category.icon}
												size={34}
												color={COLORS.primaryLight}
											/>
										</View>
										<Text style={styles.categoryName}>{category.name}</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</ScrollView>
				</View>

				<NavegacaoInferior activeTab="Catálogo" navigation={navigation} />
			</View>
		</SafeAreaView>
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
		height: 116,
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
		width: 42,
		height: 42,
		borderRadius: 21,
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
	bagButton: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		top: -4,
		right: -5,
		minWidth: 17,
		height: 17,
		paddingHorizontal: 3,
		borderRadius: 9,
		backgroundColor: COLORS.notification,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: COLORS.white,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 10,
		lineHeight: 13,
	},
	content: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	contentContainer: {
		paddingHorizontal: 20,
		paddingTop: 25,
		paddingBottom: 22,
	},
	sectionHeading: {
		marginBottom: 17,
	},
	sectionTitle: {
		color: COLORS.black,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 24,
	},
	categoriesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 14,
	},
	categoryCard: {
		width: '47%',
		minHeight: 137,
		paddingVertical: 17,
		paddingHorizontal: 8,
		borderWidth: 1,
		borderColor: COLORS.cardBorder,
		borderRadius: 16,
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
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: COLORS.background,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 11,
	},
	categoryName: {
		color: COLORS.black,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 23,
		textAlign: 'center',
	},
});