import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { auth } from '../Config/FireBaseConfig';

const colors = {
	green: '#075841',
	brightGreen: '#07945d',
	ink: '#111715',
	muted: '#75807c',
	surface: '#f5f7f7',
	white: '#ffffff',
};

const products = [
	{ name: 'Maçã', price: 'R$ 3,99', weight: '500g', discount: '20% OFF', emoji: '🍎' },
	{ name: 'Maçã', price: 'R$ 3,99', weight: '500g', discount: '18% OFF', emoji: '🍎' },
	{ name: 'Maçã', price: 'R$ 3,99', weight: '500g', discount: '20% OFF', emoji: '🍎' },
];

const categories = ['Hortifruti', 'Carnes', 'Bebidas', 'Laticínios', 'Limpeza'];

function ProductCard({ product }) {
	return (
		<View style={styles.productCard}>
			<View style={styles.productImage}>
				<Text style={styles.discount}>{product.discount}</Text>
				<Text style={styles.heart}>♡</Text>
				<Text style={styles.productEmoji}>{product.emoji}</Text>
			</View>
			<Text style={styles.productName}>{product.name} <Text style={styles.weight}>{product.weight}</Text></Text>
			<Text style={styles.price}>{product.price}</Text>
			<TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
				<Text style={styles.addButtonText}>＋ Adicionar à sacola</Text>
			</TouchableOpacity>
		</View>
	);
}

function ProductSection({ title }) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
				<TouchableOpacity>
					<Text style={styles.seeAll}>Ver mais ›</Text>
				</TouchableOpacity>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
				{products.map((product, index) => <ProductCard product={product} key={`${title}-${index}`} />)}
			</ScrollView>
		</View>
	);
}

