import React, { useEffect, useState } from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
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
import { updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from '../Config/FireBaseConfig';
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

function storageKey(uid) {
	return `caleon-profile-${uid || 'anonymous'}`;
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

	useEffect(() => {
		let active = true;
		async function loadProfile() {
			const user = auth.currentUser;
			let stored = {};
			try {
				stored = JSON.parse(await AsyncStorage.getItem(storageKey(user?.uid)) || '{}');
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
		try {
			if (user && email && email !== user.email) await updateEmail(user, email);
			if (user) await updateProfile(user, { displayName: profile.name.trim() });
			if (user && profile.password) await updatePassword(user, profile.password);

			const saved = { ...profile, email, name: profile.name.trim(), password: '' };
			await AsyncStorage.setItem(storageKey(user?.uid), JSON.stringify({
				name: saved.name,
				email: saved.email,
				cep: saved.cep,
				address: saved.address,
				phone: saved.phone,
				photoUri: saved.photoUri,
			}));
			setProfile(saved);
			setSavedProfile(saved);
			Alert.alert('Perfil', 'Alterações salvas com sucesso.');
		} catch (error) {
			const message = error?.code === 'auth/requires-recent-login'
				? 'Entre novamente na sua conta para atualizar o email ou a senha.'
				: 'Não foi possível salvar as alterações. Tente novamente.';
			Alert.alert('Perfil', message);
		}
	}

	function cancelChanges() {
		setProfile({ ...savedProfile, password: '' });
	}

	function goBack() {
		if (navigation?.canGoBack()) navigation.goBack();
		else navigation?.navigate('TelaHome');
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
			<StatusBar style="light" backgroundColor={COLORS.darkGreen} />
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
								style={styles.bagButton}
								onPress={() => navigation?.navigate('TelaSacola')}
								accessibilityRole="button"
								accessibilityLabel="Abrir sacola"
							>
								<Feather name="shopping-bag" size={22} color={COLORS.white} />
								<View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
							</TouchableOpacity>
						</View>
						<Text style={styles.title}>Perfil</Text>
						<Text style={styles.subtitle}>Editar</Text>
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
							<TouchableOpacity
								style={styles.editPhotoButton}
								onPress={choosePhoto}
								accessibilityRole="button"
								accessibilityLabel="Editar foto do perfil"
							>
								<Feather name="edit-2" size={21} color={COLORS.white} />
							</TouchableOpacity>
						</View>

						<View style={styles.form}>
							{fields.map((field) => (
								<View key={field.key} style={styles.field}>
									<Text style={styles.label}>{field.label}</Text>
									<View style={styles.inputWrap}>
										<Feather name={field.icon} size={23} color={COLORS.muted} />
										<TextInput
											style={styles.input}
											value={profile[field.key]}
											onChangeText={(value) => updateField(field.key, value)}
											placeholder={field.placeholder}
											placeholderTextColor="#888888"
											keyboardType={field.keyboardType}
											autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
											secureTextEntry={field.key === 'password'}
											textContentType={field.key === 'password' ? 'newPassword' : 'none'}
											accessibilityLabel={field.label.replace(':', '')}
										/>
									</View>
								</View>
							))}
						</View>

						<View style={styles.buttonRow}>
							<TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={saveProfile} accessibilityRole="button">
								<Text style={styles.actionText}>Salvar</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={cancelChanges} accessibilityRole="button">
								<Text style={styles.actionText}>Cancelar</Text>
							</TouchableOpacity>
						</View>
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
	header: { height: 131, alignItems: 'center', paddingTop: 15 },
	headerActions: {
		width: '100%',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bagButton: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		top: -4,
		right: -5,
		minWidth: 17,
		height: 17,
		paddingHorizontal: 3,
		borderRadius: 9,
		backgroundColor: COLORS.cancel,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 10, lineHeight: 13 },
	title: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 30, marginTop: 5 },
	subtitle: { color: '#226842', fontFamily: 'LilitaOne_400Regular', fontSize: 22, marginTop: -2 },
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
	field: { marginBottom: 9 },
	label: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 23, marginBottom: 3 },
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
	actionText: { color: COLORS.white, fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});