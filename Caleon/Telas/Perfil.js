import React, { useEffect, useState } from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut, updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from '../Config/FireBaseConfig';
import { getProfileStorageKey } from '../Config/PerfilStorage';
import BotaoSacola from '../Componentes/BotaoSacola';
import NavegacaoInferior from '../Componentes/NavegacaoInferior';

const COLORS = {
	darkGreen: '#1B4B3D',
	mint: '#40B190',
	background: '#F1F3F5',
	white: '#FFFFFF',
	black: '#000000',
	text: '#202020',
	muted: '#757575',
	save: '#00AA6A',
	cancel: '#FF0000',
};

const emptyFields = {
	name: '',
	email: '',
	cep: '',
	address: '',
	phone: '',
	password: '',
	photoUri: null,
};

const fields = [
	{ key: 'name', label: 'Nome:', placeholder: 'Digite seu nome', icon: 'user', keyboardType: 'default' },
	{ key: 'email', label: 'Email:', placeholder: 'exemplo@gmail.com', icon: 'mail', keyboardType: 'email-address' },
	{ key: 'cep', label: 'CEP:', placeholder: '00000-000', icon: 'map-pin', keyboardType: 'number-pad' },
	{ key: 'address', label: 'Endereço:', placeholder: 'Rua,Avenida,etc.', icon: 'map', keyboardType: 'default' },
	{ key: 'phone', label: 'Telefone:', placeholder: '(00)00000-0000', icon: 'phone', keyboardType: 'phone-pad' },
	{ key: 'password', label: 'Senha:', placeholder: 'Mínimo 6 caracteres', icon: 'lock', keyboardType: 'default' },
];

