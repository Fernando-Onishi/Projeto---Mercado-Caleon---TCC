import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';

const C = ADMIN_THEME.colors;
const referenceOrder = {
	id: '897',
	customer: 'Christian Godoi',
	time: '14:32',
	paymentMethod: 'PIX aprovado',
	serviceFee: 5,
	checkedItemIds: ['a', 'b'],
	items: [
		{ id: 'a', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 5 },
		{ id: 'b', name: 'Maçã', detail: 'Bandeja selecionada', qty: '1,2 kg', price: 5 },
		{ id: 'c', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 5 },
		{ id: 'd', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 5 },
		{ id: 'e', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 5 },
	],
};
const toCents = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : 0;
const formatCurrency = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminPedidoScreen({ navigation, route, userRole }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const order = route?.params?.order || referenceOrder;
	const orderId = route?.params?.orderId || order.id || referenceOrder.id;
	const items = Array.isArray(order.items) ? order.items : referenceOrder.items;
	const [checked, setChecked] = useState(() => order.checkedItemIds || referenceOrder.checkedItemIds);
	const [notificationsVisible, setNotificationsVisible] = useState(false);
	const checkedCount = items.filter((item) => checked.includes(item.id)).length;
	const subtotalCents = items.reduce((sum, item) => sum + toCents(item.price), 0);
	const serviceFeeCents = toCents(order.serviceFee ?? referenceOrder.serviceFee);
	if (!fontsLoaded) return null;

	function toggleItem(itemId) {
		setChecked((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
	}

	function showUnavailableMessage() {
		Alert.alert('Pedido não atualizado', `A conferência do pedido #${orderId} está completa, mas o aplicativo ainda não possui uma fonte de pedidos conectada. Nenhuma alteração foi salva.`);
	}

	function completeOrder() {
		if (items.length === 0) {
			Alert.alert('Pedido sem itens', 'Não há itens para conferir neste pedido.');
			return;
		}
		if (checkedCount < items.length) {
			Alert.alert('Conferência incompleta', 'Confira os itens antes de concluir a separação.', [
				{ text: 'Voltar', style: 'cancel' },
				{ text: 'Concluir mesmo assim', onPress: showUnavailableMessage },
			]);
			return;
		}
		showUnavailableMessage();
	}

	function cancelOrder() {
		Alert.alert('Cancelar compra', 'Deseja realmente cancelar este pedido?', [
			{ text: 'Continuar pedido', style: 'cancel' },
			{ text: 'Cancelar compra', style: 'destructive', onPress: () => Alert.alert('Pedido não atualizado', 'O aplicativo ainda não possui uma fonte de pedidos conectada. Nenhuma alteração foi salva.') },
		]);
	}

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<AdminNotificationsModal
				visible={notificationsVisible}
				onClose={() => setNotificationsVisible(false)}
				navigation={navigation}
			/>
			<AdminScreenLayout
				headerHeight={72}
				contentStyle={styles.contentPanel}
				headerContent={<View style={styles.topbar}>
				<View style={styles.brandMark}><Feather name="user" size={22} color={C.white} /></View>
				<View style={styles.brandCopy}><Text style={styles.kicker}>Painel Operacional</Text><Text style={styles.greeting}>Olá, Administrador</Text></View>
				<CircularIconButton size={40} borderRadius={12} icon={<Feather name="bell" size={20} color={C.white} />} onPress={() => setNotificationsVisible(true)} accessibilityLabel="Abrir notificações" />
			</View>}
				footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Início" showAdd={userRole === 'admin'} />}
			>
			<ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.pageTitleRow}>
					<CircularIconButton size={40} borderRadius={12} icon={<Feather name="chevron-left" size={27} color={C.white} />} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" />
					<Text style={styles.pageTitle}>Detalhe do Pedido</Text>
				</View>
				<View style={styles.customerCard}>
					<View style={styles.avatar}><Feather name="user" size={28} color="#A3AAA7" /></View>
					<View style={styles.customerInfo}><Text style={styles.customerName}>{order.customer || 'Cliente'}</Text><Text style={styles.meta}>Recebido às {order.time || '—'}</Text></View>
					<Text style={styles.orderNumber}>#{orderId}</Text>
				</View>
				<View style={styles.itemsCard}>
					<View style={styles.itemsHeading}>
						<Text style={styles.itemsTitle}><Text style={styles.countBadge}>{items.length}</Text> Itens do Pedido</Text>
						<Text style={styles.counter}>{items.length ? `${checkedCount}/${items.length} controlados` : 'Sem itens para conferir'}</Text>
					</View>
					{items.map((item) => {
						const selected = checked.includes(item.id);
						return <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id)} activeOpacity={0.75} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
							<View style={styles.productThumb}>
								{item.imageUrl || item.image
									? <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} resizeMode="cover" />
									: <Text style={styles.productEmoji}>{item.name === 'Maçã' ? '🍎' : '🐉'}</Text>}
							</View>
							<View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.meta}>{item.detail}</Text></View>
							<View style={styles.priceColumn}><Text style={styles.qty}>{item.qty}</Text><Text style={styles.itemPrice}>{formatCurrency(toCents(item.price))}</Text></View>
							<View style={[styles.check, selected && styles.checked]}>{selected ? <Feather name="check" size={24} color="#FFFFFF" /> : null}</View>
						</TouchableOpacity>;
					})}
					<View style={styles.totals}>
						<View style={styles.totalLine}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>{formatCurrency(subtotalCents)}</Text></View>
						<View style={styles.totalLine}><Text style={styles.totalLabel}>Taxa de Serviço:</Text><Text style={styles.totalValue}>{formatCurrency(serviceFeeCents)}</Text></View>
						<View style={styles.totalLine}><Text style={styles.totalLabel}>Forma de pagamento:</Text><Text style={styles.payment}>{order.paymentMethod || 'Não informado'}</Text></View>
						<View style={styles.dashed} />
						<View style={styles.totalLine}><Text style={styles.grandTotal}>Total:</Text><Text style={styles.grandTotal}>{formatCurrency(subtotalCents + serviceFeeCents)}</Text></View>
					</View>
				</View>
				<View style={styles.actions}>
					<TouchableOpacity style={styles.cancelButton} onPress={cancelOrder}><Text style={styles.buttonText}>Cancelar compra</Text></TouchableOpacity>
					<TouchableOpacity style={styles.finishButton} onPress={completeOrder}><Text style={styles.buttonText}>Concluir separação</Text></TouchableOpacity>
				</View>
			</ScrollView>
			</AdminScreenLayout>
		</>
	);
}

