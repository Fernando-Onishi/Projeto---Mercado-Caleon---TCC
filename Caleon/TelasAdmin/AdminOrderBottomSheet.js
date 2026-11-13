import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Alert,
	Animated,
	Dimensions,
	Image,
	Modal,
	PanResponder,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { ADMIN_THEME } from '../Config/AdminTheme';

const C = ADMIN_THEME.colors;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.min(WINDOW_HEIGHT * 0.78, 780);

function parseAmount(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
	if (typeof value !== 'string') return null;
	const normalized = value.replace(/[^\d,.-]/g, '');
	const parsed = Number.parseFloat(normalized.includes(',')
		? normalized.replace(/\./g, '').replace(',', '.')
		: normalized);
	return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function formatCurrency(cents) {
	return cents === null || cents === undefined
		? '—'
		: (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getFirstValue(source, keys) {
	for (const key of keys) {
		if (source?.[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
	}
	return null;
}

function normalizeOrder(order) {
	const sourceItems = getFirstValue(order, ['items', 'itens', 'produtos']);
	const items = Array.isArray(sourceItems) ? sourceItems.map((item, index) => {
		const quantity = getFirstValue(item, ['qty', 'quantity', 'quantidade']);
		const unit = getFirstValue(item, ['unit', 'unidade', 'measure', 'medida']);
		const numericQuantity = typeof quantity === 'number'
			? quantity.toLocaleString('pt-BR')
			: quantity;
		const description = getFirstValue(item, ['detail', 'description', 'descricao', 'categoria']);
		const weight = getFirstValue(item, ['weight', 'peso']);
		const category = getFirstValue(item, ['category', 'categoria']);
		return {
			id: String(getFirstValue(item, ['id', 'itemId', 'productId', 'produtoId']) ?? index),
			name: getFirstValue(item, ['name', 'nome', 'productName', 'produto']) || 'Item do pedido',
			detail: description || [weight, category].filter(Boolean).join(' | '),
			quantity: quantity === null ? '' : `${numericQuantity}${unit ? ` ${unit}` : ''}`,
			priceCents: parseAmount(getFirstValue(item, ['price', 'preco', 'valor', 'lineTotal', 'total'])),
			image: getFirstValue(item, ['imageUrl', 'image', 'imagem', 'foto']),
		};
	}) : [];

	const itemPricesAvailable = items.length > 0 && items.every((item) => item.priceCents !== null);
	const subtotal = parseAmount(getFirstValue(order, ['subtotal', 'subTotal', 'subtotalValue']))
		?? (itemPricesAvailable ? items.reduce((sum, item) => sum + item.priceCents, 0) : null);
	const serviceFee = parseAmount(getFirstValue(order, ['serviceFee', 'taxaServico', 'taxa_de_servico']));
	const total = parseAmount(getFirstValue(order, ['total', 'valorTotal', 'amount']))
		?? (subtotal !== null && serviceFee !== null ? subtotal + serviceFee : null);
	const customer = getFirstValue(order, ['customer', 'cliente', 'customerName', 'nomeCliente']);
	const customerName = typeof customer === 'object' ? getFirstValue(customer, ['name', 'nome']) : customer;
	const rawTime = getFirstValue(order, ['time', 'hora', 'horario', 'dataHora', 'receivedAt', 'createdAt']);
	const timeMatch = typeof rawTime === 'string' ? rawTime.match(/\b\d{1,2}:\d{2}\b/) : null;
	const timestampValue = getFirstValue(order, ['receivedAt', 'createdAt', 'dataHora']);
	let elapsed = getFirstValue(order, ['elapsed', 'tempoDecorrido']);
	try {
		const date = typeof timestampValue?.toDate === 'function'
			? timestampValue.toDate()
			: timestampValue instanceof Date ? timestampValue : new Date(timestampValue);
		if (!elapsed && Number.isFinite(date.getTime())) {
			elapsed = `há ${Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))} min`;
		}
	} catch {
		elapsed = null;
	}

	return {
		id: String(getFirstValue(order, ['number', 'numero', 'id']) ?? '—'),
		customer: customerName || 'Cliente',
		receivedText: timeMatch
			? `Recebido às ${timeMatch[0]}${elapsed ? ` (${elapsed})` : ''}`
			: rawTime ? `Recebido em ${String(rawTime)}` : 'Horário não informado',
		payment: getFirstValue(order, ['paymentMethod', 'formaPagamento', 'payment', 'pagamento']) || 'Não informado',
		items,
		subtotal,
		serviceFee,
		total,
		initiallyChecked: Array.isArray(order?.checkedItemIds) ? order.checkedItemIds.map(String) : [],
	};
}

export default function AdminOrderBottomSheet({ order, onClose, onComplete }) {
	const normalizedOrder = useMemo(() => order ? normalizeOrder(order) : null, [order]);
	const [checkedIds, setCheckedIds] = useState([]);
	const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
	const backdropOpacity = useRef(new Animated.Value(0)).current;
	const closeRef = useRef(onClose);
	closeRef.current = onClose;

	useEffect(() => {
		setCheckedIds(normalizedOrder?.initiallyChecked || []);
	}, [normalizedOrder]);

	const panResponder = useMemo(() => PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
		onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dy > 100 || gesture.vy > 0.8) {
				Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 180, useNativeDriver: true }).start(() => closeRef.current?.());
			} else {
				Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 13 }).start();
			}
		},
	}), [translateY]);

	function openSheet() {
		translateY.setValue(SHEET_HEIGHT);
		Animated.parallel([
			Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 75, friction: 12 }),
			Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
		]).start();
	}

	function closeSheet() {
		Animated.parallel([
			Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 190, useNativeDriver: true }),
			Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
		]).start(() => closeRef.current?.());
	}

	if (!normalizedOrder) return null;

	const checkedCount = normalizedOrder.items.filter((item) => checkedIds.includes(item.id)).length;

	function toggleChecked(itemId) {
		setCheckedIds((current) => current.includes(itemId)
			? current.filter((id) => id !== itemId)
			: [...current, itemId]);
	}

	function completeSeparation() {
		if (normalizedOrder.items.length === 0) {
			Alert.alert('Pedido sem itens', 'Não há itens disponíveis para conferir neste pedido.');
			return;
		}
		if (checkedCount !== normalizedOrder.items.length) {
			Alert.alert('Conferência incompleta', 'Confira todos os itens antes de concluir a separação.');
			return;
		}
		onComplete?.();
	}

	return (
		<Modal transparent visible onShow={openSheet} onRequestClose={closeSheet} animationType="none">
			<View style={styles.modalRoot}>
				<TouchableOpacity style={styles.scrimTouch} onPress={closeSheet} activeOpacity={1} accessibilityLabel="Fechar detalhes do pedido" />
				<Animated.View pointerEvents="none" style={[styles.scrim, { opacity: backdropOpacity }]} />
				<Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
					<View style={styles.sheetTop}>
						<TouchableOpacity style={styles.closeButton} onPress={closeSheet} accessibilityRole="button" accessibilityLabel="Fechar">
							<Feather name="x" size={23} color={C.white} />
						</TouchableOpacity>
						<View style={styles.handleTouch} {...panResponder.panHandlers}>
							<View style={styles.handle} />
						</View>
					</View>

					<View style={styles.customerCard}>
						<View style={styles.avatar} />
						<View style={styles.customerInfo}>
							<Text style={styles.customerName} numberOfLines={1}>{normalizedOrder.customer}</Text>
							<Text style={styles.meta} numberOfLines={1}>{normalizedOrder.receivedText}</Text>
						</View>
						<Text style={styles.orderNumber}>#{normalizedOrder.id}</Text>
					</View>

					<View style={styles.itemsCard}>
						<View style={styles.itemsHeading}>
							<View style={styles.titleGroup}>
								<Text style={styles.countBadge}>{normalizedOrder.items.length}</Text>
								<Text style={styles.itemsTitle}>Itens do Pedido</Text>
							</View>
							<Text style={styles.counter}>{checkedCount}/{normalizedOrder.items.length} conferidos</Text>
						</View>
						<ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
							{normalizedOrder.items.length === 0 ? (
								<View style={styles.emptyItems}><Text style={styles.meta}>Este pedido não possui itens disponíveis para conferência.</Text></View>
							) : normalizedOrder.items.map((item) => {
								const isChecked = checkedIds.includes(item.id);
								return (
									<TouchableOpacity
										key={item.id}
										style={styles.itemRow}
										onPress={() => toggleChecked(item.id)}
										activeOpacity={0.75}
										accessibilityRole="checkbox"
										accessibilityState={{ checked: isChecked }}
									>
										<View style={styles.productThumb}>
											{item.image ? <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" /> : null}
										</View>
										<View style={styles.itemInfo}>
											<Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
											<Text style={styles.meta} numberOfLines={1}>{item.detail || ' '}</Text>
										</View>
										<View style={styles.priceColumn}>
											<Text style={styles.qty} numberOfLines={1}>{item.quantity || '—'}</Text>
											<Text style={styles.itemPrice} numberOfLines={1}>{formatCurrency(item.priceCents)}</Text>
										</View>
										<View style={[styles.check, isChecked && styles.checked]}>
											{isChecked ? <Feather name="check" size={23} color={C.white} /> : null}
										</View>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					<View style={styles.totals}>
						<View style={styles.totalLine}><Text style={styles.totalLabel}>SubTotal:</Text><Text style={styles.totalValue}>{formatCurrency(normalizedOrder.subtotal)}</Text></View>
						<View style={styles.totalLine}><Text style={styles.totalLabel}>Taxa de Serviço:</Text><Text style={styles.totalValue}>{formatCurrency(normalizedOrder.serviceFee)}</Text></View>
						<View style={styles.totalLine}>
							<Text style={styles.totalLabel}>Forma de Pagamento:</Text>
							<Text style={styles.payment} numberOfLines={1}>{normalizedOrder.payment}</Text>
						</View>
						<View style={styles.dashed} />
						<View style={styles.totalLine}><Text style={styles.grandTotal}>Total:</Text><Text style={styles.grandTotal}>{formatCurrency(normalizedOrder.total)}</Text></View>
					</View>

					<View style={styles.actions}>
						<TouchableOpacity style={styles.cancelButton} onPress={closeSheet} accessibilityRole="button">
							<Text style={styles.buttonText}>Cancelar Compra</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.finishButton} onPress={completeSeparation} accessibilityRole="button">
							<Text style={styles.buttonText}>Concluir separação</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalRoot: { flex: 1, justifyContent: 'flex-end' },
	scrimTouch: { ...StyleSheet.absoluteFillObject, top: 82, bottom: 0 },
	scrim: { ...StyleSheet.absoluteFillObject, top: 82, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.28)' },
	sheet: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: ADMIN_THEME.layout.bottomBarHeight,
		height: SHEET_HEIGHT,
		minHeight: 500,
		paddingHorizontal: 18,
		paddingBottom: 10,
		backgroundColor: C.background,
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		elevation: 18,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.16,
		shadowRadius: 12,
	},
	sheetTop: { height: 66, justifyContent: 'center' },
	closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
	handleTouch: { position: 'absolute', top: 0, left: 40, right: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
	handle: { width: 80, height: 6, borderRadius: 3, backgroundColor: '#777777' },
	customerCard: { minHeight: 70, marginBottom: 16, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 24, elevation: 3, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 4 },
	avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#D9D9D9' },
	customerInfo: { flex: 1, minWidth: 0 },
	customerName: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 15 },
	meta: { color: '#888888', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10, marginTop: 3 },
	orderNumber: { color: C.ink, backgroundColor: '#D8F6E9', borderWidth: 1, borderColor: C.success, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 1, fontFamily: ADMIN_THEME.fonts.display, fontSize: 24, lineHeight: 25 },
	itemsCard: { flex: 1, minHeight: 130, marginBottom: 14, overflow: 'hidden', backgroundColor: C.white, borderRadius: 24, elevation: 3, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 4 },
	itemsHeading: { minHeight: 47, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
	titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	countBadge: { width: 34, height: 34, overflow: 'hidden', borderRadius: 17, backgroundColor: C.mint, color: C.white, textAlign: 'center', textAlignVertical: 'center', fontFamily: ADMIN_THEME.fonts.display, fontSize: 24, lineHeight: 32 },
	itemsTitle: { color: C.ink, fontFamily: ADMIN_THEME.fonts.display, fontSize: 18 },
	counter: { color: '#D08C18', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10 },
	itemsList: { flex: 1 },
	emptyItems: { flex: 1, minHeight: 90, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
	itemRow: { minHeight: 69, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D5D5D5' },
	productThumb: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#202020', backgroundColor: C.white, overflow: 'hidden' },
	productImage: { width: '100%', height: '100%' },
	itemInfo: { flex: 1, minWidth: 45 },
	itemName: { color: C.ink, fontFamily: ADMIN_THEME.fonts.display, fontSize: 16 },
	priceColumn: { width: 78, alignItems: 'flex-end' },
	qty: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	itemPrice: { color: C.success, fontFamily: ADMIN_THEME.fonts.display, fontSize: 21, lineHeight: 22 },
	check: { width: 35, height: 35, marginLeft: 5, borderWidth: 1, borderColor: '#F3A000', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	checked: { backgroundColor: C.success, borderColor: C.success },
	totals: { marginBottom: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.white, borderRadius: 24, elevation: 3, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 4 },
	totalLine: { minHeight: 27, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
	totalLabel: { flex: 1, color: '#999999', fontFamily: ADMIN_THEME.fonts.body, fontSize: 14 },
	totalValue: { color: C.success, fontFamily: ADMIN_THEME.fonts.display, fontSize: 17 },
	payment: { maxWidth: '52%', paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', borderRadius: 14, backgroundColor: '#BDEDD9', color: C.success, fontFamily: ADMIN_THEME.fonts.body, fontSize: 10, textAlign: 'center' },
	dashed: { borderTopWidth: 1, borderColor: '#D6DEDA', borderStyle: 'dashed', marginVertical: 3 },
	grandTotal: { color: C.success, fontFamily: ADMIN_THEME.fonts.display, fontSize: 23, lineHeight: 28 },
	actions: { flexDirection: 'row', gap: 14 },
	cancelButton: { flex: 1, minHeight: 41, paddingHorizontal: 6, borderRadius: 15, backgroundColor: '#FF0808', alignItems: 'center', justifyContent: 'center', elevation: 3 },
	finishButton: { flex: 1, minHeight: 41, paddingHorizontal: 6, borderRadius: 15, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center', elevation: 3 },
	buttonText: { color: C.white, fontFamily: ADMIN_THEME.fonts.display, fontSize: 14, textAlign: 'center' },
});