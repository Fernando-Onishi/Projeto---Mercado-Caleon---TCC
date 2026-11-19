import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	BackHandler,
	Modal,
	Image,
	KeyboardAvoidingView,
	ScrollView,
	Share,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import QrCode from '../Componentes/QrCode';
import MapaLoja from '../Componentes/MapaLoja';
import { buildPickupDays, formatHour, formatPickup } from '../Config/Retirada';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import { formatCurrency, productName } from '../Config/Produtos';
import {
	CARD_BRANDS,
	STORE,
	buildPixPayload,
	detectCardBrand,
	formatCardNumber,
	isValidCardNumber,
	onlyDigits,
} from '../Config/Pagamento';
import { createOrderFromCart, readCartSummary, subscribeToOrder, updatePaymentStatus } from '../Config/Pedidos';
import { themedStyles, tc } from '../Config/Tema';

const COLORS = {
	dark: '#1B4B3D',
	mint: '#40B190',
	price: '#00AA6A',
	background: '#F1F3F5',
	white: '#FFFFFF',
	black: '#000000',
	ink: '#183F35',
	muted: '#757575',
	border: '#DDE5E1',
	red: '#FF383C',
};

function VisaMark() {
	return <Text style={styles.visaMark}>VISA</Text>;
}

function MastercardMark() {
	return (
		<View style={styles.mcMark}>
			<View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
			<View style={[styles.mcCircle, styles.mcCircleRight, { backgroundColor: '#F79E1B' }]} />
		</View>
	);
}

function PaymentOption({ selected, onPress, title, subtitle, icon }) {
	return (
		<TouchableOpacity
			style={[styles.option, selected && styles.optionSelected]}
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={`${title}. ${subtitle}`}
		>
			<View style={styles.optionIcon}>{icon}</View>
			<View style={styles.optionCopy}>
				<Text style={styles.optionTitle}>{title}</Text>
				<Text style={styles.optionSubtitle}>{subtitle}</Text>
			</View>
			<View style={[styles.radio, selected && styles.radioSelected]}>
				{selected ? <View style={styles.radioDot} /> : null}
			</View>
		</TouchableOpacity>
	);
}

