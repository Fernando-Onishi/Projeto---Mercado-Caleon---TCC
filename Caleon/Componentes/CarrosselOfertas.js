import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { themedStyles, tc } from '../Config/Tema';

// Banners automáticos com as ofertas reais do catálogo (usado quando o admin não cadastrou banners).

const COLORS = {
	green: '#1B4B3D',
	greenSoft: '#2A6552',
	mint: '#40B190',
	yellow: '#FFC928',
	red: '#FF383C',
	white: '#FFFFFF',
	mintText: '#A8E8D1',
};
const AUTOPLAY_MS = 4000;
const HEIGHT = 150;
const MAX_PRODUCTS = 6;

function discountOf(product) {
	return Number(String(product.discount || '').replace(/\D/g, '')) || 0;
}

function SlideResumo({ width, maxDiscount, count, onPress }) {
	return (
		<TouchableOpacity style={[styles.slide, { width }]} onPress={onPress} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`Ofertas da semana, até ${maxDiscount}% de desconto. Ver ofertas`}>
			<View style={styles.copy}>
				<View style={styles.kicker}>
					<MaterialCommunityIcons name="tag-heart" size={14} color={tc(COLORS.green)} />
					<Text style={styles.kickerText}>OFERTAS DA SEMANA</Text>
				</View>
				<Text style={styles.bigTitle}>Até {maxDiscount}% OFF</Text>
				<Text style={styles.subtitle}>{count} {count === 1 ? 'produto' : 'produtos'} com desconto hoje</Text>
				<View style={styles.cta}>
					<Text style={styles.ctaText}>Ver ofertas</Text>
					<Feather name="arrow-right" size={14} color={tc(COLORS.green)} />
				</View>
			</View>
			<View style={styles.bigIcon}>
				<MaterialCommunityIcons name="percent-outline" size={70} color={tc(COLORS.yellow)} />
			</View>
		</TouchableOpacity>
	);
}

function SlideProduto({ width, product, onPress }) {
	return (
		<TouchableOpacity style={[styles.slide, { width }]} onPress={onPress} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`Oferta: ${product.name}, ${product.discount}, por ${product.price}`}>
			<View style={styles.copy}>
				<View style={[styles.kicker, styles.kickerRed]}>
					<Text style={[styles.kickerText, styles.kickerTextLight]}>{product.discount}</Text>
				</View>
				<Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
				<Text style={styles.oldPrice}>de {product.originalPrice}</Text>
				<Text style={styles.newPrice}>por {product.price}<Text style={styles.unit}> / {product.weight}</Text></Text>
			</View>
			<View style={styles.imageWrap}>
				{product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" /> : null}
			</View>
		</TouchableOpacity>
	);
}

/**
 * products: produtos da Home (com price, originalPrice, discount e weight já formatados).
 * onOpenProduct(product) e onSeeOffers(): para onde levar o toque.
 */
export default function CarrosselOfertas({ products, width, onOpenProduct, onSeeOffers }) {
	const listRef = useRef(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const touching = useRef(false);

	const offers = useMemo(
		() => products.filter((product) => product.discount && product.originalPrice).sort((a, b) => discountOf(b) - discountOf(a)),
		[products],
	);
	const slides = useMemo(() => (offers.length
		? [{ key: 'resumo' }, ...offers.slice(0, MAX_PRODUCTS).map((product) => ({ key: product.id, product }))]
		: []), [offers]);

	// Passa sozinho a cada 4 segundos (pausa enquanto a pessoa arrasta).
	useEffect(() => {
		if (slides.length < 2 || !width) return undefined;
		const timer = setInterval(() => {
			if (touching.current) return;
			setActiveIndex((current) => {
				const next = (current + 1) % slides.length;
				listRef.current?.scrollToOffset({ offset: next * width, animated: true });
				return next;
			});
		}, AUTOPLAY_MS);
		return () => clearInterval(timer);
	}, [slides.length, width]);

	if (!slides.length) {
		return (
			<View style={[styles.slide, styles.emptySlide, { width }]} accessibilityLabel="Nenhuma promoção ativa">
				<MaterialCommunityIcons name="tag-heart-outline" size={30} color={tc(COLORS.yellow)} />
				<View style={styles.copy}>
					<Text style={styles.productName}>Novas ofertas em breve</Text>
					<Text style={styles.subtitle}>Acompanhe aqui os próximos descontos</Text>
				</View>
			</View>
		);
	}

	return (
		<View>
			<FlatList
				ref={listRef}
				data={slides}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				decelerationRate="fast"
				keyExtractor={(slide) => slide.key}
				getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
				onScrollBeginDrag={() => { touching.current = true; }}
				onMomentumScrollEnd={(event) => {
					touching.current = false;
					setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
				}}
				renderItem={({ item }) => (item.product
					? <SlideProduto width={width} product={item.product} onPress={() => onOpenProduct(item.product)} />
					: <SlideResumo width={width} maxDiscount={discountOf(offers[0])} count={offers.length} onPress={onSeeOffers} />)}
			/>
			<View style={styles.dots} accessibilityLabel={`Oferta ${activeIndex + 1} de ${slides.length}`}>
				{slides.map((slide, index) => (
					<View key={slide.key} style={[styles.dot, index === activeIndex && styles.dotActive]} />
				))}
			</View>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	slide: { height: HEIGHT, borderRadius: 16, backgroundColor: COLORS.green, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 10, overflow: 'hidden' },
	emptySlide: { gap: 16, paddingRight: 18 },
	copy: { flex: 1, minWidth: 0 },
	kicker: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: COLORS.yellow },
	kickerRed: { backgroundColor: COLORS.red },
	kickerText: { color: COLORS.green, fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 0.4 },
	kickerTextLight: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 13, letterSpacing: 0 },
	bigTitle: { marginTop: 6, color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 30, lineHeight: 34 },
	subtitle: { marginTop: 2, color: COLORS.mintText, fontFamily: 'Montserrat_500Medium', fontSize: 12 },
	cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.white },
	ctaText: { color: COLORS.green, fontFamily: 'Montserrat_700Bold', fontSize: 12 },
	bigIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
	productName: { marginTop: 6, color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 17, lineHeight: 21 },
	oldPrice: { marginTop: 4, color: COLORS.mintText, fontFamily: 'Montserrat_500Medium', fontSize: 12, textDecorationLine: 'line-through' },
	newPrice: { color: COLORS.yellow, fontFamily: 'LilitaOne_400Regular', fontSize: 26 },
	unit: { color: COLORS.mintText, fontFamily: 'Montserrat_500Medium', fontSize: 11 },
	imageWrap: { width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	image: { width: '82%', height: '82%' },
	dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#B8C0BD' },
	dotActive: { width: 16, backgroundColor: COLORS.green },
}));
