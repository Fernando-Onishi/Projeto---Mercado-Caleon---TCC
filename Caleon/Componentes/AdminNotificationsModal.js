import React, { useRef } from 'react';
import { Animated, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import CircularIconButton from './CircularIconButton';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { useAdminNotifications } from './AdminNotificationsContext';

const C = ADMIN_THEME.colors;

export default function AdminNotificationsModal({ visible, onClose, navigation }) {
	const { notifications, removeNotification, clearNotifications } = useAdminNotifications();

	function openNotification(notification) {
		onClose();
		navigation.navigate('AdminProdutos', { stockFilter: notification.filter });
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
							size={30}
							borderRadius={10}
							backgroundColor={C.red}
							icon={<Feather name="x" size={17} color={C.white} />}
							onPress={onClose}
							accessibilityLabel="Fechar notificações"
						/>
						<Text style={styles.title}>Notificações</Text>
						<TouchableOpacity
							style={styles.clearButton}
							onPress={clearNotifications}
							disabled={notifications.length === 0}
							accessibilityRole="button"
							accessibilityLabel="Limpar todas as notificações"
						>
							<Feather name="trash-2" size={15} color={notifications.length ? C.red : C.muted} />
							<Text style={[styles.clearButtonText, !notifications.length && styles.disabledText]}>Limpar tudo</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.list}>
						{notifications.length ? notifications.map((notification) => (
							<NotificationRow
								key={notification.title}
								notification={notification}
								onPress={() => openNotification(notification)}
								onRemove={() => removeNotification(notification.title)}
							/>
						)) : <Text style={styles.emptyState}>Nenhuma notificação</Text>}
					</View>
				</View>
			</View>
		</Modal>
	);
}

function NotificationRow({ notification, onPress, onRemove }) {
	const translateX = useRef(new Animated.Value(0)).current;
	const panResponder = useRef(PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
		onPanResponderMove: (_, gesture) => translateX.setValue(Math.min(0, gesture.dx)),
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dx < -85) {
				onRemove();
				return;
			}
			Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
		},
		onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
	})).current;

	return (
		<View style={styles.rowContainer}>
			<Animated.View style={[styles.card, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
				<TouchableOpacity
					style={styles.notificationContent}
					onPress={onPress}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel={`${notification.title}, ${notification.detail}`}
				>
					<View style={[styles.icon, { backgroundColor: notification.color }]}>
						<Feather name={notification.icon} size={19} color={C.white} />
					</View>
					<View style={styles.copy}>
						<Text style={[styles.cardTitle, { color: notification.color }]}>{notification.title}</Text>
						<Text style={styles.detail}>{notification.detail}</Text>
					</View>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.removeButton}
					onPress={onRemove}
					accessibilityRole="button"
					accessibilityLabel={`Remover notificação ${notification.title}`}
				>
					<Feather name="trash-2" size={17} color={C.red} />
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
	dialog: { width: '100%', maxWidth: 420, minHeight: 280, padding: 18, borderRadius: 14, backgroundColor: C.white, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
	header: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	title: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 22 },
	list: { gap: 8, marginTop: 18 },
	clearButton: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
	clearButtonText: { color: C.red, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10 },
	disabledText: { color: C.muted },
	emptyState: { paddingVertical: 24, color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 13, textAlign: 'center' },
	rowContainer: { overflow: 'hidden', borderRadius: 8 },
	card: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D5DAD8', backgroundColor: C.white, elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3 },
	notificationContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
	removeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFF0F0' },
	icon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	copy: { flex: 1, minWidth: 0 },
	cardTitle: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12 },
	detail: { color: '#4F5955', fontFamily: ADMIN_THEME.fonts.body, fontSize: 11, marginTop: 2 },
});