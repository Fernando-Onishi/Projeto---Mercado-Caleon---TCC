import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import CircularIconButton from './CircularIconButton';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { useAdminNotifications } from './AdminNotificationsContext';
import ModalSobe from './ModalSobe';
import { themedStyles, tc } from '../Config/Tema';

const C = ADMIN_THEME.colors;

function timeAgo(timestamp) {
	const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
	if (minutes < 1) return 'agora';
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours} h`;
	const days = Math.floor(hours / 24);
	return days === 1 ? 'ontem' : `há ${days} dias`;
}

export default function AdminNotificationsModal({ visible, onClose, navigation }) {
	const { notifications, seenAt, markAllRead, removeNotification, clearNotifications } = useAdminNotifications();
	// "Lido até" de antes de abrir: destaca o que é novo nesta abertura.
	const [openedSeenAt, setOpenedSeenAt] = useState(0);

	useEffect(() => {
		if (!visible) return;
		setOpenedSeenAt(seenAt);
		markAllRead();
		// Só quando o painel abre.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	function openNotification(notification) {
		onClose();
		if (notification.orderId) {
			// Pedido: abre a Home do admin, onde fica a fila de pedidos.
			navigation.navigate('AdminHome', { tab: 'AdminHome' });
			return;
		}
		// Avisos de estoque abrem o catálogo filtrado; boas-vindas só fecham o painel.
		if (notification.filter) navigation.navigate('AdminProdutos', { stockFilter: notification.filter });
	}

	return (
		<ModalSobe visible={visible} onRequestClose={onClose} backdropColor="rgba(0, 0, 0, 0.32)" animation="fade">
			<View style={styles.overlay}>
				<TouchableOpacity
					style={StyleSheet.absoluteFillObject}
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Fechar notificações"
				/>
				<View style={styles.dialog}>
					<View style={styles.header}>
						<CircularIconButton
							size={36}
							borderRadius={10}
							backgroundColor={C.red}
							icon={<Feather name="x" size={19} color={tc(C.white)} />}
							onPress={onClose}
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
								{notifications.map((notification) => (
									<NotificationRow
										key={notification.id}
										notification={notification}
										isNew={notification.at > openedSeenAt}
										onPress={() => openNotification(notification)}
										onRemove={() => removeNotification(notification.id)}
									/>
								))}
							</ScrollView>
							<TouchableOpacity
								style={styles.clearButton}
								onPress={clearNotifications}
								accessibilityRole="button"
								accessibilityLabel="Limpar todas as notificações"
							>
								<Feather name="trash-2" size={16} color={tc(C.red)} />
								<Text style={styles.clearButtonText}>Limpar tudo</Text>
							</TouchableOpacity>
						</>
					) : (
						<View style={styles.empty}>
							<View style={styles.emptyIcon}>
								<Feather name="bell-off" size={28} color={tc(C.green)} />
							</View>
							<Text style={styles.emptyState}>Nenhuma notificação</Text>
							<Text style={styles.emptyHint}>Avisamos aqui sobre pedidos novos, Pix informado, atrasos e estoque.</Text>
						</View>
					)}
				</View>
			</View>
		</ModalSobe>
	);
}

function NotificationRow({ notification, isNew, onPress, onRemove }) {
	const translateX = useRef(new Animated.Value(0)).current;
	const removeRef = useRef(onRemove);
	removeRef.current = onRemove;
	const panResponder = useRef(PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
		onPanResponderMove: (_, gesture) => translateX.setValue(Math.min(0, gesture.dx)),
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dx < -85) {
				removeRef.current();
				return;
			}
			Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
		},
		onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
	})).current;

	return (
		<View style={styles.rowContainer}>
			<Animated.View style={[styles.card, isNew && styles.cardNew, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
				<TouchableOpacity
					style={styles.notificationContent}
					onPress={onPress}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel={`${notification.title}, ${notification.detail}`}
				>
					<View style={[styles.icon, { backgroundColor: notification.color }]}>
						<Feather name={notification.icon} size={19} color={tc(C.white)} />
					</View>
					<View style={styles.copy}>
						<Text style={[styles.cardTitle, { color: notification.color }]} numberOfLines={2}>{notification.title}</Text>
						<Text style={styles.detail} numberOfLines={2}>{notification.detail}</Text>
						<Text style={styles.time}>{timeAgo(notification.at)}</Text>
					</View>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.removeButton}
					onPress={onRemove}
					accessibilityRole="button"
					accessibilityLabel={`Remover notificação ${notification.title}`}
				>
					<Feather name="trash-2" size={17} color={tc(C.red)} />
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
	dialog: { width: '100%', maxWidth: 420, maxHeight: '78%', padding: 18, borderRadius: 14, backgroundColor: C.white, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
	header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	titleBlock: { position: 'absolute', left: 44, right: 44, alignItems: 'center' },
	headerSpacer: { width: 36 },
	title: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 24, textAlign: 'center' },
	subtitle: { color: C.muted, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 12, marginTop: 1 },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#D5DAD8', marginTop: 14 },
	list: { marginTop: 14, flexGrow: 0 },
	listContent: { gap: 8, paddingBottom: 4 },
	clearButton: { minHeight: 46, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD0D1', backgroundColor: '#FFF0F0' },
	clearButtonText: { color: C.red, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	empty: { alignItems: 'center', paddingTop: 28, paddingBottom: 18 },
	emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D8F6E9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
	emptyState: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 16, textAlign: 'center' },
	emptyHint: { maxWidth: 270, marginTop: 6, color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
	rowContainer: { overflow: 'hidden', borderRadius: 10 },
	card: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#D5DAD8', backgroundColor: C.white },
	cardNew: { backgroundColor: '#F2FBF7', borderColor: C.mint },
	notificationContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
	removeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFF0F0' },
	icon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	copy: { flex: 1, minWidth: 0 },
	cardTitle: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12 },
	detail: { color: '#4F5955', fontFamily: ADMIN_THEME.fonts.body, fontSize: 11, marginTop: 2 },
	time: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 10, marginTop: 3 },
}));
