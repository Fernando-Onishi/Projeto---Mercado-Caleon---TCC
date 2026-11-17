import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import MapaPedido from '../Componentes/MapaPedido';
import { formatCurrency } from '../Config/Produtos';
import { STORE } from '../Config/Pagamento';
import {
	ORDER_STEPS,
	PAYMENT_LABELS,
	PAYMENT_STATUS_LABELS,
	formatTime,
	subscribeToOrder,
} from '../Config/Pedidos';

const COLORS = {
	dark: '#1B4B3D',
	mint: '#40B190',
	price: '#00AA6A',
	background: '#F1F3F5',
	white: '#FFFFFF',
	ink: '#183F35',
	muted: '#8A9490',
	line: '#C9D2CE',
	yellow: '#F2B24C',
	red: '#FF383C',
};

const HEADLINES = {
	recebido: `Pronto em até ${STORE.pickupMinutes} minutos`,
	preparando: 'Estamos separando seus produtos',
	pronto: 'Pronto para retirada!',
	retirado: 'Pedido retirado. Obrigado!',
	cancelado: 'Pedido cancelado pelo mercado',
};

function Timeline({ order }) {
	const currentIndex = ORDER_STEPS.findIndex((step) => step.key === order.status);
	return (
		<View style={styles.card}>
			{ORDER_STEPS.map((step, index) => {
				const done = order.status !== 'cancelado' && index <= currentIndex;
				const isLast = index === ORDER_STEPS.length - 1;
				const time = formatTime(order.statusHistory?.[step.key]);
				return (
					<View key={step.key} style={styles.step}>
						<View style={styles.stepRail}>
							{step.key === 'pronto' ? (
								<MaterialCommunityIcons name="map-marker" size={20} color={done ? COLORS.dark : COLORS.line} />
							) : (
								<View style={[styles.stepDot, done && styles.stepDotDone]} />
							)}
							{!isLast ? <View style={[styles.stepLine, index < currentIndex && order.status !== 'cancelado' && styles.stepLineDone]} /> : null}
						</View>
						<View style={styles.stepCopy}>
							<Text style={[styles.stepTitle, !done && styles.stepTitlePending]}>{step.label}</Text>
							{done && time ? (
								<Text style={styles.stepMeta}>{step.place}  •  {time}</Text>
							) : null}
						</View>
					</View>
				);
			})}
		</View>
	);
}

