import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
	ActivityIndicator,
	Alert,
	Image,
	Modal,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import { TEST_NOTIFICATIONS } from './adminNotifications';
import { auth } from '../Config/FireBaseConfig';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { getProfileStorageKey } from '../Config/PerfilStorage';

const C = ADMIN_THEME.colors;
const F = ADMIN_THEME.fonts;
const ACCENT_YELLOW = '#FFC928';
const MINT_SOFT = '#A8E8D1';
const MINT_TINT = '#D8F6E9';

const ROLE_INFO = {
	admin: { badge: 'Administrador', greeting: 'Olá, Administrador', session: 'Encerrar a sessão do administrador' },
	employee: { badge: 'Funcionário', greeting: 'Olá, Equipe', session: 'Encerrar a sessão do funcionário' },
};

function ActionCard({ icon, title, subtitle, color, onPress, disabled, loading, accessibilityLabel }) {
	return (
		<TouchableOpacity
			style={[styles.actionCard, { backgroundColor: color, shadowColor: color }]}
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || title}
		>
			<View style={styles.actionIcon}>
				{loading ? <ActivityIndicator size="small" color={C.white} /> : <Feather name={icon} size={22} color={C.white} />}
			</View>
			<View style={styles.actionCopy}>
				<Text style={styles.actionTitle}>{title}</Text>
				<Text style={styles.actionSubtitle} numberOfLines={1}>{subtitle}</Text>
			</View>
			<Feather name="chevron-right" size={22} color={C.white} />
		</TouchableOpacity>
	);
}

