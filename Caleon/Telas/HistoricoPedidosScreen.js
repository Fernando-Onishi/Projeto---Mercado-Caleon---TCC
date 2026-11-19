import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import BotaoNotificacoesCliente from '../Componentes/BotaoNotificacoesCliente';
import { auth } from '../Config/FireBaseConfig';
import { formatCurrency, productImageFor } from '../Config/Produtos';
import { PAYMENT_LABELS, formatDateTime, hideOrdersForClient, isFinishedOrder, subscribeHiddenOrders, subscribeToMyOrders } from '../Config/Pedidos';
import ModalSobe from '../Componentes/ModalSobe';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import { themeColor, themedStyles, tc } from '../Config/Tema';

const COLORS = {
	green: '#1B4B3D',
	mint: '#40B190',
	background: '#F1F3F5',
	white: '#FFFFFF',
	ink: '#111715',
	muted: '#757575',
	price: '#1B4B3D',
};

// Etiqueta de estado de cada pedido (texto curto + cor).
const STATUS = {
	recebido: { label: 'Enviado', color: '#40B190' },
	aceito: { label: 'Aceito', color: '#40B190' },
	preparando: { label: 'Preparando', color: '#E7A51A' },
	pronto: { label: 'Pronto', color: '#00AA6A' },
	retirado: { label: 'Retirado', color: '#1B4B3D' },
	cancelado: { label: 'Cancelado', color: '#FF383C' },
};

const MAX_THUMBS = 3;

