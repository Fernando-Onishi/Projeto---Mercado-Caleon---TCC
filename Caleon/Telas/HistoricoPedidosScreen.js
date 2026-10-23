import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import { carregarPedidos } from './Historicopedidos';

const COLORS = {
	green: '#1B4B3D',
	mint: '#40B190',
	background: '#F1F3F5',
	white: '#FFFFFF',
	ink: '#202020',
	muted: '#757575',
};

export default function HistoricoPedidosScreen({ navigation }) {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});

	useEffect(() => {
		let active = true;

		async function loadOrders() {
			try {
				const history = await carregarPedidos();
				if (active) setOrders(history);
			} catch (error) {
				console.error('Não foi possível carregar o histórico de pedidos.', error);
				if (active) setLoadError(true);
			} finally {
				if (active) setLoading(false);
			}
		}

		loadOrders();
		return () => { active = false; };
	}, []);

	if (!fontsLoaded) return null;

	return (
		<SafeAreaScreen style={styles.safeArea}>
			<StatusBar backgroundColor={COLORS.green} barStyle="light-content" />
			<View style={styles.topBand} />
			<View style={styles.screen}>
				<View style={styles.header}>
					<View style={styles.headerActions}>
						<CircularIconButton
							style={styles.backButton}
							borderRadius={12}
							icon={<Feather name="chevron-left" size={27} color={COLORS.white} />}
							onPress={() => navigation.goBack()}
							accessibilityLabel="Voltar"
						/>
					</View>
					<Text style={styles.title}>Histórico de pedidos</Text>
				</View>
				<FlatList
					data={orders}
					keyExtractor={(order) => order.id}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={(
						<View style={styles.emptyState}>
							{loading ? (
								<ActivityIndicator size="large" color={COLORS.green} />
							) : (
								<Text style={styles.emptyText}>
									{loadError ? 'Não foi possível carregar seus pedidos.' : 'Você ainda não tem pedidos.'}
								</Text>
							)}
						</View>
					)}
					renderItem={({ item }) => (
						<View style={styles.orderCard}>
							<View style={styles.orderHeader}>
								<View>
									<Text style={styles.orderNumber}>Pedido #{item.numero}</Text>
									<Text style={styles.orderDate}>{item.dataHora}</Text>
								</View>
								<Text style={styles.orderStatus}>{item.status}</Text>
							</View>
							<Text style={styles.products} numberOfLines={2}>
								{item.produtos.map((product) => `${product.quantidade}x ${product.nome}`).join(' · ')}
							</Text>
							<View style={styles.orderFooter}>
								<Text style={styles.payment}>{item.formaPagamento}</Text>
								<Text style={styles.total}>
									R$ {item.valorTotal.toFixed(2).replace('.', ',')}
								</Text>
							</View>
						</View>
					)}
				/>
			</View>
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
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
	header: { height: 112, alignItems: 'center', paddingTop: 15 },
	headerActions: {
		width: '100%',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginTop: 14,
		color: COLORS.ink,
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 25,
	},
	listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 },
	emptyState: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center' },
	emptyText: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 14, textAlign: 'center' },
	orderCard: {
		padding: 16,
		borderRadius: 16,
		backgroundColor: COLORS.white,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E1E7E4',
	},
	orderHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
	orderNumber: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	orderDate: { marginTop: 4, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 11 },
	orderStatus: { color: COLORS.green, fontFamily: 'Montserrat_700Bold', fontSize: 11 },
	products: { marginTop: 14, color: COLORS.ink, fontFamily: 'Montserrat_400Regular', fontSize: 12, lineHeight: 18 },
	orderFooter: {
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#E1E7E4',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	payment: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 11 },
	total: { color: COLORS.green, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
});
