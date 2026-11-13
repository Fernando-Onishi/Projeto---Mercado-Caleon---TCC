import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import {
	ActivityIndicator,
	Alert,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { auth } from '../Config/FireBaseConfig';

const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', ink: '#183F35', muted: '#7A8581', red: '#FF383C' };

export default function AdminConfiguracoes({ navigation, userRole }) {
	const [signingOut, setSigningOut] = useState(false);

	function openCustomerView() {
		navigation.navigate('TelaHome');
	}

	function confirmSignOut() {
		if (signingOut) return;
		Alert.alert('Sair da conta', 'Deseja encerrar a sessão administrativa?', [
			{ text: 'Cancelar', style: 'cancel' },
			{
				text: 'Sair',
				style: 'destructive',
				onPress: async () => {
					setSigningOut(true);
					try {
						await signOut(auth);
						navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
					} catch (error) {
						console.error('Não foi possível encerrar a sessão administrativa.', error);
						Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
						setSigningOut(false);
					}
				},
			},
		]);
	}

	return (
		<SafeAreaScreen style={styles.safe} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<View style={styles.topbar}>
				<View style={styles.brandMark}><Feather name="user" size={30} color="#FFFFFF" /></View>
				<View style={styles.brandCopy}>
					<Text style={styles.kicker}>Painel Operacional</Text>
					<Text style={styles.greeting}>Olá, Administrador</Text>
				</View>
			</View>
			<View style={styles.screen}>
				<Text style={styles.title}>Configurações</Text>
				<View style={styles.accountRow}>
					<View style={styles.accountIcon}><Feather name="user" size={30} color={C.green} /></View>
					<View style={styles.accountCopy}>
						<Text style={styles.accountLabel}>Conta conectada</Text>
						<Text style={styles.email}>{auth.currentUser?.email || 'Sessão não identificada'}</Text>
					</View>
				</View>
				<TouchableOpacity style={styles.customerViewButton} onPress={openCustomerView} accessibilityRole="button">
					<Feather name="shopping-bag" size={30} color="#FFFFFF" />
					<Text style={styles.customerViewText}>Ver área do cliente</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.signOutButton} onPress={confirmSignOut} disabled={signingOut} accessibilityRole="button">
					{signingOut ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="log-out" size={30} color="#FFFFFF" />}
					<Text style={styles.signOutText}>{signingOut ? 'Saindo...' : 'Sair da conta'}</Text>
				</TouchableOpacity>
			</View>
			<NavegacaoAdmin navigation={navigation} activeTab="Configurações" showAdd={userRole === 'admin'} />
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.green },
	topbar: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.green },
	brandMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
	brandCopy: { flex: 1 },
	kicker: { fontSize: 9, color: '#7DE1C4', fontWeight: '800' },
	greeting: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginTop: 2 },
	screen: { flex: 1, padding: 16, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
	title: { color: C.ink, fontSize: 20, fontWeight: '900', marginBottom: 14 },
	accountRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DDE5E1' },
	accountIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E4F4EE', alignItems: 'center', justifyContent: 'center' },
	accountCopy: { flex: 1, minWidth: 0 },
	accountLabel: { color: C.ink, fontSize: 12, fontWeight: '800' },
	email: { color: C.muted, fontSize: 11, marginTop: 3 },
	customerViewButton: { minHeight: 52, marginTop: 14, paddingHorizontal: 14, borderRadius: 9, backgroundColor: C.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
	customerViewText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
	signOutButton: { minHeight: 52, marginTop: 14, paddingHorizontal: 14, borderRadius: 9, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
	signOutText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});