function normalize(text) {
	return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function paymentText(order) {
	if (order.paymentMethod === 'pix') return 'Pagamento via Pix';
	const brand = PAYMENT_LABELS[order.paymentMethod] || 'cartão';
	return `${brand} na retirada`;
}

function OrderCard({ order, onPress, onDelete }) {
	const items = order.items || [];
	const thumbs = items.slice(0, MAX_THUMBS);
	const extra = items.length - thumbs.length;
	const status = STATUS[order.status] || STATUS.recebido;
	const date = formatDateTime(order.createdAt).replace(/ de ([a-zç]+) de /, (m, month) => ` de ${month.charAt(0).toUpperCase()}${month.slice(1)} de `);

	return (
		<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={`Pedido ${order.number}, ${status.label}, ${formatCurrency(Number(order.total) || 0)}`}>
			<View style={styles.bagCircle}>
				<Feather name="shopping-bag" size={26} color="#FFFFFF" />
			</View>

			<View style={styles.middle}>
				<Text style={styles.orderNumber} numberOfLines={1}>Pedido #{order.number}</Text>
				<Text style={styles.date} numberOfLines={1}>{date}</Text>
				<View style={styles.thumbs}>
					{thumbs.map((item, index) => {
						const uri = productImageFor(item.productId, item.imagem);
						return (
							<View key={`${item.productId}-${index}`} style={styles.thumb}>
								{uri ? <Image source={{ uri }} style={styles.thumbImage} resizeMode="contain" /> : <Feather name="package" size={20} color={tc(COLORS.muted)} />}
							</View>
						);
					})}
					{extra > 0 ? (
						<View style={[styles.thumb, styles.thumbMore]}>
							<Text style={styles.thumbMoreText}>+{extra}</Text>
						</View>
					) : null}
				</View>
			</View>

			<View style={styles.right}>
				<View style={styles.rightTop}>
					{onDelete ? (
						<TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Excluir o pedido ${order.number} do histórico`}>
							<Feather name="trash-2" size={17} color="#FF383C" />
						</TouchableOpacity>
					) : null}
					<View style={[styles.statusBadge, { backgroundColor: status.color }]}>
						<Text style={styles.statusText}>{status.label}</Text>
					</View>
				</View>
				<View style={styles.rightBottom}>
					<Text style={styles.total}>{formatCurrency(Number(order.total) || 0)}</Text>
					<Text style={styles.payment} numberOfLines={1}>{paymentText(order)}</Text>
					<View style={styles.detailsButton}>
						<Text style={styles.detailsText}>Ver Detalhes</Text>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	);
}

export default function HistoricoPedidosScreen({ navigation }) {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [search, setSearch] = useState('');
	// Pedidos que o cliente tirou do histórico (salvo na conta).
	const [hiddenIds, setHiddenIds] = useState([]);
	// Confirmação: { ids, title, message }
	const [confirm, setConfirm] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});

	// Pedidos reais do cliente no Firestore, atualizados em tempo real.
	useEffect(() => {
		const user = auth.currentUser;
		if (!user) {
			setLoading(false);
			return undefined;
		}
		return subscribeToMyOrders(user.uid, (history) => {
			setOrders(history);
			setLoadError(false);
			setLoading(false);
		}, (error) => {
			console.error('Não foi possível carregar o histórico de pedidos.', error);
			setLoadError(true);
			setLoading(false);
		});
	}, []);

	useEffect(() => subscribeHiddenOrders(auth.currentUser?.uid, setHiddenIds), []);

	const shownOrders = useMemo(() => orders.filter((order) => !hiddenIds.includes(order.id)), [orders, hiddenIds]);
	const finishedIds = useMemo(() => shownOrders.filter(isFinishedOrder).map((order) => order.id), [shownOrders]);

	function askDelete(order) {
		setConfirm({
			ids: [order.id],
			title: 'Excluir pedido',
			message: isFinishedOrder(order)
				? `Tirar o pedido #${order.number} do seu histórico? Essa ação não pode ser desfeita.`
				: `O pedido #${order.number} ainda está em andamento. Se tirar do histórico, você deixa de acompanhar por aqui e pelas notificações. Continuar?`,
		});
	}

	function askClearAll() {
		setConfirm({
			ids: finishedIds,
			title: 'Limpar histórico',
			message: `Tirar ${finishedIds.length === 1 ? 'o pedido finalizado' : `os ${finishedIds.length} pedidos finalizados`} do seu histórico? Pedidos em andamento continuam aparecendo.`,
		});
	}

	async function confirmDelete() {
		if (!confirm || deleting) return;
		setDeleting(true);
		try {
			await hideOrdersForClient(auth.currentUser?.uid, confirm.ids);
			setHiddenIds((current) => [...new Set([...current, ...confirm.ids])]);
			showGlobalNotification(confirm.ids.length === 1 ? 'Pedido excluído do histórico' : 'Histórico limpo');
			setConfirm(null);
		} catch (error) {
			console.error('Não foi possível excluir do histórico.', error);
			showGlobalNotification('Não foi possível excluir agora. Confira sua conexão.');
		} finally {
			setDeleting(false);
		}
	}

	// Busca pelo número do pedido ou pelo nome dos produtos.
	const visibleOrders = useMemo(() => {
		const term = normalize(search.trim());
		if (!term) return shownOrders;
		return shownOrders.filter((order) => normalize(order.number).includes(term)
			|| (order.items || []).some((item) => normalize(item.nome).includes(term)));
	}, [shownOrders, search]);

	if (!fontsLoaded) return null;

	return (
		<SafeAreaScreen style={styles.safeArea} bottomColor="#f2f3f4">
			<StatusBar backgroundColor={COLORS.green} barStyle="light-content" />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.headerActions}>
					<CircularIconButton
						style={styles.backButton}
						borderRadius={12}
						icon={<Feather name="chevron-left" size={27} color="#FFFFFF" />}
						onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TelaHome', { tab: 'TelaPerfil' }))}
						accessibilityLabel="Voltar"
					/>
					<BotaoNotificacoesCliente navigation={navigation} size={40} />
				</View>

				<View style={styles.searchBox}>
					<Feather name="search" size={20} color={tc('#4B5450')} />
					<TextInput
						style={styles.searchInput}
						value={search}
						onChangeText={setSearch}
						placeholder="Pesquise produtos, pedidos"
						placeholderTextColor={tc('#7A8581')}
						returnKeyType="search"
						accessibilityLabel="Pesquisar nos seus pedidos"
					/>
					{search ? (
						<TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
							<Feather name="x" size={18} color={tc('#4B5450')} />
						</TouchableOpacity>
					) : null}
				</View>

				{finishedIds.length ? (
					<TouchableOpacity style={styles.clearButton} onPress={askClearAll} accessibilityRole="button" accessibilityLabel="Limpar histórico de pedidos finalizados">
						<Feather name="trash-2" size={14} color="#FF383C" />
						<Text style={styles.clearText}>Limpar histórico</Text>
					</TouchableOpacity>
				) : null}

				<FlatList
					data={visibleOrders}
					keyExtractor={(order) => order.id}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					ListEmptyComponent={(
						<View style={styles.emptyState}>
							{loading ? (
								<ActivityIndicator size="large" color={themeColor(COLORS.green, 'text')} />
							) : (
								<>
									<Feather name="shopping-bag" size={44} color={tc('#B8C2BE')} />
									<Text style={styles.emptyText}>
										{loadError
											? 'Não foi possível carregar seus pedidos.'
											: search ? 'Nenhum pedido encontrado.' : 'Você ainda não tem pedidos.'}
									</Text>
								</>
							)}
						</View>
					)}
					renderItem={({ item }) => (
						<OrderCard
							order={item}
							onPress={() => navigation.navigate('TelaPedido', { orderId: item.id })}
							onDelete={() => askDelete(item)}
						/>
					)}
				/>
				<NavegacaoInferior navigation={navigation} activeTab="Perfil" />
			</View>

			<ModalSobe visible={Boolean(confirm)} onRequestClose={() => setConfirm(null)} backdropColor="rgba(0, 0, 0, 0.5)" animation="fade">
				<View style={styles.confirmOverlay}>
					<View style={styles.confirmDialog}>
						<View style={styles.confirmIcon}>
							<Feather name="trash-2" size={22} color="#FF383C" />
						</View>
						<Text style={styles.confirmTitle}>{confirm?.title}</Text>
						<Text style={styles.confirmMessage}>{confirm?.message}</Text>
						<Text style={styles.confirmNote}>O mercado continua com o registro da compra.</Text>
						<View style={styles.confirmActions}>
							<TouchableOpacity style={[styles.confirmButton, styles.confirmCancel]} onPress={() => setConfirm(null)} disabled={deleting} accessibilityRole="button">
								<Text style={[styles.confirmButtonText, styles.confirmCancelText]}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.confirmButton, styles.confirmDelete]} onPress={confirmDelete} disabled={deleting} accessibilityRole="button">
								{deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmButtonText}>Excluir</Text>}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</ModalSobe>
		</SafeAreaScreen>
	);
}

