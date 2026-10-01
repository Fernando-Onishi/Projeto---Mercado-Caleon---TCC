import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Fontisto from '@expo/vector-icons/Fontisto';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
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
	useWindowDimensions,
	View,
} from 'react-native';
import { auth } from '../Config/FireBaseConfig';

export default function TelaLogin({ navigation }) {
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
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState(null);

	if (!fontsLoaded) return null;

	async function handleLogin() {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			setFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
			return;
		}

		if (password.length < 6) {
			setFeedback({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
			return;
		}

		setFeedback(null);
		setIsSubmitting(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
			navigation.replace('TelaHome');
		} catch (error) {
			const messages = {
				'auth/invalid-credential': 'E-mail ou senha incorretos.',
				'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
				'auth/user-not-found': 'E-mail ou senha incorretos.',
				'auth/wrong-password': 'E-mail ou senha incorretos.',
				'auth/invalid-email': 'Informe um e-mail válido.',
				'auth/user-disabled': 'Esta conta está desativada.',
				'auth/operation-not-allowed': 'O login por e-mail ainda não está habilitado.',
				'auth/network-request-failed': 'Sem conexão com a internet. Tente novamente.',
				'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
			};
			setFeedback({ type: 'error', message: messages[error.code] || 'Não foi possível entrar. Tente novamente.' });
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handlePasswordRecovery() {
		const normalizedEmail = email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			setFeedback({ type: 'error', message: 'Informe um e-mail válido para continuar.' });
			return;
		}

		setFeedback(null);
		try {
			await sendPasswordResetEmail(auth, normalizedEmail);
			setFeedback({ type: 'success', message: 'Enviamos um link de recuperação para seu e-mail.' });
		} catch (error) {
			const message = error.code === 'auth/network-request-failed'
				? 'Sem conexão com a internet. Tente novamente.'
				: 'Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.';
			setFeedback({ type: 'error', message });
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
								onPress={() => Alert.alert('Ajuda', 'Informe seu e-mail e sua senha para entrar.')}
								accessibilityRole="button"
								accessibilityLabel="Ajuda sobre o login"
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
							<Text style={styles.title}>LOGIN</Text>

							<View style={[styles.fields, { maxWidth: contentMaxWidth }]}>
								<View style={styles.inputContainer}>
									<Fontisto name="email" size={18} color="black" style={styles.iconGlyph} accessibilityElementsHidden />
									<TextInput
										style={styles.input}
										placeholder="E-mail"
										placeholderTextColor="#858b89"
										value={email}
										onChangeText={(value) => {
											setEmail(value);
											setFeedback(null);
										}}
										keyboardType="email-address"
										autoCapitalize="none"
										autoComplete="email"
										accessibilityLabel="E-mail"
									/>
								</View>
								<View style={styles.inputContainer}>
									<EvilIcons name="lock" size={26} color="black" style={styles.iconGlyph} accessibilityElementsHidden />
									<TextInput
										style={styles.input}
										placeholder="Senha"
										placeholderTextColor="#858b89"
										value={password}
										onChangeText={(value) => {
											setPassword(value);
											setFeedback(null);
										}}
										secureTextEntry
										autoComplete="current-password"
										accessibilityLabel="Senha"
									/>
								</View>
							</View>

							{feedback && (
								<View
									style={[
										styles.feedbackContainer,
										{ maxWidth: contentMaxWidth },
										feedback.type === 'error' ? styles.errorFeedback : styles.successFeedback,
									]}
									accessibilityRole="alert"
									accessibilityLiveRegion="polite"
								>
									<Text
										style={[
											styles.feedbackText,
											feedback.type === 'error' ? styles.errorFeedbackText : styles.successFeedbackText,
										]}
									>
										{feedback.message}
									</Text>
								</View>
							)}

							<TouchableOpacity
								style={[styles.recoveryButton, { maxWidth: contentMaxWidth }]}
								activeOpacity={0.7}
								onPress={handlePasswordRecovery}
								accessibilityRole="button"
							>
								<Text style={styles.recoveryText}>Esqueci minha senha</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.submitButton, { maxWidth: contentMaxWidth }]}
								activeOpacity={0.85}
								onPress={handleLogin}
								disabled={isSubmitting}
								accessibilityRole="button"
							>
								<Text style={styles.submitText}>{isSubmitting ? 'Entrando...' : 'Entrar'}</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.registerButton}
								activeOpacity={0.7}
								onPress={() => navigation.navigate('TelaCadastro')}
								accessibilityRole="button"
							>
								<Text style={styles.registerText}>Não tem uma conta? Cadastre-se</Text>
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
		paddingTop: 12,
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
		minHeight: 340,
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
	feedbackContainer: {
		width: '100%',
		maxWidth: 560,
		marginTop: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderRadius: 8,
	},
	errorFeedback: {
		backgroundColor: '#fff1f0',
		borderColor: '#e9b4af',
	},
	successFeedback: {
		backgroundColor: '#edf7f1',
		borderColor: '#b8ddc7',
	},
	feedbackText: {
		fontFamily: 'MontserratSemiBold',
		fontSize: 13,
		lineHeight: 18,
	},
	errorFeedbackText: {
		color: '#a12820',
	},
	successFeedbackText: {
		color: '#216a4b',
	},
	inputContainer: {
		height: 48,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 13,
		borderRadius: 11,
		backgroundColor: '#f5f5f5',
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
	recoveryButton: {
		width: '100%',
		maxWidth: 560,
		alignSelf: 'center',
		alignItems: 'flex-end',
		paddingTop: 8,
		paddingBottom: 4,
		paddingHorizontal: 2,
	},
	recoveryText: {
		color: '#1B4B3D',
		fontFamily: 'MontserratMedium',
		fontSize: 13,
		textDecorationLine: 'underline',
	},
	submitButton: {
		width: '100%',
		maxWidth: 560,
		height: 48,
		marginTop: 44,
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
	registerButton: {
		paddingHorizontal: 10,
		paddingVertical: 16,
	},
	registerText: {
		color: '#1B4B3D',
		fontFamily: 'MontserratRegular',
		fontSize: 13,
	},
	termsContainer: {
		width: '100%',
		maxWidth: 560,
		marginTop: 'auto',
		paddingTop: 12,
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