export default function PedidoAcompanhamento({ navigation, route }) {
	const orderId = route?.params?.orderId;
	const { height: windowHeight } = useWindowDimensions();
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [order, setOrder] = useState(undefined);
	const [showDetails, setShowDetails] = useState(false);

	// Atualiza sozinho quando o admin muda a etapa do pedido.
	useEffect(() => {
		if (!orderId) {
			setOrder(null);
			return undefined;
		}
		return subscribeToOrder(orderId, setOrder, (error) => {
			console.error('Não foi possível acompanhar o pedido.', error);
			setOrder(null);
		});
	}, [orderId]);

	function goBack() {
		if (navigation.canGoBack()) navigation.goBack();
		else navigation.navigate('TelaHome');
	}

	if (!fontsLoaded || order === undefined) {
		return (
			<View style={styles.loadingScreen}>
				<ActivityIndicator size="large" color={COLORS.white} />
			</View>
		);
	}

	const items = order?.items || [];
	const itemCount = items.reduce((sum, item) => sum + (Number(item.quantidade) || 1), 0);
	const itemNames = items.map((item) => item.nome).join(', ');
	const pickup = order?.pickup || STORE;
	const pixPending = order?.paymentMethod === 'pix' && order?.paymentStatus === 'aguardando' && order?.status !== 'cancelado';

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
					<MapaPedido
						store={{ latitude: pickup.latitude, longitude: pickup.longitude }}
						customer={order?.customerLocation || null}
						height={Math.round(windowHeight * 0.42)}
					/>

					{!order ? (
						<View style={[styles.card, styles.overlapCard]}>
							<Text style={styles.cardTitle}>Pedido não encontrado</Text>
							<Text style={styles.cardSubtitle}>Volte e abra o pedido pelo seu histórico.</Text>
						</View>
					) : (
						<>
							<View style={[styles.card, styles.overlapCard]}>
								<View style={styles.orderHeader}>
									<View style={[styles.orderIcon, order.status === 'cancelado' && { backgroundColor: COLORS.red }]}>
										<Feather name={order.status === 'cancelado' ? 'x' : 'shopping-bag'} size={24} color={COLORS.white} />
									</View>
									<View style={styles.flex}>
										<Text style={styles.cardTitle}>Seu Pedido #{order.number}</Text>
										<Text style={styles.cardSubtitle}>{HEADLINES[order.status] || ''}</Text>
									</View>
								</View>
								<View style={styles.divider} />
								<View style={styles.orderRow}>
									<View style={styles.flex}>
										<Text style={styles.itemNames} numberOfLines={1}>{itemNames}</Text>
										<Text style={styles.orderMeta}>
											<Text style={styles.orderMetaStrong}>{formatCurrency(Number(order.total) || 0)}</Text>
											{'  •  '}{itemCount} {itemCount === 1 ? 'item' : 'itens'}{'  •  '}{PAYMENT_LABELS[order.paymentMethod] || ''}
										</Text>
									</View>
									<TouchableOpacity
										style={styles.detailsButton}
										onPress={() => setShowDetails((open) => !open)}
										accessibilityRole="button"
										accessibilityState={{ expanded: showDetails }}
									>
										<Text style={styles.detailsButtonText}>{showDetails ? 'Fechar' : 'Detalhes'}</Text>
									</TouchableOpacity>
								</View>

								{showDetails ? (
									<View style={styles.details}>
										{items.map((item, index) => (
											<View key={`${item.productId}-${index}`} style={styles.detailRow}>
												{item.imagem ? <Image source={{ uri: item.imagem }} style={styles.detailImage} resizeMode="contain" /> : null}
												<Text style={styles.detailName} numberOfLines={1}>
													{item.quantidade}x {item.nome} <Text style={styles.detailWeight}>{item.peso}</Text>
												</Text>
												<Text style={styles.detailPrice}>{formatCurrency(Number(item.preco) || 0)}</Text>
											</View>
										))}
										<View style={styles.divider} />
										<Text style={styles.detailInfo}>Pagamento: {PAYMENT_LABELS[order.paymentMethod]}{order.cardLast4 ? ` final ${order.cardLast4}` : ''} — {PAYMENT_STATUS_LABELS[order.paymentStatus] || ''}</Text>
										<Text style={styles.detailInfo}>Retirada: {pickup.address}</Text>
									</View>
								) : null}
							</View>

							{pixPending ? (
								<TouchableOpacity
									style={styles.pixBanner}
									onPress={() => navigation.navigate('TelaPagamento', { orderId: order.id })}
									accessibilityRole="button"
								>
									<MaterialCommunityIcons name="qrcode" size={24} color={COLORS.dark} />
									<View style={styles.flex}>
										<Text style={styles.pixBannerTitle}>Pagamento Pix pendente</Text>
										<Text style={styles.pixBannerText}>Toque para ver o QR Code e o copia e cola</Text>
									</View>
									<Feather name="chevron-right" size={22} color={COLORS.dark} />
								</TouchableOpacity>
							) : null}

							{order.status === 'cancelado' ? (
								<View style={[styles.card, styles.cancelCard]}>
									<Text style={styles.cancelText}>O mercado cancelou este pedido. Se você já pagou o Pix, procure o mercado para o estorno.</Text>
								</View>
							) : (
								<Timeline order={order} />
							)}
						</>
					)}
				</ScrollView>

				<View style={styles.floatingHeader} pointerEvents="box-none">
					<CircularIconButton
						size={40}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color={COLORS.white} />}
						onPress={goBack}
						accessibilityLabel="Voltar"
					/>
				</View>
			</View>
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark },
	safeArea: { flex: 1, backgroundColor: COLORS.dark },
	topBand: { height: 40, backgroundColor: COLORS.dark },
	screen: { flex: 1, marginTop: -1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: COLORS.background, overflow: 'hidden' },
	scrollContent: { paddingBottom: 28 },
	floatingHeader: { position: 'absolute', top: 14, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
	card: {
		marginHorizontal: 16,
		marginBottom: 14,
		padding: 16,
		borderRadius: 20,
		backgroundColor: COLORS.white,
		elevation: 3,
		shadowColor: '#102E2B',
		shadowOpacity: 0.1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 3 },
	},
	overlapCard: { marginTop: -60 },
	orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	orderIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.yellow, alignItems: 'center', justifyContent: 'center' },
	cardTitle: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 17 },
	cardSubtitle: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 13, marginTop: 3 },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line, marginVertical: 14 },
	orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	itemNames: { color: '#111715', fontFamily: 'Montserrat_500Medium', fontSize: 20 },
	orderMeta: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 3 },
	orderMetaStrong: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold' },
	detailsButton: { minHeight: 46, paddingHorizontal: 20, borderRadius: 14, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
	detailsButtonText: { color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	details: { marginTop: 14 },
	detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
	detailImage: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.background },
	detailName: { flex: 1, color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 14 },
	detailWeight: { color: COLORS.muted, fontSize: 12 },
	detailPrice: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	detailInfo: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 12, lineHeight: 18 },
	pixBanner: { marginHorizontal: 16, marginBottom: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: '#FFF3D6', borderWidth: 1, borderColor: '#F2B24C' },
	pixBannerTitle: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	pixBannerText: { color: COLORS.ink, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 2 },
	step: { flexDirection: 'row', minHeight: 64 },
	stepRail: { width: 22, alignItems: 'center' },
	stepDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: COLORS.line },
	stepDotDone: { backgroundColor: COLORS.dark },
	stepLine: { flex: 1, width: 0, marginVertical: 4, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.line },
	stepLineDone: { borderColor: COLORS.dark, borderStyle: 'solid' },
	stepCopy: { flex: 1, paddingLeft: 14, paddingBottom: 16 },
	stepTitle: { color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 15 },
	stepTitlePending: { color: COLORS.muted },
	stepMeta: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 4 },
	cancelCard: { backgroundColor: '#FFF0F0' },
	cancelText: { color: COLORS.red, fontFamily: 'Montserrat_500Medium', fontSize: 14, lineHeight: 20 },
});