const styles = themedStyles(StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: COLORS.green },
	topBand: { height: 40, backgroundColor: COLORS.green },
	screen: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: COLORS.background,
		overflow: 'hidden',
	},
	headerActions: {
		paddingHorizontal: 16,
		paddingTop: 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
	searchBox: {
		height: 46,
		marginHorizontal: 22,
		marginTop: 16,
		marginBottom: 6,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 23,
		backgroundColor: '#DCDFDE',
	},
	searchInput: { flex: 1, height: '100%', color: COLORS.ink, fontFamily: 'Montserrat_500Medium', fontSize: 13, paddingVertical: 0 },
	listContent: { flexGrow: 1, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 24, gap: 14 },
	emptyState: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
	emptyText: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 14, textAlign: 'center' },
	card: {
		minHeight: 112,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 14,
		paddingLeft: 10,
		paddingRight: 12,
		borderRadius: 14,
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: '#D9DEDC',
		elevation: 3,
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	bagCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
	middle: { flex: 1, minWidth: 0 },
	orderNumber: { color: COLORS.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 20 },
	date: { marginTop: 2, color: COLORS.muted, fontFamily: 'Montserrat_700Bold', fontSize: 9.5 },
	thumbs: { flexDirection: 'row', gap: 6, marginTop: 10 },
	thumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#F4F6F5', borderWidth: 1, borderColor: '#E5E9E7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	thumbImage: { width: 40, height: 40 },
	thumbMore: { backgroundColor: '#EEF1F0' },
	thumbMoreText: { color: COLORS.muted, fontFamily: 'Montserrat_700Bold', fontSize: 13 },
	right: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 92 },
	rightTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	deleteButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
	clearButton: { alignSelf: 'flex-end', marginRight: 22, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFF0F0' },
	clearText: { color: '#FF383C', fontFamily: 'Montserrat_700Bold', fontSize: 12 },
	confirmOverlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
	confirmDialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 20, backgroundColor: COLORS.white },
	confirmIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
	confirmTitle: { color: COLORS.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 24 },
	confirmMessage: { marginTop: 6, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 20 },
	confirmNote: { marginTop: 8, color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 12 },
	confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
	confirmButton: { minHeight: 44, minWidth: 96, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	confirmCancel: { backgroundColor: COLORS.background },
	confirmDelete: { backgroundColor: '#FF383C' },
	confirmButtonText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	confirmCancelText: { color: COLORS.ink },
	statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
	statusText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 11 },
	rightBottom: { alignItems: 'flex-end', marginTop: 8 },
	total: { color: COLORS.price, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
	payment: { marginTop: 2, color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 9 },
	detailsButton: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.green },
	detailsText: { color: COLORS.green, fontFamily: 'Montserrat_700Bold', fontSize: 10 },
}));
