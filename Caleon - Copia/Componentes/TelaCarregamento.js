import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';
import FundoDegrade from './FundoDegrade';
import { themedStyles, tc } from '../Config/Tema';

const LOGO = require('../assets/logo.png');

/**
 * Tela de carregamento no degradê verde do app.
 * variant="logo": abertura do app, com o logo Caleon no centro.
 * variant="troca": troca entre área do cliente e painel admin, só com o indicador girando.
 */
export default function TelaCarregamento({ variant = 'logo', accessibilityLabel }) {
	const appear = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(appear, {
			toValue: 1,
			duration: 450,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [appear]);

	const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

	return (
		<FundoDegrade>
			<StatusBar barStyle="light-content" backgroundColor="#1B4B3D" />
			<View
				style={styles.content}
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={accessibilityLabel || (variant === 'logo' ? 'Abrindo o Caleon' : 'Carregando')}
			>
				{variant === 'logo' ? (
					<Animated.Image source={LOGO} style={[styles.logo, { opacity: appear, transform: [{ scale }] }]} resizeMode="contain" />
				) : (
					<ActivityIndicator size="large" color={tc('#FFFFFF')} />
				)}
			</View>
		</FundoDegrade>
	);
}

const styles = themedStyles(StyleSheet.create({
	content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	logo: { width: '72%', maxWidth: 300, aspectRatio: 1 },
}));