function formatCep(value) {
	const digits = value.replace(/\D/g, '').slice(0, 8);
	return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

function formatPhone(value) {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (digits.length <= 2) return digits ? `(${digits}` : '';
	const area = `(${digits.slice(0, 2)}) `;
	const number = digits.slice(2);
	if (digits.length === 11) return `${area}${number.slice(0, 5)}-${number.slice(5)}`;
	if (number.length <= 4) return `${area}${number}`;
	return `${area}${number.slice(0, 4)}-${number.slice(4)}`;
}

export default function Perfil({ navigation }) {
	const { width } = useWindowDimensions();
	const avatarSize = Math.min(250, width * 0.62);
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [profile, setProfile] = useState(emptyFields);
	const [savedProfile, setSavedProfile] = useState(emptyFields);
	const [isEditing, setIsEditing] = useState(false);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [logoutError, setLogoutError] = useState('');

	useEffect(() => {
		let active = true;
		async function loadProfile() {
			const user = auth.currentUser;
			let stored = {};
			try {
				stored = JSON.parse(await AsyncStorage.getItem(getProfileStorageKey(user?.uid)) || '{}');
			} catch {
				stored = {};
			}
			if (!active) return;
			const loadedProfile = {
				...emptyFields,
				...stored,
				name: user?.displayName || stored.name || '',
				email: user?.email || stored.email || '',
				password: '',
			};
			setProfile(loadedProfile);
			setSavedProfile(loadedProfile);
		}
		loadProfile();
		return () => { active = false; };
	}, []);

	if (!fontsLoaded) return null;

	function updateField(key, value) {
		const formattedValue = key === 'cep'
			? formatCep(value)
			: key === 'phone'
				? formatPhone(value)
				: value;
		setProfile((current) => ({ ...current, [key]: formattedValue }));
	}

	async function choosePhoto() {
		if (!isEditing) return;
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: true,
				aspect: [1, 1],
				shape: 'oval',
				quality: 0.9,
			});
			if (!result.canceled) updateField('photoUri', result.assets[0].uri);
		} catch {
			Alert.alert('Foto do perfil', 'Não foi possível abrir a galeria.');
		}
	}

	async function saveProfile() {
		if (isSaving) return;
		const email = profile.email.trim();
		const cepDigits = profile.cep.replace(/\D/g, '');
		const phoneDigits = profile.phone.replace(/\D/g, '');
		if (!profile.name.trim()) {
			Alert.alert('Perfil', 'Informe seu nome.');
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			Alert.alert('Perfil', 'Informe um email válido.');
			return;
		}
		if (cepDigits && cepDigits.length !== 8) {
			Alert.alert('Perfil', 'O CEP deve ter oito dígitos.');
			return;
		}
		if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
			Alert.alert('Perfil', 'Informe um telefone válido com DDD.');
			return;
		}
		if (profile.password && profile.password.length < 6) {
			Alert.alert('Perfil', 'A nova senha deve ter pelo menos seis caracteres.');
			return;
		}

		const user = auth.currentUser;
		setIsSaving(true);
		try {
			if (user && email && email !== user.email) await updateEmail(user, email);
			if (user) await updateProfile(user, { displayName: profile.name.trim() });
			if (user && profile.password) await updatePassword(user, profile.password);

			const saved = { ...profile, email, name: profile.name.trim(), password: '' };
			await AsyncStorage.setItem(getProfileStorageKey(user?.uid), JSON.stringify({
				name: saved.name,
				email: saved.email,
				cep: saved.cep,
				address: saved.address,
				phone: saved.phone,
				photoUri: saved.photoUri,
			}));
			setProfile(saved);
			setSavedProfile(saved);
			setIsEditing(false);
			setIsPasswordVisible(false);
			Alert.alert('Perfil', 'Alterações salvas com sucesso.');
		} catch (error) {
			const message = error?.code === 'auth/requires-recent-login'
				? 'Entre novamente na sua conta para atualizar o email ou a senha.'
				: 'Não foi possível salvar as alterações. Tente novamente.';
			Alert.alert('Perfil', message);
		} finally {
			setIsSaving(false);
		}
	}

	function cancelChanges() {
		setProfile({ ...savedProfile, password: '' });
		setIsEditing(false);
		setIsPasswordVisible(false);
	}

	function startEditing() {
		setProfile((current) => ({ ...current, password: '' }));
		setIsPasswordVisible(false);
		setIsEditing(true);
	}

	async function logout() {
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		setLogoutError('');
		try {
			await signOut(auth);
			navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
		} catch (error) {
			console.error('Não foi possível sair da conta.', error);
			setLogoutError('Não foi possível encerrar sua sessão. Tente novamente.');
		} finally {
			setIsLoggingOut(false);
		}
	}

	function confirmLogout() {
		setLogoutError('');
		setIsLogoutModalVisible(true);
	}

	function explainPasswordVisibility() {
		Alert.alert(
			'Senha protegida',
			'O Firebase não permite visualizar a senha atual. Para mantê-la, deixe o campo de senha em branco ao editar o perfil.',
		);
	}

	function goBack() {
		if (navigation?.canGoBack()) navigation.goBack();
		else navigation?.navigate('TelaHome');
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
			<StatusBar style="light" backgroundColor={COLORS.darkGreen} />
			<Modal
				visible={isLogoutModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setIsLogoutModalVisible(false)}
			>
				<View style={styles.logoutOverlay}>
					<View style={styles.logoutDialog}>
						<Text style={styles.logoutTitle}>Sair da conta</Text>
						<Text style={styles.logoutMessage}>Deseja realmente sair da sua conta?</Text>
						{logoutError ? <Text style={styles.logoutError}>{logoutError}</Text> : null}
						<View style={styles.logoutActions}>
							<TouchableOpacity
								style={[styles.logoutActionButton, styles.logoutCancelButton]}
								onPress={() => setIsLogoutModalVisible(false)}
								disabled={isLoggingOut}
								accessibilityRole="button"
							>
								<Text style={styles.logoutActionText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.logoutActionButton, styles.logoutConfirmButton, isLoggingOut && styles.disabledButton]}
								onPress={logout}
								disabled={isLoggingOut}
								accessibilityRole="button"
							>
								<Text style={styles.logoutActionText}>{isLoggingOut ? 'Saindo...' : 'Sair'}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
			<View style={styles.topBand} />
			<View style={styles.screenPanel}>
				<KeyboardAvoidingView
					style={styles.keyboardArea}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={styles.header}>
						<View style={styles.headerActions}>
							<TouchableOpacity style={styles.backButton} onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar">
								<Feather name="chevron-left" size={27} color={COLORS.white} />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.logoutButton}
								onPress={confirmLogout}
								accessibilityRole="button"
								accessibilityLabel="Sair da conta"
							>
								<Feather name="log-out" size={20} color={COLORS.white} />
							</TouchableOpacity>
							<BotaoSacola navigation={navigation} size={40} />
						</View>
						<Text style={styles.title}>Perfil</Text>
						{!isEditing ? (
							<TouchableOpacity
								style={styles.editProfileButton}
								onPress={startEditing}
								activeOpacity={0.8}
								accessibilityRole="button"
							>
								<Feather name="edit-2" size={14} color={COLORS.white} />
								<Text style={styles.editProfileButtonText}>Editar Perfil</Text>
							</TouchableOpacity>
						) : (
							<Text style={styles.subtitle}>Editando perfil</Text>
						)}
					</View>

					<ScrollView
						style={styles.content}
						contentContainerStyle={styles.contentContainer}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={[styles.avatarWrap, { width: avatarSize, height: avatarSize }]}>
							{profile.photoUri ? (
								<Image source={{ uri: profile.photoUri }} style={styles.avatarImage} />
							) : <View style={styles.avatarPlaceholder} />}
							{isEditing ? (
								<TouchableOpacity
									style={styles.editPhotoButton}
									onPress={choosePhoto}
									accessibilityRole="button"
									accessibilityLabel="Editar foto do perfil"
								>
									<Feather name="edit-2" size={21} color={COLORS.white} />
								</TouchableOpacity>
							) : null}
						</View>

						<View style={styles.form}>
							{fields.map((field) => {
								if (field.key === 'password' && !isEditing) {
									const hasPassword = auth.currentUser?.providerData.some(
										(provider) => provider.providerId === 'password',
									);
									return (
										<View key={field.key} style={styles.field}>
											<Text style={styles.label}>{field.label}</Text>
											<View style={styles.inputWrap}>
												<Feather name={field.icon} size={25} color={COLORS.muted} />
												<Text style={[styles.input, styles.readOnlyValue]}>
													{hasPassword ? '••••••••' : 'Não configurada'}
												</Text>
												<TouchableOpacity
													style={styles.passwordVisibilityButton}
													onPress={explainPasswordVisibility}
													accessibilityRole="button"
													accessibilityLabel="Informações sobre a senha protegida"
												>
													<Feather name="eye-off" size={20} color={COLORS.muted} />
												</TouchableOpacity>
											</View>
										</View>
									);
								}

								return (
									<View key={field.key} style={styles.field}>
										<Text style={styles.label}>{field.label}</Text>
										{isEditing ? (
											<View style={styles.inputWrap}>
												<Feather name={field.icon} size={25} color={COLORS.muted} />
												<TextInput
													style={styles.input}
													underlineColorAndroid="transparent"
													value={profile[field.key]}
													onChangeText={(value) => updateField(field.key, value)}
													placeholder={field.key === 'password' ? 'Deixe em branco para manter' : field.placeholder}
													placeholderTextColor="#888888"
													keyboardType={field.keyboardType}
													autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
													secureTextEntry={field.key === 'password' && !isPasswordVisible}
													textContentType={field.key === 'password' ? 'newPassword' : 'none'}
													accessibilityLabel={field.key === 'password' ? 'Nova senha' : field.label.replace(':', '')}
												/>
												{field.key === 'password' ? (
													<TouchableOpacity
														style={styles.passwordVisibilityButton}
														onPress={() => setIsPasswordVisible((visible) => !visible)}
														accessibilityRole="button"
														accessibilityLabel={isPasswordVisible ? 'Ocultar nova senha' : 'Visualizar nova senha'}
													>
														<Feather
															name={isPasswordVisible ? 'eye' : 'eye-off'}
															size={20}
															color={COLORS.muted}
														/>
													</TouchableOpacity>
												) : null}
											</View>
										) : (
											<View style={styles.inputWrap}>
												<Feather name={field.icon} size={25} color={COLORS.muted} />
												<Text style={[styles.input, styles.readOnlyValue]}>
													{profile[field.key] || 'Não informado'}
												</Text>
											</View>
										)}
									</View>
								);
							})}
						</View>

						{isEditing ? (
							<View style={styles.buttonRow}>
								<TouchableOpacity
									style={[styles.actionButton, styles.saveButton, isSaving && styles.disabledButton]}
									onPress={saveProfile}
									disabled={isSaving}
									accessibilityRole="button"
								>
									<Text style={styles.actionText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.actionButton, styles.cancelButton]}
									onPress={cancelChanges}
									disabled={isSaving}
									accessibilityRole="button"
								>
									<Text style={styles.actionText}>Cancelar</Text>
								</TouchableOpacity>
							</View>
						) : null}
					</ScrollView>
				</KeyboardAvoidingView>
				<NavegacaoInferior activeTab="Perfil" navigation={navigation} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: COLORS.darkGreen },
	topBand: { height: 40, backgroundColor: COLORS.darkGreen },
	screenPanel: {
		flex: 1,
		marginTop: -1,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		backgroundColor: COLORS.background,
		overflow: 'hidden',
	},
	keyboardArea: { flex: 1 },
	header: { height: 148, alignItems: 'center', paddingTop: 15 },
	logoutOverlay: {
		flex: 1,
		padding: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	logoutDialog: {
		width: '100%',
		maxWidth: 380,
		padding: 22,
		borderRadius: 18,
		backgroundColor: COLORS.white,
	},
	logoutTitle: {
		color: COLORS.text,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 18,
	},
	logoutMessage: {
		marginTop: 10,
		color: COLORS.text,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 14,
	},
	logoutError: {
		marginTop: 10,
		color: COLORS.cancel,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 13,
	},
	logoutActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 20,
	},
	logoutActionButton: {
		minWidth: 88,
		minHeight: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutCancelButton: { backgroundColor: COLORS.muted },
	logoutConfirmButton: { backgroundColor: COLORS.cancel },
	logoutActionText: {
		color: COLORS.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 13,
	},
	headerActions: {
		width: '100%',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: COLORS.cancel,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 'auto',
		marginRight: 12,
	},
	title: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 30, marginTop: 5 },
	subtitle: { color: '#226842', fontFamily: 'LilitaOne_400Regular', fontSize: 15, marginTop: 3 },
	editProfileButton: {
		minHeight: 32,
		paddingHorizontal: 14,
		marginTop: 4,
		borderRadius: 16,
		backgroundColor: COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 7,
	},
	editProfileButtonText: {
		color: COLORS.white,
		fontFamily: 'Montserrat_700Bold',
		fontSize: 12,
	},
	content: { flex: 1 },
	contentContainer: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 },
	avatarWrap: {
		alignSelf: 'center',
		marginBottom: 17,
		position: 'relative',
		borderRadius: 999,
		backgroundColor: COLORS.darkGreen,
	},
	avatarPlaceholder: { flex: 1, borderRadius: 999, backgroundColor: COLORS.darkGreen },
	avatarImage: { width: '100%', height: '100%', borderRadius: 999 },
	editPhotoButton: {
		position: 'absolute',
		right: -4,
		bottom: 4,
		width: 49,
		height: 49,
		borderRadius: 25,
		borderWidth: 4,
		borderColor: COLORS.white,
		backgroundColor: COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	form: { width: '100%' },
	field: { marginBottom: 12 },
	label: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 20, marginBottom: 4 },
	inputWrap: {
		minHeight: 50,
		borderRadius: 17,
		paddingHorizontal: 17,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.white,
	},
	input: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 10,
		paddingLeft: 13,
		color: COLORS.text,
		fontFamily: 'Montserrat_400Regular',
		fontSize: 14,
		borderWidth: 0,
		...Platform.select({ web: { outlineStyle: 'none' } }),
	},
	readOnlyValue: { color: COLORS.text },
	passwordVisibilityButton: {
		width: 32,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonRow: { flexDirection: 'row', gap: 14, marginTop: 7, marginBottom: 12 },
	actionButton: {
		flex: 1,
		minHeight: 38,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveButton: { backgroundColor: COLORS.save },
	cancelButton: { backgroundColor: COLORS.cancel },
	disabledButton: { opacity: 0.6 },
	actionText: { color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});