export default function AdminConfiguracoes({ navigation, userRole }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [signingOut, setSigningOut] = useState(false);
	const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
	const [signOutError, setSignOutError] = useState('');
	const [notificationsVisible, setNotificationsVisible] = useState(false);
	const [photoUri, setPhotoUri] = useState(null);

	const role = ROLE_INFO[userRole] || ROLE_INFO.admin;
	const uid = auth.currentUser?.uid;
	const email = auth.currentUser?.email || 'Sessão não identificada';

	// A foto fica no mesmo perfil salvo no aparelho que a tela de Perfil do cliente usa.
	useEffect(() => {
		let active = true;
		AsyncStorage.getItem(getProfileStorageKey(uid))
			.then((stored) => {
				if (active && stored) setPhotoUri(JSON.parse(stored).photoUri || null);
			})
			.catch((error) => console.error('Não foi possível carregar a foto do perfil.', error));
		return () => { active = false; };
	}, [uid]);

	if (!fontsLoaded) return null;

	async function changePhoto() {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: true,
				aspect: [1, 1],
				shape: 'oval',
				quality: 0.9,
			});
			if (result.canceled) return;
			const nextPhotoUri = result.assets[0].uri;
			const storageKey = getProfileStorageKey(uid);
			const stored = await AsyncStorage.getItem(storageKey);
			const profile = stored ? JSON.parse(stored) : {};
			await AsyncStorage.setItem(storageKey, JSON.stringify({ ...profile, photoUri: nextPhotoUri }));
			setPhotoUri(nextPhotoUri);
		} catch (error) {
			console.error('Não foi possível alterar a foto do perfil.', error);
			Alert.alert('Foto do perfil', 'Não foi possível alterar a foto. Tente novamente.');
		}
	}

	function openCustomerView() {
		navigation.navigate('TelaHome');
	}

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
			<AdminNotificationsModal
				visible={notificationsVisible}
				onClose={() => setNotificationsVisible(false)}
				navigation={navigation}
			/>
			<Modal
				visible={isSignOutModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsSignOutModalVisible(false)}
			>
				<View style={styles.signOutOverlay}>
					<View style={styles.signOutDialog}>
						<View style={styles.signOutDialogIcon}>
							<Feather name="log-out" size={24} color={C.red} />
						</View>
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
								<Text style={[styles.signOutActionText, styles.cancelButtonText]}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.signOutActionButton, styles.confirmButton]}
								onPress={signOutAdmin}
								disabled={signingOut}
								accessibilityRole="button"
							>
								{signingOut ? <ActivityIndicator size="small" color={C.white} /> : null}
								<Text style={styles.signOutActionText}>{signingOut ? 'Saindo...' : 'Sair'}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
			<AdminScreenLayout
				headerHeight={72}
				headerContent={(
					<View style={styles.topbar}>
						<View style={styles.brandMark}><Feather name="user" size={22} color={C.white} /></View>
						<View style={styles.brandCopy}>
							<Text style={styles.kicker}>Painel Operacional</Text>
							<Text style={styles.greeting}>{role.greeting}</Text>
						</View>
						<View style={styles.notificationButtonWrap}>
							<CircularIconButton
								size={ADMIN_THEME.layout.headerActionSize}
								borderRadius={12}
								icon={<Feather name="bell" size={22} color={C.white} />}
								onPress={() => setNotificationsVisible(true)}
								accessibilityLabel={`Abrir notificações, ${TEST_NOTIFICATIONS.length} disponíveis`}
							/>
							{TEST_NOTIFICATIONS.length > 0 ? (
								<View style={styles.notificationBadge}>
									<Text style={styles.notificationBadgeText}>{TEST_NOTIFICATIONS.length > 99 ? '99+' : TEST_NOTIFICATIONS.length}</Text>
								</View>
							) : null}
						</View>
					</View>
				)}
				footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Configurações" showAdd={userRole === 'admin'} />}
			>
				<ScrollView
					style={styles.screen}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text style={styles.title}>Configurações</Text>

					<View style={styles.accountCard}>
						<View style={styles.accountTop}>
							<TouchableOpacity
								style={styles.avatar}
								onPress={changePhoto}
								activeOpacity={0.85}
								accessibilityRole="button"
								accessibilityLabel="Alterar foto do perfil"
							>
								{photoUri ? (
									<Image source={{ uri: photoUri }} style={styles.avatarImage} />
								) : (
									<Feather name="user" size={30} color={C.green} />
								)}
								<View style={styles.onlineDot} />
								<View style={styles.editPhotoBadge}>
									<Feather name="edit-2" size={12} color={C.white} />
								</View>
							</TouchableOpacity>
							<View style={styles.accountCopy}>
								<View style={styles.roleBadge}>
									<Feather name="shield" size={11} color={C.ink} />
									<Text style={styles.roleBadgeText}>{role.badge}</Text>
								</View>
								<Text style={styles.accountLabel}>Conta conectada</Text>
							</View>
						</View>
						<View style={styles.accountDivider} />
						<View style={styles.emailRow}>
							<View style={styles.emailIcon}><Feather name="mail" size={18} color={C.white} /></View>
							<View style={styles.accountCopy}>
								<Text style={styles.emailLabel}>E-mail da conta</Text>
								<Text style={styles.email} numberOfLines={1}>{email}</Text>
							</View>
						</View>
					</View>

					<Text style={styles.sectionLabel}>Acesso rápido</Text>
					<ActionCard
						icon="shopping-bag"
						title="Ver área do cliente"
						subtitle="Visualizar o aplicativo como cliente"
						color={C.mint}
						onPress={openCustomerView}
					/>

					<Text style={styles.sectionLabel}>Sessão</Text>
					<ActionCard
						icon="log-out"
						title={signingOut ? 'Saindo...' : 'Sair da conta'}
						subtitle={role.session}
						color={C.red}
						onPress={confirmSignOut}
						disabled={signingOut}
						loading={signingOut}
						accessibilityLabel="Sair da conta"
					/>

					<View style={styles.footer}>
						<View style={styles.footerDivider} />
						<Text style={styles.footerText}>Caleon · Painel Operacional</Text>
					</View>
				</ScrollView>
			</AdminScreenLayout>
		</>
	);
}

