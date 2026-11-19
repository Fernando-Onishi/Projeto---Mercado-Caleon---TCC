import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ModalSobe from './ModalSobe';
import Feather from '@expo/vector-icons/Feather';
import CircularIconButton from './CircularIconButton';
import { useClienteNotificacoes } from './ClienteNotificacoesContext';
import { themedStyles, tc } from '../Config/Tema';

const COLORS = {
	mint: '#40B190',
	dark: '#1B4B3D',
	red: '#FF383C',
	white: '#FFFFFF',
	ink: '#111715',
	muted: '#7A8581',
	border: '#DDE5E1',
	unread: '#F2FBF7',
};

function timeAgo(timestamp) {
	const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
	if (minutes < 1) return 'agora';
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours} h`;
	const days = Math.floor(hours / 24);
	return days === 1 ? 'ontem' : `há ${days} dias`;
}

/**
 * Sino do cliente com contador de não lidas. Abre a lista de avisos dos pedidos;
 * tocar num aviso abre o acompanhamento daquele pedido.
 */
export default function BotaoNotificacoesCliente({ navigation, size = 40 }) {
	const { notifications, unreadCount, seenAt, markAllRead, removeNotification, clearNotifications } = useClienteNotificacoes();
	const [visible, setVisible] = useState(false);
	const [openedSeenAt, setOpenedSeenAt] = useState(0);

	function open() {
		// Guarda o "lido até" de antes de abrir, para destacar o que é novo nesta abertura.
		setOpenedSeenAt(seenAt);
		setVisible(true);
		markAllRead();
	}

	function openOrder(notification) {
		setVisible(false);
		if (notification.action === 'admin') {
			// Promovido a administrador: vai para o painel admin (com a tela de troca).
			navigation.navigate('TelaTroca', { destino: 'AdminHome' });
			return;
		}
		// Avisos sem pedido (ex.: acesso de admin removido) só fecham o painel.
		if (notification.orderId) navigation.navigate('TelaPedido', { orderId: notification.orderId });
	}

	return (
		<>
			<View style={styles.buttonWrap}>
				<CircularIconButton
					size={size}
					borderRadius={12}
					icon={<Feather name="bell" size={size * 0.55} color={tc(COLORS.white)} />}
					onPress={open}
					accessibilityLabel={unreadCount ? `Notificações, ${unreadCount} novas` : 'Notificações'}
				/>
				{unreadCount > 0 ? (
					<View style={styles.badge} pointerEvents="none">
						<Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
					</View>
				) : null}
			</View>

			<ModalSobe visible={visible} onRequestClose={() => setVisible(false)} backdropColor="rgba(0, 0, 0, 0.32)" animation="fade">
				<View style={styles.overlay}>
					<TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setVisible(false)} accessibilityLabel="Fechar notificações" />
					<View style={styles.dialog}>
						<View style={styles.header}>
							<CircularIconButton
								size={36}
								borderRadius={10}
								backgroundColor={COLORS.red}
								icon={<Feather name="x" size={19} color={tc(COLORS.white)} />}
								onPress={() => setVisible(false)}
								accessibilityLabel="Fechar notificações"
							/>
							<View style={styles.titleBlock} pointerEvents="none">
								<Text style={styles.title}>Notificações</Text>
								<Text style={styles.subtitle}>
									{notifications.length
										? `${notifications.length} ${notifications.length === 1 ? 'aviso' : 'avisos'}`
										: 'Tudo em dia'}
								</Text>
							</View>
							<View style={styles.headerSpacer} />
						</View>
						<View style={styles.divider} />

						{notifications.length ? (
							<>
								<ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
									{notifications.map((notification) => {
										const isNew = notification.at > openedSeenAt;
										return (
											<View key={notification.id} style={[styles.card, isNew && styles.cardNew]}>
												<TouchableOpacity
													style={styles.cardMain}
													onPress={() => openOrder(notification)}
													activeOpacity={0.8}
													accessibilityRole="button"
													accessibilityLabel={`${notification.title}. ${notification.detail}`}
												>
													<View style={[styles.icon, { backgroundColor: notification.color }]}>
														<Feather name={notification.icon} size={19} color={tc(COLORS.white)} />
													</View>
													<View style={styles.copy}>
														<Text style={styles.cardTitle} numberOfLines={2}>{notification.title}</Text>
														<Text style={styles.detail} numberOfLines={2}>{notification.detail}</Text>
														<Text style={styles.time}>{timeAgo(notification.at)}</Text>
													</View>
												</TouchableOpacity>
												<TouchableOpacity
													style={styles.removeButton}
													onPress={() => removeNotification(notification.id)}
													accessibilityRole="button"
													accessibilityLabel={`Remover notificação ${notification.title}`}
												>
													<Feather name="trash-2" size={17} color={tc(COLORS.red)} />
												</TouchableOpacity>
											</View>
										);
									})}
								</ScrollView>
								<TouchableOpacity
									style={styles.clearButton}
									onPress={clearNotifications}
									accessibilityRole="button"
									accessibilityLabel="Limpar todas as notificações"
								>
									<Feather name="trash-2" size={16} color={tc(COLORS.red)} />
									<Text style={styles.clearText}>Limpar tudo</Text>
								</TouchableOpacity>
							</>
						) : (
							<View style={styles.empty}>
								<View style={styles.emptyIcon}>
									<Feather name="bell-off" size={28} color={tc(COLORS.dark)} />
								</View>
								<Text style={styles.emptyText}>Nenhuma notificação</Text>
								<Text style={styles.emptyHint}>Avisamos aqui quando seu pedido mudar de etapa.</Text>
							</View>
						)}
					</View>
				</View>
			</ModalSobe>
		</>
	);
}

const styles = themedStyles(StyleSheet.create({
	buttonWrap: { position: 'relative' },
	badge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: COLORS.dark, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
	badgeText: { color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 9, lineHeight: 12, textAlign: 'center' },
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
	dialog: { width: '100%', maxWidth: 420, maxHeight: '78%', padding: 18, borderRadius: 18, backgroundColor: COLORS.white, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
	header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	titleBlock: { position: 'absolute', left: 44, right: 44, alignItems: 'center' },
	headerSpacer: { width: 36 },
	title: { color: COLORS.ink, fontFamily: 'LilitaOne_400Regular', fontSize: 24, textAlign: 'center' },
	subtitle: { color: COLORS.muted, fontFamily: 'Montserrat_500Medium', fontSize: 12, marginTop: 1 },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginTop: 14 },
	clearButton: { minHeight: 46, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD0D1', backgroundColor: '#FFF0F0' },
	clearText: { color: COLORS.red, fontFamily: 'Montserrat_700Bold', fontSize: 14 },
	list: { marginTop: 14, flexGrow: 0 },
	listContent: { gap: 8, paddingBottom: 4 },
	card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
	cardNew: { backgroundColor: COLORS.unread, borderColor: COLORS.mint },
	cardMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
	icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	copy: { flex: 1, minWidth: 0 },
	cardTitle: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 13 },
	detail: { color: '#4F5955', fontFamily: 'Montserrat_400Regular', fontSize: 12, marginTop: 2 },
	time: { color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 3 },
	removeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF0F0' },
	empty: { alignItems: 'center', paddingTop: 28, paddingBottom: 18 },
	emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D8F6E9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
	emptyText: { color: COLORS.ink, fontFamily: 'Montserrat_700Bold', fontSize: 16, textAlign: 'center' },
	emptyHint: { maxWidth: 270, marginTop: 6, color: COLORS.muted, fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
}));