const styles = StyleSheet.create({
	topbar: { minHeight: 72, paddingHorizontal: ADMIN_THEME.layout.contentPadding, flexDirection: 'row', alignItems: 'center', gap: 12 },
	brandMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
	brandCopy: { flex: 1 },
	kicker: { color: '#A8E8D1', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10 },
	greeting: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 17, marginTop: 2 },
	screen: { flex: 1 },
	contentPanel: { paddingHorizontal: 0 },
	content: { paddingHorizontal: ADMIN_THEME.layout.headerSidePadding, paddingTop: ADMIN_THEME.layout.contentTopSpacing, paddingBottom: 8 },
	pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 23, marginTop: 2 },
	pageTitle: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 25 },
	customerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.white, borderRadius: ADMIN_THEME.layout.cardRadius, marginBottom: 12, elevation: 2 },
	avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E3E1', alignItems: 'center', justifyContent: 'center' },
	customerInfo: { flex: 1 },
	customerName: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 15 },
	meta: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 11, marginTop: 3 },
	orderNumber: { color: C.green, backgroundColor: '#D8F6E9', borderWidth: 1, borderColor: C.mint, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, fontFamily: ADMIN_THEME.fonts.bold },
	itemsCard: { backgroundColor: C.white, borderRadius: ADMIN_THEME.layout.cardRadius, padding: 14, elevation: 2 },
	itemsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
	itemsTitle: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 16 },
	countBadge: { color: '#FFFFFF', backgroundColor: C.mint, overflow: 'hidden', borderRadius: 7, paddingHorizontal: 5 },
	counter: { color: '#D08C18', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 11 },
	itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EEEB' },
	productThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F4F5F4', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	productImage: { width: '100%', height: '100%' },
	productEmoji: { fontSize: 17 },
	itemInfo: { flex: 1, minWidth: 60 },
	itemName: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	priceColumn: { alignItems: 'flex-end' },
	qty: { color: C.ink, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 11 },
	itemPrice: { color: C.success, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14, marginTop: 2 },
	check: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: C.success, alignItems: 'center', justifyContent: 'center' },
	checked: { backgroundColor: C.success },
	totals: { paddingTop: 9, paddingHorizontal: 2 },
	totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 10 },
	totalLabel: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 12 },
	totalValue: { color: C.success, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12 },
	payment: { color: C.success, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 11 },
	dashed: { borderTopWidth: 1, borderColor: '#D6DEDA', borderStyle: 'dashed', marginVertical: 5 },
	grandTotal: { color: C.success, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 20 },
	actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
	cancelButton: { flex: 1, minHeight: 48, backgroundColor: C.red, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
	finishButton: { flex: 1, minHeight: 48, backgroundColor: C.success, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
	buttonText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12, textAlign: 'center' },
});