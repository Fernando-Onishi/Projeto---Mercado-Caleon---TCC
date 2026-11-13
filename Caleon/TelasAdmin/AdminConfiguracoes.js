import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import {
	ActivityIndicator,
	Modal,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { auth } from '../Config/FireBaseConfig';
import { ADMIN_THEME } from '../Config/AdminTheme';

const C = ADMIN_THEME.colors;

export default function AdminConfiguracoes({ navigation, userRole }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [signingOut, setSigningOut] = useState(false);
	const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
	const [signOutError, setSignOutError] = useState('');

	function openCustomerView() {
		navigation.navigate('TelaHome');
	}
	if (!fontsLoaded) return null;

	function confirmSignOut() {
		if (signingOut) return;
		setSignOutError('');
		setIsSignOutModalVisible(true);
	}

	async function signOutAdmin() {
		if (signingOut) return;
		setSigningOut(true);
		setSignOutError('');
		try {
			await signOut(auth);
			setIsSignOutModalVisible(false);
			navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
		} catch (error) {
			console.error('Não foi possível encerrar a sessão administrativa.', error);
			setSignOutError('Não foi possível encerrar sua sessão. Tente novamente.');
		} finally {
			setSigningOut(false);
		}
	}

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<Modal
				visible={isSignOutModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsSignOutModalVisible(false)}
			>
				<View style={styles.signOutOverlay}>
					<View style={styles.signOutDialog}>
						<Text style={styles.signOutTitle}>Sair da conta</Text>
						<Text style={styles.signOutMessage}>Deseja encerrar a sessão administrativa?</Text>
						{signOutError ? <Text style={styles.signOutError}>{signOutError}</Text> : null}
						<View style={styles.signOutActions}>
							<TouchableOpacity
								style={[styles.signOutActionButton, styles.cancelButton]}
								onPress={() => setIsSignOutModalVisible(false)}
								disabled={signingOut}
								accessibilityRole="button"
							>
								<Text style={styles.signOutActionText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.signOutActionButton, styles.confirmButton]}
								onPress={signOutAdmin}
								disabled={signingOut}
								accessibilityRole="button"
							>
								{signingOut ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
								<Text style={styles.signOutActionText}>{signingOut ? 'Saindo...' : 'Sair'}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
			<AdminScreenLayout
				headerHeight={72}
				headerContent={<View style={styles.topbar}>
				<View style={styles.brandMark}><Feather name="user" size={22} color={C.white} /></View>
				<View style={styles.brandCopy}>
					<Text style={styles.kicker}>Painel Operacional</Text>
					<Text style={styles.greeting}>Olá, Administrador</Text>
				</View>
			</View>}
				footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Configurações" showAdd={userRole === 'admin'} />}
			>
			<View style={styles.screen}>
				<Text style={styles.title}>Configurações</Text>
				<View style={styles.accountRow}>
					<View style={styles.accountIcon}><Feather name="user" size={22} color={C.green} /></View>
					<View style={styles.accountCopy}>
						<Text style={styles.accountLabel}>Conta conectada</Text>
						<Text style={styles.email}>{auth.currentUser?.email || 'Sessão não identificada'}</Text>
					</View>
				</View>
				<TouchableOpacity
					style={styles.customerViewButton}
					onPress={openCustomerView}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel="Ver área do cliente"
				>
					<Feather name="shopping-bag" size={22} color={C.white} />
					<Text style={styles.customerViewText}>Ver área do cliente</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.signOutButton} onPress={confirmSignOut} disabled={signingOut} accessibilityRole="button">
					{signingOut ? <ActivityIndicator size="small" color={C.white} /> : <Feather name="log-out" size={22} color={C.white} />}
					<Text style={styles.signOutText}>{signingOut ? 'Saindo...' : 'Sair da conta'}</Text>
				</TouchableOpacity>
			</View>
			</AdminScreenLayout>
		</>
	);
}

const styles = StyleSheet.create({
	topbar: { minHeight: 72, paddingHorizontal: ADMIN_THEME.layout.contentPadding, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ADMIN_THEME.colors.adminHeaderBg },
	brandMark: { width: ADMIN_THEME.layout.headerActionSize, height: ADMIN_THEME.layout.headerActionSize, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
	brandCopy: { flex: 1 },
	kicker: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10, color: '#A8E8D1' },
	greeting: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 17, marginTop: 2 },
	screen: { flex: 1, paddingTop: ADMIN_THEME.layout.contentTopSpacing },
	title: { color: C.ink, fontFamily: ADMIN_THEME.fonts.display, fontSize: 30, marginBottom: ADMIN_THEME.layout.titleCardSpacing },
	accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.white, borderRadius: ADMIN_THEME.layout.cardRadius, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DDE5E1' },
	accountIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E4F4EE', alignItems: 'center', justifyContent: 'center' },
	accountCopy: { flex: 1, minWidth: 0 },
	accountLabel: { color: C.ink, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	email: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 12, marginTop: 4 },
	customerViewButton: { minHeight: 52, marginTop: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
	customerViewText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	signOutButton: { minHeight: 52, marginTop: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
	signOutText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	signOutOverlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
	signOutDialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 18, backgroundColor: '#FFFFFF' },
	signOutTitle: { color: C.ink, fontFamily: ADMIN_THEME.fonts.display, fontSize: 22 },
	signOutMessage: { marginTop: 10, color: C.ink, fontFamily: ADMIN_THEME.fonts.body, fontSize: 14 },
	signOutError: { marginTop: 10, color: C.red, fontFamily: ADMIN_THEME.fonts.body, fontSize: 13 },
	signOutActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
	signOutActionButton: { minWidth: 88, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
	cancelButton: { backgroundColor: C.muted },
	confirmButton: { backgroundColor: C.red },
	signOutActionText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 13 },
});