export default function Pagamento({ navigation, route }) {
	// Com orderId, a tela abre direto no QR Code de um pedido Pix já criado.
	const existingOrderId = route?.params?.orderId;
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [summary, setSummary] = useState(null);
	const [method, setMethod] = useState('pix');
	const [cardNumber, setCardNumber] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [order, setOrder] = useState(null);
	const [copied, setCopied] = useState(false);
	const [confirmBackVisible, setConfirmBackVisible] = useState(false);
	// Horário de retirada escolhido pelo cliente.
	// Atualiza a lista a cada minuto, para não oferecer horário que já passou.
	const [clock, setClock] = useState(() => Date.now());
	const pickupDays = useMemo(() => buildPickupDays(new Date(clock)), [clock]);
	const [pickupDayKey, setPickupDayKey] = useState(() => pickupDays[0]?.key || null);
	const [pickupAt, setPickupAt] = useState(null);
	const [mapDragging, setMapDragging] = useState(false);

	// Botão voltar do Android também pede confirmação antes de sair do pagamento.
	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			if (!navigation.isFocused()) return false;
			setConfirmBackVisible(true);
			return true;
		});
		return () => subscription.remove();
	}, [navigation]);

	useEffect(() => {
		readCartSummary().then(setSummary);
	}, []);

	useEffect(() => {
		const timer = setInterval(() => setClock(Date.now()), 60000);
		return () => clearInterval(timer);
	}, []);

	// Se o horário escolhido saiu da lista (ficou perto demais), pede para escolher de novo.
	useEffect(() => {
		if (!pickupAt) return;
		const stillAvailable = pickupDays.some((day) => day.slots.some((slot) => slot.getTime() === pickupAt.getTime()));
		if (!stillAvailable) setPickupAt(null);
		if (!pickupDays.some((day) => day.key === pickupDayKey)) setPickupDayKey(pickupDays[0]?.key || null);
	}, [pickupDays, pickupAt, pickupDayKey]);

	useEffect(() => {
		if (!existingOrderId) return undefined;
		return subscribeToOrder(existingOrderId, (loaded) => {
			if (loaded) setOrder(loaded);
		}, (error) => console.error('Não foi possível carregar o pedido.', error));
	}, [existingOrderId]);

	if (!fontsLoaded || !summary || (existingOrderId && !order)) {
		return (
			<View style={styles.loadingScreen}>
				<ActivityIndicator size="large" color={tc(COLORS.white)} />
			</View>
		);
	}

	const isCard = method === 'visa' || method === 'mastercard';
	const cardDigits = onlyDigits(cardNumber);
	const detectedBrand = detectCardBrand(cardDigits);
	const cardError = !isCard || cardDigits.length < 13
		? ''
		: !isValidCardNumber(cardDigits)
			? 'Número de cartão inválido. Confira os dígitos.'
			: detectedBrand !== method
				? `Esse número não é de um cartão ${CARD_BRANDS[method].label}.`
				: '';
	const pickupDay = pickupDays.find((day) => day.key === pickupDayKey) || pickupDays[0];
	const canConfirm = summary.items.length > 0 && !submitting && Boolean(pickupAt)
		&& (!isCard || (cardDigits.length >= 13 && !cardError));
	const pixCode = order?.paymentMethod === 'pix'
		? buildPixPayload({ amount: order.total, txid: order.pixTxid, description: `Pedido ${order.number}` })
		: '';

	async function confirmOrder() {
		if (!canConfirm) return;
		setSubmitting(true);
		try {
			const created = await createOrderFromCart({ method, cardLast4: isCard ? cardDigits.slice(-4) : null }, pickupAt);
			publishSacolaCount([]);
			if (created.paymentMethod === 'pix') {
				setOrder(created);
			} else {
				showGlobalNotification(`Pedido #${created.number} enviado ao mercado`);
				navigation.replace('TelaPedido', { orderId: created.id });
			}
		} catch (error) {
			console.error('Não foi possível criar o pedido.', error);
			const message = error?.message === 'empty-cart'
				? 'Sua sacola está vazia.'
				: error?.message === 'no-pickup-time'
					? 'Escolha o horário de retirada.'
				: error?.message === 'pickup-past'
					? 'Esse horário de retirada ficou muito próximo. Escolha outro.'
				: error?.message === 'not-signed-in'
					? 'Entre na sua conta para finalizar a compra.'
					: 'Não foi possível enviar o pedido. Confira sua conexão e tente novamente.';
			if (error?.message === 'pickup-past') {
				setPickupAt(null);
				setClock(Date.now());
			}
			showGlobalNotification(message);
		} finally {
			setSubmitting(false);
		}
	}

	async function copyPixCode() {
		try {
			await Clipboard.setStringAsync(pixCode);
			setCopied(true);
			showGlobalNotification('Código Pix copiado');
		} catch {
			// Sem o módulo de área de transferência (app antigo), usa o compartilhar do sistema.
			Share.share({ message: pixCode });
		}
	}

	async function confirmPixSent() {
		try {
			await updatePaymentStatus(order.id, 'informado');
		} catch (error) {
			console.error('Não foi possível registrar o pagamento informado.', error);
		}
		// Depois do Pix, mostra a tela "Compra bem efetuada!" (sem voltar para o pagamento).
		navigation.reset({ index: 0, routes: [{ name: 'TelaCompraSucesso', params: { orderId: order.id } }] });
	}

	function goBack() {
		setConfirmBackVisible(false);
		if (existingOrderId && navigation.canGoBack()) {
			navigation.goBack();
			return;
		}
		if (order) {
			navigation.replace('TelaPedido', { orderId: order.id });
			return;
		}
		if (navigation.canGoBack()) navigation.goBack();
		else navigation.navigate('TelaHome', { tab: 'TelaSacola' });
	}

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
			<Modal visible={confirmBackVisible} transparent animationType="fade" onRequestClose={() => setConfirmBackVisible(false)}>
				<View style={styles.confirmOverlay}>
					<View style={styles.confirmDialog}>
						<View style={styles.confirmIcon}>
							<Feather name="alert-circle" size={24} color={tc(COLORS.dark)} />
						</View>
						<Text style={styles.confirmTitle}>{order ? 'Sair do pagamento Pix?' : 'Voltar para a sacola?'}</Text>
						<Text style={styles.confirmMessage}>
							{order
								? `Seu pedido #${order.number} já foi enviado ao mercado e continua aguardando o Pix. Você pode pagar depois pela tela do pedido.`
								: 'Você ainda não confirmou o pedido. Seus itens continuam na sacola.'}
						</Text>
						<View style={styles.confirmActions}>
							<TouchableOpacity style={[styles.confirmButton, styles.confirmStay]} onPress={() => setConfirmBackVisible(false)} accessibilityRole="button">
								<Text style={[styles.confirmButtonText, styles.confirmStayText]}>{order ? 'Continuar pagando' : 'Ficar'}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.confirmButton, styles.confirmLeave]} onPress={goBack} accessibilityRole="button">
								<Text style={styles.confirmButtonText}>{order ? 'Sair' : 'Voltar'}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<CircularIconButton
						size={40}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color={tc(COLORS.white)} />}
						onPress={() => setConfirmBackVisible(true)}
						accessibilityLabel="Voltar"
					/>
				</View>
				{/* O título sobe para a linha do botão de voltar; não pode capturar o toque do botão. */}
				<View pointerEvents="none">
					<Text style={styles.title}>{order ? 'Pague com Pix' : 'Pagamento'}</Text>
				</View>

				<KeyboardAvoidingView style={styles.flex} behavior="padding">
					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEnabled={!mapDragging}>
						{order ? (
							<>
								<View style={styles.card}>
									<Text style={styles.pixLead}>Pedido #{order.number} • {formatCurrency(order.total)}</Text>
									{order.pickupAt ? <Text style={styles.pixPickup}>Retirada: {formatPickup(order.pickupAt)}</Text> : null}
									<Text style={styles.pixHint}>Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código abaixo.</Text>
									<View style={styles.qrWrap}>
										<QrCode value={pixCode} size={230} />
									</View>
									<Text style={styles.sectionLabel}>Pix copia e cola</Text>
									<View style={styles.pixCodeBox}>
										<Text style={styles.pixCode} selectable numberOfLines={3}>{pixCode}</Text>
									</View>
									<TouchableOpacity style={styles.secondaryButton} onPress={copyPixCode} accessibilityRole="button">
										<Feather name={copied ? 'check' : 'copy'} size={18} color={tc(COLORS.dark)} />
										<Text style={styles.secondaryButtonText}>{copied ? 'Código copiado' : 'Copiar código'}</Text>
									</TouchableOpacity>
								</View>
								<Text style={styles.footnote}>
									O mercado confere o Pix e começa a separar seu pedido. Você acompanha tudo na tela do pedido.
								</Text>
							</>
						) : (
							<>
								<Text style={styles.sectionLabel}>Local de retirada</Text>
								<View style={styles.card}>
									<View style={styles.storeRow}>
										<Image source={require('../assets/logo-loja.png')} style={styles.storeLogo} accessibilityLabel="Logo do Caleon" />
										<View style={styles.flex}>
											<Text style={styles.cardTitle}>{STORE.name} — SENAI Suzano</Text>
											<Text style={styles.cardSubtitle}>{STORE.address}</Text>
										</View>
									</View>
									<MapaLoja height={220} style={styles.map} onDragChange={setMapDragging} />
									<View style={styles.storeRow}>
										<Feather name="clock" size={16} color={tc(COLORS.mint)} />
										<Text style={styles.address}>{STORE.hoursLabel}</Text>
									</View>
								</View>

								<Text style={styles.sectionLabel}>Horário de retirada</Text>
								<View style={styles.card}>
									{pickupDays.length === 0 ? (
										<Text style={styles.cardSubtitle}>Nenhum horário disponível agora.</Text>
									) : (
										<>
											<View style={styles.dayRow}>
												{pickupDays.map((day) => {
													const selected = day.key === pickupDay?.key;
													return (
														<TouchableOpacity
															key={day.key}
															style={[styles.dayChip, selected && styles.dayChipSelected]}
															onPress={() => { setPickupDayKey(day.key); setPickupAt(null); }}
															accessibilityRole="tab"
															accessibilityState={{ selected }}
														>
															<Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{day.label}</Text>
														</TouchableOpacity>
													);
												})}
											</View>
											<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
												{(pickupDay?.slots || []).map((slot) => {
													const selected = pickupAt?.getTime() === slot.getTime();
													return (
														<TouchableOpacity
															key={slot.getTime()}
															style={[styles.slotChip, selected && styles.slotChipSelected]}
															onPress={() => setPickupAt(slot)}
															accessibilityRole="radio"
															accessibilityState={{ selected }}
															accessibilityLabel={`Retirar ${pickupDay.label} às ${formatHour(slot)}`}
														>
															<Text style={[styles.slotText, selected && styles.slotTextSelected]}>{formatHour(slot)}</Text>
														</TouchableOpacity>
													);
												})}
											</ScrollView>
											<View style={[styles.notice, !pickupAt && styles.noticeWarn]}>
												<Feather name={pickupAt ? 'check-circle' : 'info'} size={16} color={tc(COLORS.dark)} />
												<Text style={styles.noticeText}>
													{pickupAt
														? `Seu pedido estará pronto para retirada ${formatPickup(pickupAt).toLowerCase()}.`
														: `Escolha o horário em que vai buscar. Precisamos de pelo menos ${STORE.pickupMinutes} minutos para separar.`}
												</Text>
											</View>
										</>
									)}
								</View>

								<Text style={styles.sectionLabel}>Resumo</Text>
								<View style={styles.card}>
									{summary.items.map((item) => (
										<View key={item.id} style={styles.itemRow}>
											<Text style={styles.itemName} numberOfLines={1}>
												{item.quantidade}x {productName(item.nome)} <Text style={styles.itemWeight}>{item.peso}</Text>
											</Text>
											<Text style={styles.itemPrice}>{formatCurrency((Number(item.preco) || 0) * (Number(item.quantidade) || 1))}</Text>
										</View>
									))}
									{summary.items.length === 0 ? <Text style={styles.cardSubtitle}>Sua sacola está vazia.</Text> : null}
									<View style={styles.divider} />
									<View style={styles.itemRow}>
										<Text style={styles.summaryLabel}>Subtotal</Text>
										<Text style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</Text>
									</View>
									<View style={styles.itemRow}>
										<Text style={styles.summaryLabel}>Taxa de serviço</Text>
										<Text style={styles.summaryValue}>{formatCurrency(summary.serviceFee)}</Text>
									</View>
								</View>

								<Text style={styles.sectionLabel}>Forma de pagamento</Text>
								<PaymentOption
									selected={method === 'pix'}
									onPress={() => setMethod('pix')}
									title="Pix"
									subtitle="QR Code ou copia e cola, na hora"
									icon={<MaterialCommunityIcons name="qrcode" size={26} color={tc(COLORS.dark)} />}
								/>
								<PaymentOption
									selected={method === 'visa'}
									onPress={() => setMethod('visa')}
									title="Cartão Visa"
									subtitle="Crédito ou débito, pago na retirada"
									icon={<VisaMark />}
								/>
								<PaymentOption
									selected={method === 'mastercard'}
									onPress={() => setMethod('mastercard')}
									title="Cartão Mastercard"
									subtitle="Crédito ou débito, pago na retirada"
									icon={<MastercardMark />}
								/>

								{isCard ? (
									<View style={styles.card}>
										<Text style={styles.cardTitle}>Número do cartão</Text>
										<TextInput
											style={[styles.input, cardError ? styles.inputError : null]}
											value={formatCardNumber(cardNumber)}
											onChangeText={setCardNumber}
											keyboardType="number-pad"
											placeholder="0000 0000 0000 0000"
											placeholderTextColor={tc('#A3AAA7')}
											maxLength={19}
											autoComplete="off"
											accessibilityLabel="Número do cartão"
										/>
										{cardError ? <Text style={styles.errorText}>{cardError}</Text> : null}
										<View style={styles.notice}>
											<Feather name="info" size={16} color={tc(COLORS.dark)} />
											<Text style={styles.noticeText}>
												A cobrança é feita na maquininha quando você retirar o pedido. Guardamos só a bandeira e os 4 últimos dígitos.
											</Text>
										</View>
									</View>
								) : null}
							</>
						)}
					</ScrollView>
				</KeyboardAvoidingView>

				<View style={styles.bottomBar}>
					{order ? (
						<TouchableOpacity style={styles.primaryButton} onPress={confirmPixSent} accessibilityRole="button">
							<Feather name="check-circle" size={22} color={tc(COLORS.white)} />
							<Text style={styles.primaryButtonText}>Já fiz o Pix</Text>
						</TouchableOpacity>
					) : (
						<>
							<View style={styles.totalBlock}>
								<Text style={styles.totalLabel}>Total:</Text>
								<Text style={styles.totalValue}>{formatCurrency(summary.total)}</Text>
							</View>
							<TouchableOpacity
								style={[styles.primaryButton, !canConfirm && styles.primaryButtonDisabled]}
								onPress={confirmOrder}
								disabled={!canConfirm}
								accessibilityRole="button"
								accessibilityState={{ disabled: !canConfirm }}
							>
								{submitting ? <ActivityIndicator color={tc(COLORS.white)} /> : <Feather name="check" size={22} color={tc(COLORS.white)} />}
								<Text style={styles.primaryButtonText}>{submitting ? 'Enviando...' : 'Confirmar'}</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	flex: { flex: 1 },
	loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark },
	safeArea: { flex: 1, backgroundColor: COLORS.dark },
	topBand: { height: 40, backgroundColor: COLORS.dark },
	screen: { flex: 1, marginTop: -1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: COLORS.background, overflow: 'hidden' },
	header: { paddingHorizontal: 16, paddingTop: 15, height: 55, zIndex: 2, elevation: 2, alignItems: 'flex-start' },
	title: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: -26, marginBottom: 12 },
	content: { paddingHorizontal: 16, paddingBottom: 24 },
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 20,
		padding: 16,
		marginBottom: 12,
		elevation: 2,
		shadowColor: '#102E2B',
		shadowOpacity: 0.06,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	map: { marginVertical: 12 },
	dayRow: { flexDirection: 'row', gap: 8 },
	dayChip: { flex: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
	dayChipSelected: { backgroundColor: COLORS.dark },
	dayChipText: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 13, textTransform: 'capitalize' },
	dayChipTextSelected: { color: COLORS.white },
	slotRow: { gap: 8, paddingVertical: 12 },
	slotChip: { minWidth: 70, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
	slotChipSelected: { borderColor: COLORS.mint, backgroundColor: '#D8F6E9' },
	slotText: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
	slotTextSelected: { color: COLORS.dark },
	noticeWarn: { backgroundColor: '#FFF3D6' },
	pixPickup: { color: COLORS.dark, fontFamily: 'Montserrat_700Bold', fontSize: 13, textAlign: 'center', marginTop: 4 },
	storeLogo: { width: 46, height: 46, borderRadius: 12 },
	cardTitle: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 16 },
	cardSubtitle: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 13, marginTop: 2 },
	address: { flex: 1, color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 13 },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 12 },
	sectionLabel: { color: COLORS.muted, fontFamily: 'Montserrat_700Bold', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginBottom: 8, paddingHorizontal: 2 },
	itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
	itemName: { flex: 1, color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 14 },
	itemWeight: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12 },
	itemPrice: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	summaryLabel: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 14 },
	summaryValue: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 68,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 10,
		borderRadius: 18,
		borderWidth: 2,
		borderColor: 'transparent',
		backgroundColor: COLORS.white,
	},
	optionSelected: { borderColor: COLORS.mint },
	optionIcon: { width: 52, height: 40, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
	optionCopy: { flex: 1 },
	optionTitle: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
	optionSubtitle: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 2 },
	radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#A3AAA7', alignItems: 'center', justifyContent: 'center' },
	radioSelected: { borderColor: COLORS.mint },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.mint },
	visaMark: { color: '#1A1F71', fontFamily: 'Montserrat_700Bold', fontStyle: 'italic', fontSize: 15, letterSpacing: 0.5 },
	mcMark: { width: 34, height: 22, flexDirection: 'row', alignItems: 'center' },
	mcCircle: { width: 22, height: 22, borderRadius: 11, opacity: 0.95 },
	mcCircleRight: { marginLeft: -10 },
	input: { height: 50, marginTop: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 17, letterSpacing: 1 },
	inputError: { borderColor: COLORS.red },
	errorText: { color: COLORS.red, fontFamily: 'Montserrat_500Medium', fontSize: 12, marginTop: 6 },
	notice: { flexDirection: 'row', gap: 8, marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: '#D8F6E9' },
	noticeText: { flex: 1, color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 12, lineHeight: 17 },
	pixLead: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 16, textAlign: 'center' },
	pixHint: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6 },
	qrWrap: { alignSelf: 'center', marginVertical: 16, padding: 8, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
	pixCodeBox: { padding: 12, borderRadius: 12, backgroundColor: COLORS.background },
	pixCode: { color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 12, lineHeight: 17 },
	secondaryButton: { minHeight: 48, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 2, borderColor: COLORS.dark },
	secondaryButtonText: { color: COLORS.dark, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
	footnote: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12 },
	bottomBar: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
	totalBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
	totalLabel: { color: COLORS.dark, fontFamily: 'LilitaOne_400Regular', fontSize: 23 },
	totalValue: { color: COLORS.price, fontFamily: 'LilitaOne_400Regular', fontSize: 24 },
	primaryButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, backgroundColor: COLORS.price },
	primaryButtonDisabled: { backgroundColor: '#A3AAA7' },
	confirmOverlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
	confirmDialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 22, backgroundColor: COLORS.white },
	confirmIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#D8F6E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
	confirmTitle: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 24 },
	confirmMessage: { marginTop: 6, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 20 },
	confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
	confirmButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	confirmStay: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
	confirmLeave: { backgroundColor: COLORS.dark },
	confirmButtonText: { color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	confirmStayText: { color: COLORS.ink },
	primaryButtonText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 22 },
}));
