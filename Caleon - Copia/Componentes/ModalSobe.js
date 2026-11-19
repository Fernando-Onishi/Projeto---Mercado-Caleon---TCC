import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { themedStyles } from '../Config/Tema';

/**
 * Modal do painel admin: escurece a tela atual (que continua aparecendo atrás)
 * e o conteúdo sobe de baixo por cima dela. Ao fechar, desce e some.
 * Uso igual ao <Modal>: visible + onRequestClose; o fundo escuro vem de backdropColor.
 * animation: 'sobe' (desliza de baixo) ou 'fade' (aparece suavemente, com um leve zoom).
 */
export default function ModalSobe({ visible, onRequestClose, backdropColor = 'rgba(0, 0, 0, 0.4)', animation = 'sobe', children }) {
	const { height } = useWindowDimensions();
	const [mounted, setMounted] = useState(visible);
	const progress = useRef(new Animated.Value(0)).current;
	const useNative = Platform.OS !== 'web';

	useEffect(() => {
		if (visible) {
			setMounted(true);
			progress.setValue(0);
			Animated.timing(progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
		} else if (mounted) {
			Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: useNative })
				.start(() => setMounted(false));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	if (!mounted) return null;

	const contentAnimation = animation === 'fade'
		? { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }
		: { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] };

	return (
		<Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onRequestClose}>
			<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: progress }]} />
			<Animated.View style={[styles.content, contentAnimation]}>
				{children}
			</Animated.View>
		</Modal>
	);
}

const styles = themedStyles(StyleSheet.create({
	content: { flex: 1 },
}));