export default function Home() {
	const [userName, setUserName] = useState('usuário');

	useEffect(() => onAuthStateChanged(auth, (user) => {
		setUserName(user?.displayName?.trim() || 'usuário');
	}), []);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.locationIcon}><Text style={styles.pin}>⌖</Text></View>
				<View style={styles.locationText}>
					<Text style={styles.greeting} numberOfLines={1}>Olá, {userName}</Text>
					<Text style={styles.address}>R. Joaquim Nabuco, 131 - Fátima</Text>
					<Text style={styles.cep}>61760-640</Text>
				</View>
				<TouchableOpacity style={styles.bagButton}>
					<Text style={styles.bagIcon}>♧</Text>
					<View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
				</TouchableOpacity>
			</View>

			<View style={styles.contentArea}>
				<View style={styles.searchBox}>
					<Text style={styles.searchIcon}>⌕</Text>
					<TextInput placeholder="Pesquise produtos, categorias" placeholderTextColor="#8b9491" style={styles.searchInput} />
				</View>
				<View style={styles.bannerRow}>
					<View style={[styles.banner, styles.bannerWide]} />
					<View style={styles.banner} />
				</View>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
					{categories.map((category) => <TouchableOpacity key={category} style={styles.category}><Text style={styles.categoryText}>{category}</Text></TouchableOpacity>)}
				</ScrollView>
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<ProductSection title="Em Destaque" />
					<ProductSection title="Em Promoção" />
					<ProductSection title="Produtos" />
				</ScrollView>
			</View>

			<View style={styles.tabBar}>
				{[
					['⌂', 'Início', true], ['♡', 'Favoritos'], ['♧', 'Sacola'], ['▣', 'Catálogo'], ['♙', 'Perfil'],
				].map(([icon, label, active]) => (
					<TouchableOpacity style={styles.tab} key={label}>
						<View style={active ? styles.activeTabIcon : styles.tabIcon}><Text style={active ? styles.activeIconText : styles.iconText}>{icon}</Text></View>
						<Text style={active ? styles.activeTabLabel : styles.tabLabel}>{label}</Text>
					</TouchableOpacity>
				))}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.surface,
	},
	contentArea: {
		flex: 1,
		paddingTop: 12,
	},

	header: {
		height: 76,
		backgroundColor: colors.green,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	locationIcon: {
		width: 33,
		height: 33,
		borderRadius: 17,
		borderWidth: 1,
		borderColor: '#8ad4b8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	pin: {
		color: colors.white,
		fontSize: 21,
	},
	locationText: {
		flex: 1,
		marginLeft: 9,
	},
	greeting: {
		color: colors.white,
		fontWeight: '800',
		fontSize: 12,
	},
	address: {
		color: colors.white,
		fontSize: 9,
		marginTop: 3,
	},
	cep: {
		color: '#9dc6b7',
		fontSize: 8,
		marginTop: 2,
	},
	bagButton: {
		width: 34,
		height: 34,
		borderRadius: 9,
		backgroundColor: '#31ac7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bagIcon: {
		color: colors.white,
		fontSize: 22,
		lineHeight: 24,
	},
	badge: {
		position: 'absolute',
		right: -3,
		top: -4,
		backgroundColor: '#ff3f44',
		borderRadius: 8,
		minWidth: 13,
		height: 13,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: colors.white,
		fontSize: 8,
		fontWeight: '800',
	},

	searchBox: {
		height: 34,
		marginHorizontal: 18,
		borderRadius: 20,
		backgroundColor: '#dfe2e2',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 11,
	},
	searchIcon: {
		color: '#61706d',
		fontSize: 21,
		marginRight: 7,
	},
	searchInput: {
		flex: 1,
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
		paddingHorizontal: 18,
		gap: 5,
		paddingVertical: 10,
	},
	category: {
		backgroundColor: colors.green,
		paddingHorizontal: 8,
		height: 21,
		justifyContent: 'center',
		borderRadius: 11,
	},
	categoryText: {
		color: colors.white,
		fontSize: 8,
		fontWeight: '700',
	},

	scrollContent: {
		paddingBottom: 10,
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
		fontSize: 14,
		fontWeight: '900',
	},
	seeAll: {
		color: '#656f6c',
		fontSize: 9,
	},
	productsRow: {
		gap: 7,
		paddingHorizontal: 18,
		paddingBottom: 10,
	},
	productCard: {
		width: 145,
		minHeight: 143,
		padding: 7,
		backgroundColor: colors.white,
		borderRadius: 9,
	},
	productImage: {
		height: 61,
		backgroundColor: '#f7f7f7',
		borderRadius: 7,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	discount: {
		position: 'absolute',
		left: 2,
		top: 3,
		backgroundColor: '#ff3036',
		color: colors.white,
		fontSize: 6,
		fontWeight: '800',
		paddingHorizontal: 3,
		borderRadius: 3,
	},
	heart: {
		position: 'absolute',
		right: 3,
		top: 2,
		color: colors.green,
		backgroundColor: '#d7ece4',
		borderRadius: 8,
		fontSize: 11,
		width: 13,
		height: 13,
		lineHeight: 12,
		textAlign: 'center',
	},
	productEmoji: {
		fontSize: 39,
	},
	productName: {
		color: colors.green,
		fontSize: 10,
		fontWeight: '800',
		marginTop: 4,
	},
	weight: {
		color: '#7e8985',
		fontSize: 7,
		fontWeight: '500',
	},
	price: {
		color: colors.brightGreen,
		fontSize: 12,
		fontWeight: '900',
		marginTop: 1,
	},
	addButton: {
		height: 15,
		borderRadius: 8,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
	},
	addButtonText: {
		color: colors.white,
		fontSize: 6,
		fontWeight: '700',
	},

	tabBar: {
		height: 56,
		borderTopWidth: 1,
		borderTopColor: '#d7dddd',
		backgroundColor: colors.white,
		flexDirection: 'row',
		justifyContent: 'space-around',
		paddingTop: 5,
	},
	tab: {
		alignItems: 'center',
		width: 55,
	},
	tabIcon: {
		height: 27,
		justifyContent: 'center',
	},
	activeTabIcon: {
		width: 24,
		height: 24,
		borderRadius: 6,
		backgroundColor: colors.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: {
		color: '#7a8381',
		fontSize: 20,
	},
	activeIconText: {
		color: colors.white,
		fontSize: 20,
		lineHeight: 22,
	},
	tabLabel: {
		color: '#7a8381',
		fontSize: 8,
		marginTop: 2,
	},
	activeTabLabel: {
		color: colors.green,
		fontSize: 8,
		fontWeight: '800',
		marginTop: 2,
	},
});