const styles = StyleSheet.create({
	topbar: { minHeight: 72, paddingHorizontal: ADMIN_THEME.layout.contentPadding, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.adminHeaderBg },
	brandMark: { width: ADMIN_THEME.layout.headerActionSize, height: ADMIN_THEME.layout.headerActionSize, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
	brandCopy: { flex: 1 },
	kicker: { fontFamily: F.bold, fontSize: 10, color: MINT_SOFT },
	greeting: { color: C.white, fontFamily: F.bold, fontSize: 17, marginTop: 2 },
	notificationButtonWrap: { position: 'relative' },
	notificationBadge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: C.adminHeaderBg, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
	notificationBadgeText: { color: C.white, fontFamily: F.bold, fontSize: 9, lineHeight: 12, textAlign: 'center' },

	screen: { flex: 1 },
	scrollContent: { paddingTop: 24, paddingBottom: 24 },

	title: { color: '#111715', fontFamily: F.display, fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: 4, marginBottom: 24 },

	accountCard: {
		padding: 18,
		borderRadius: 22,
		backgroundColor: C.green,
		shadowColor: '#102E2B',
		shadowOpacity: 0.18,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 5,
	},
	accountTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: MINT_TINT, borderWidth: 3, borderColor: MINT_SOFT, alignItems: 'center', justifyContent: 'center' },
	avatarImage: { width: '100%', height: '100%', borderRadius: 29 },
	onlineDot: { position: 'absolute', right: 0, top: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: C.success, borderWidth: 3, borderColor: C.green },
	editPhotoBadge: { position: 'absolute', right: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: C.mint, borderWidth: 3, borderColor: C.green, alignItems: 'center', justifyContent: 'center' },
	accountCopy: { flex: 1, minWidth: 0 },
	roleBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: ACCENT_YELLOW },
	roleBadgeText: { color: C.ink, fontFamily: F.bold, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
	accountLabel: { color: C.white, fontFamily: F.bold, fontSize: 18, marginTop: 8 },
	accountDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.22)', marginVertical: 16 },
	emailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	emailIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center' },
	emailLabel: { color: MINT_SOFT, fontFamily: F.medium, fontSize: 11 },
	email: { color: C.white, fontFamily: F.bold, fontSize: 14, marginTop: 2 },

	sectionLabel: { color: C.muted, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 24, marginBottom: 10, paddingHorizontal: 3 },

	actionCard: {
		minHeight: 70,
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 18,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		shadowOpacity: 0.25,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	actionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.18)', alignItems: 'center', justifyContent: 'center' },
	actionCopy: { flex: 1, minWidth: 0 },
	actionTitle: { color: C.white, fontFamily: F.bold, fontSize: 16 },
	actionSubtitle: { color: 'rgba(255, 255, 255, 0.85)', fontFamily: F.body, fontSize: 12, marginTop: 2 },

	footer: { alignItems: 'center', marginTop: 36 },
	footerDivider: { width: '45%', height: StyleSheet.hairlineWidth, backgroundColor: '#D6DEDA', marginBottom: 16 },
	footerText: { color: C.muted, fontFamily: F.bold, fontSize: 11 },

	signOutOverlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
	signOutDialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 22, backgroundColor: C.white },
	signOutDialogIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
	signOutTitle: { color: C.ink, fontFamily: F.display, fontSize: 24 },
	signOutMessage: { marginTop: 6, color: C.muted, fontFamily: F.body, fontSize: 14 },
	signOutError: { marginTop: 10, color: C.red, fontFamily: F.body, fontSize: 13 },
	signOutActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
	signOutActionButton: { minWidth: 96, minHeight: 44, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
	cancelButton: { backgroundColor: C.background, borderWidth: 1, borderColor: '#DDE5E1' },
	cancelButtonText: { color: C.ink },
	confirmButton: { backgroundColor: C.red },
	signOutActionText: { color: C.white, fontFamily: F.bold, fontSize: 13 },
});
