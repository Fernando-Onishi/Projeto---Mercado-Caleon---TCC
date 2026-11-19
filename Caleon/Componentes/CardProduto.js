import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatCurrency } from '../Config/Produtos';
import { themedStyles, tc } from '../Config/Tema';

// Card de produto do cliente: o mesmo na Home, nas categorias e em qualquer lista de produtos.

const COLORS = {
	green: '#1B4B3D',
	lightGreen: '#00AA6A',
	red: '#FF383C',
	white: '#FFFFFF',
};

// Alvos de toque mínimos recomendados para celular (Android 48dp / iOS 44pt).
const MIN_TOUCH = 44;
const MIN_HEART = 36;

const asMoney = (value) => (typeof value === 'number' ? formatCurrency(value) : value);

export default function CardProduto({ product, width, onOpen, onToggleCart, onToggleFavorite, isFavorite, isInCart, style }) {
	const scale = width / 130;
	const heartSize = Math.max(MIN_HEART, width * 0.17);
	const price = asMoney(product.price);
	const originalPrice = product.originalPrice ? asMoney(product.originalPrice) : null;

	return (
		<View style={[styles.productCard, {
			width,
			padding: width * 0.07,
			borderRadius: width * 0.1,
		}, style]}>
			<TouchableOpacity onPress={onOpen} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${product.name}`}>
				<View style={[styles.productImage, {
					height: width * 0.56,
					borderRadius: width * 0.06,
				}]}>
					{product.imageUrl ? (
						<Image source={{ uri: product.imageUrl }} style={styles.productImageContent} resizeMode="contain" />
					) : (
						<MaterialCommunityIcons name="food-apple-outline" size={width * 0.3} color={tc('#40B190')} />
					)}
					{product.discount ? <Text style={[styles.discount, {
						left: 2 * scale,
						top: 2 * scale,
						fontSize: 9 * scale,
						paddingHorizontal: 5 * scale,
						paddingVertical: 2 * scale,
						borderRadius: 15 * scale,
					}]}>{product.discount}</Text> : null}
					<TouchableOpacity
						style={[styles.heartButton, isFavorite && styles.heartButtonActive, {
							right: width * 0.05,
							top: width * 0.05,
							width: heartSize,
							height: heartSize,
							borderRadius: heartSize / 2,
						}]}
						hitSlop={6}
						onPress={(event) => { event.stopPropagation(); onToggleFavorite(product.id); }}
						accessibilityRole="button"
						accessibilityLabel={`${isFavorite ? 'Remover' : 'Adicionar'} ${product.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
					>
						<MaterialCommunityIcons
							name={isFavorite ? 'heart' : 'heart-outline'}
							size={heartSize * 0.55}
							color={tc(COLORS.white)}
						/>
					</TouchableOpacity>
				</View>
				<Text style={[styles.productName, { fontSize: 12 * scale, marginTop: 6 * scale }]} numberOfLines={1}>
					{product.name} <Text style={[styles.weight, { fontSize: 8.5 * scale }]}>{product.weight}</Text>
				</Text>
				<View style={[styles.priceRow, { marginTop: 1 * scale }]}>
					<Text style={[styles.price, { fontSize: 18 * scale }]}>{price}</Text>
					{originalPrice ? (
						<Text style={[styles.originalPrice, { fontSize: 8.5 * scale }]}>{originalPrice}</Text>
					) : null}
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.addButton, isInCart && styles.addedButton, {
					height: Math.max(MIN_TOUCH, width * 0.2),
					borderRadius: width * 0.07,
					marginTop: width * 0.04,
				}]}
				activeOpacity={0.8}
				onPress={() => onToggleCart(product, isInCart)}
				accessibilityRole="button"
				accessibilityLabel={`${product.name}, ${isInCart ? 'remover da' : 'adicionar à'} sacola`}
			>
				<MaterialCommunityIcons name={isInCart ? 'shopping' : 'shopping-outline'} size={12 * scale} color={tc(COLORS.white)} />
				<Text style={[styles.addButtonText, { fontSize: 9 * scale }]} numberOfLines={1} adjustsFontSizeToFit>
					{isInCart ? 'Adicionado' : 'Adicionar à sacola'}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	productCard: {
		backgroundColor: COLORS.white,
		elevation: 3,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
	},
	productImage: {
		backgroundColor: COLORS.white,
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
		backgroundColor: COLORS.green,
		alignItems: 'center',
		justifyContent: 'center',
	},
	heartButtonActive: {
		backgroundColor: COLORS.red,
	},
	discount: {
		position: 'absolute',
		backgroundColor: '#FF3B30',
		color: COLORS.white,
		fontFamily: 'LilitaOne_400Regular',
		overflow: 'hidden',
	},
	productName: {
		color: COLORS.green,
		fontFamily: 'Montserrat_700Bold',
	},
	weight: {
		color: '#7e8985',
		fontFamily: 'Montserrat_400Regular',
	},
	price: {
		color: COLORS.green,
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
		backgroundColor: COLORS.green,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	addedButton: {
		backgroundColor: COLORS.lightGreen,
		borderColor: '#008F5A',
	},
	addButtonText: {
		color: COLORS.white,
		fontFamily: 'Montserrat_500Medium',
	},
}));
