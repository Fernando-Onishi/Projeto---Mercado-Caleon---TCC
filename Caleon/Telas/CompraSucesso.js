import React, { useEffect, useRef } from 'react';
import { Animated, BackHandler, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themedStyles, tc } from '../Config/Tema';

const GREEN = '#00AA6A';
const WHITE = '#FFFFFF';

/**
 * Tela de confirmação depois que o cliente informa o pagamento Pix.
 * "Voltar ao Início" (e o voltar do Android) leva para a Home do cliente, sem voltar ao pagamento.
 */
export default function CompraSucesso({ navigation }) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});
	const pop = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
	}, [pop]);

	function goHome() {
		navigation.reset({ index: 0, routes: [{ name: 'TelaHome' }] });
	}

	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			goHome();
			return true;
		});
		return () => subscription.remove();
	});

	const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

	return (
		<View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
			<StatusBar barStyle="light-content" backgroundColor={GREEN} />
			<View style={styles.center} accessible accessibilityRole="summary" accessibilityLabel="Compra bem efetuada">
				<Animated.View style={[styles.circle, { opacity: pop, transform: [{ scale }] }]}>
					<Feather name="check" size={96} color={tc(GREEN)} />
				</Animated.View>
				<Text style={[styles.title, fontsLoaded && { fontFamily: 'Montserrat_700Bold' }]}>Compra bem efetuada!</Text>
			</View>
			<TouchableOpacity style={styles.button} onPress={goHome} activeOpacity={0.85} accessibilityRole="button">
				<Text style={[styles.buttonText, fontsLoaded && { fontFamily: 'LilitaOne_400Regular' }]}>Voltar ao Início</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	root: { flex: 1, backgroundColor: GREEN, paddingHorizontal: 20 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	circle: { width: 190, height: 190, borderRadius: 95, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
	title: { marginTop: 28, color: WHITE, fontSize: 22, fontWeight: '700', textAlign: 'center' },
	button: { minHeight: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
	buttonText: { color: GREEN, fontSize: 20 },
}));
