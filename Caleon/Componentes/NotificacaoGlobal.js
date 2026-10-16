import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';

const NOTIFICATION_EVENT = 'caleon:notification';

export function showGlobalNotification(message) {
	DeviceEventEmitter.emit(NOTIFICATION_EVENT, message);
}

export default function NotificacaoGlobal() {
	const [message, setMessage] = useState('');
	const timer = useRef(null);

	useEffect(() => {
		const subscription = DeviceEventEmitter.addListener(NOTIFICATION_EVENT, (nextMessage) => {
			clearTimeout(timer.current);
			setMessage(nextMessage);
			timer.current = setTimeout(() => setMessage(''), 2400);
		});

		return () => {
			clearTimeout(timer.current);
			subscription.remove();
		};
	}, []);

	if (!message) return null;

	return (
		<View style={styles.host} pointerEvents="box-none">
			<View style={styles.toast} accessibilityLiveRegion="polite">
				<Text style={styles.toastText}>{message}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	host: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 104,
		alignItems: 'center',
		zIndex: 100,
	},
	toast: {
		maxWidth: '90%',
		backgroundColor: '#1B4B3D',
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 10,
		elevation: 6,
	},
	toastText: {
		color: '#fff',
		fontSize: 14,
		fontFamily: 'LilitaOne_400Regular',
		textAlign: 'center',
	},
});