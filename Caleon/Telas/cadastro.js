import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Fontisto from '@expo/vector-icons/Fontisto';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useWindowDimensions } from 'react-native';
import { auth } from '../Config/FireBaseConfig';
import {
	Alert,
	Image,
	ImageBackground,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

function FormField({ fontAwesomeIcon, fontistoIcon, placeholder, value, onChangeText, ...inputProps }) {
	return (
		<View style={styles.inputContainer}>
			{fontAwesomeIcon ? (
				<FontAwesome name={fontAwesomeIcon} size={18} color="" style={styles.iconGlyph} accessibilityElementsHidden />
			) : fontistoIcon === 'locked' ? (
					<EvilIcons name="lock" size={26} color="" style={styles.iconGlyph} accessibilityElementsHidden />
			) : (
				<Fontisto name={fontistoIcon} size={18} color="" style={styles.iconGlyph} accessibilityElementsHidden />
			)}
			<TextInput
				style={styles.input}
				placeholder={placeholder}
				placeholderTextColor="#858b89"
				value={value}
				onChangeText={onChangeText}
				{...inputProps}
			/>
		</View>
	);
}

export default function TelaCadastro({ navigation }) {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const panelHorizontalPadding = screenWidth < 380 ? 20 : screenWidth >= 900 ? 32 : 24;
	const contentMaxWidth = Math.min(screenWidth - panelHorizontalPadding * 2, 560);
	const logoSize = Math.min(280, screenWidth * 0.68, screenHeight * 0.36);
	const brandMinHeight = Math.max(180, Math.min(250, screenHeight * 0.3));
	const [fontsLoaded] = useFonts({
		LuckiestGuy: require('@expo-google-fonts/luckiest-guy/400Regular/LuckiestGuy_400Regular.ttf'),
		MontserratRegular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		MontserratMedium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		MontserratSemiBold: require('@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf'),
		MontserratBold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!fontsLoaded) return null;

	async function handleRegister() {
		if (!name.trim()) {
			Alert.alert('Cadastro', 'Informe seu nome para continuar.');
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			Alert.alert('Cadastro', 'Informe um e-mail válido.');
			return;
		}

		if (password.length < 6) {
			Alert.alert('Cadastro', 'A senha deve ter pelo menos 6 caracteres.');
			return;
		}

		setIsSubmitting(true);
		try {
			const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
			let profileUpdateFailed = false;
			try {
				await updateProfile(credential.user, { displayName: name.trim() });
			} catch {
				profileUpdateFailed = true;
			}
			navigation.replace('TelaHome');
			if (profileUpdateFailed) {
				Alert.alert('Cadastro concluído', 'Sua conta foi criada, mas não foi possível salvar o nome no perfil.');
			}
		} catch (error) {
			const messages = {
				'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
				'auth/invalid-email': 'Informe um e-mail válido.',
				'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
				'auth/operation-not-allowed': 'O cadastro por e-mail ainda não está habilitado.',
				'auth/network-request-failed': 'Sem conexão com a internet. Tente novamente.',
			};
			Alert.alert('Cadastro', messages[error.code] || 'Não foi possível criar sua conta. Tente novamente.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<ImageBackground
			source={require('../assets/fundo.png')}
			resizeMode="cover"
			style={styles.background}
			imageStyle={styles.backgroundImage}
		>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.keyboardArea}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={[styles.brandArea, { minHeight: brandMinHeight }]}>
							<TouchableOpacity
								style={styles.helpButton}
								activeOpacity={0.8}
								onPress={() => Alert.alert('Ajuda', 'Preencha seus dados para criar uma conta.')}
								accessibilityRole="button"
								accessibilityLabel="Ajuda sobre o cadastro"
							>
								<Fontisto name="question" size={16} color="black" accessibilityElementsHidden />
							</TouchableOpacity>
							<Image
								source={require('../assets/logo.png')}
								style={[styles.logo, { width: logoSize, height: logoSize }]}
								resizeMode="contain"
							/>
						</View>

						<View style={[styles.formPanel, { paddingHorizontal: panelHorizontalPadding }]}>
							<Text style={styles.title}>CADASTRE-SE</Text>

							<View style={[styles.fields, { maxWidth: contentMaxWidth }]}>
								<FormField
									fontAwesomeIcon="user-o"
									placeholder="Nome"
									value={name}
									onChangeText={setName}
									autoCapitalize="words"
									autoComplete="name"
									accessibilityLabel="Nome"
								/>
								<FormField
									fontistoIcon="email"
									placeholder="E-mail"
									value={email}
									onChangeText={setEmail}
									keyboardType="email-address"
									autoCapitalize="none"
									autoComplete="email"
									accessibilityLabel="E-mail"
								/>
								<FormField
									fontistoIcon="locked"
									placeholder="Senha"
									value={password}
									onChangeText={setPassword}
									secureTextEntry
									autoComplete="new-password"
									accessibilityLabel="Senha"
								/>
							</View>

							<TouchableOpacity
								style={[styles.submitButton, { maxWidth: contentMaxWidth }]}
								activeOpacity={0.85}
								onPress={handleRegister}
								disabled={isSubmitting}
								accessibilityRole="button"
							>
								<Text style={styles.submitText}>{isSubmitting ? 'Cadastrando...' : 'Cadastrar'}</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.backButton}
								activeOpacity={0.7}
								onPress={() => navigation.goBack()}
								accessibilityRole="button"
							>
								<Text style={styles.backText}>Voltar</Text>
							</TouchableOpacity>

							<View style={styles.termsContainer}>
								<Text style={[styles.termsText, { maxWidth: contentMaxWidth }]}>
									Ao continuar, você concorda com os Termos de Uso e está ciente da Declaração de Privacidade.
								</Text>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	background: {
		flex: 1,
		width: '100%',
	},
	backgroundImage: {
		width: '100%',
		height: '100%',
	},
	safeArea: {
		flex: 1,
	},
	keyboardArea: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		minHeight: 530,
	},
	brandArea: {
		flex: 1,
		minHeight: 180,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 14,
	},
	logo: {
		maxWidth: '72%',
	},
	helpButton: {
		position: 'absolute',
		top: 12,
		right: 16,
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	formPanel: {
		flex: 1,
		minHeight: 380,
		paddingTop: 24,
		paddingBottom: 20,
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
	},
	title: {
		color: '#101412',
		fontFamily: 'LuckiestGuy',
		fontSize: 26,
		marginBottom: 22,
	},
	fields: {
		width: '100%',
		maxWidth: 560,
		gap: 12,
	},
	inputContainer: {
		height: 48,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 13,
		borderRadius: 11,
		backgroundColor: '#f2f3f3',
		elevation: 2,
	},
	iconGlyph: {
		width: 24,
		textAlign: 'center',
		marginRight: 6,
	},
	input: {
		flex: 1,
		paddingVertical: 8,
		color: '#202623',
		fontFamily: 'MontserratRegular',
		fontSize: 14,
	},
	submitButton: {
		width: '100%',
		maxWidth: 560,
		height: 48,
		marginTop: 24,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1B4B3D',
		elevation: 3,
	},
	submitText: {
		color: '#ffffff',
		fontFamily: 'MontserratBold',
		fontSize: 14,
	},
	backButton: {
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	backText: {
		color: '#1B4B3D',
		fontFamily: 'MontserratMedium',
		fontSize: 13,
	},
	termsContainer: {
		width: '100%',
		maxWidth: 560,
		marginTop: 'auto',
		paddingTop: 7,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#aeb4b1',
	},
	termsText: {
		color: '#414744',
		fontFamily: 'MontserratRegular',
		fontSize: 13,
		lineHeight: 15,
		textAlign: 'center',
	},
});
