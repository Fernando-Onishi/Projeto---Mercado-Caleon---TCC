import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
	ActivityIndicator,
	Alert,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { auth } from '../Config/FireBaseConfig';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';

const COLORS = { green: '#1B4B3D', mint: '#40B190' };

export default function EmployeeHome({ navigation }) {
	const [isSigningOut, setIsSigningOut] = useState(false);

	async function handleSignOut() {
		if (isSigningOut) return;
		setIsSigningOut(true);
		try {
			await signOut(auth);
			navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
		} catch (error) {
			console.error('Não foi possível sair da conta da equipe.', error);
			Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
		} finally {
			setIsSigningOut(false);
		}
	}

	return (
		<SafeAreaScreen style={styles.safe}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.green} />
			<View style={styles.header}>
				<Text style={styles.title}>Painel da equipe</Text>
				<Text style={styles.email}>{auth.currentUser?.email || ''}</Text>
			</View>
			<View style={styles.content}>
				<Feather name="users" size={42} color={COLORS.mint} />
				<Text style={styles.message}>Bem-vindo ao Caleon</Text>
				<View style={styles.logoutAction}>
					<CircularIconButton
						icon={isSigningOut
							? <ActivityIndicator color="#FFFFFF" />
							: <Ionicons name="exit-outline" size={24} color="#FFFFFF" />}
						onPress={handleSignOut}
						disabled={isSigningOut}
						accessibilityLabel="Sair da conta"
					/>
					<Text style={styles.logoutText}>{isSigningOut ? 'Saindo...' : 'Sair da conta'}</Text>
				</View>
			</View>
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#F1F3F5' },
	header: {
		paddingHorizontal: 20,
		paddingVertical: 24,
		backgroundColor: COLORS.green,
	},
	title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
	email: { marginTop: 6, color: '#C5DED6', fontSize: 13 },
	content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
	message: { color: '#183F35', fontSize: 18, fontWeight: '700' },
	logoutAction: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	logoutText: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
});
