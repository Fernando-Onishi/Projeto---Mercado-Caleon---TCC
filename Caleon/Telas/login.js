import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
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
import { auth } from '../Config/FireBaseConfig';

export default function TelaLogin({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		let isInitialCheck = true;
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (isInitialCheck && user) {
				navigation.replace('TelaHome');
			}
			isInitialCheck = false;
		});

		return unsubscribe;
	}, [navigation]);

	async function handleLogin() {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			Alert.alert('Login', 'Informe um e-mail válido.');
			return;
		}

		if (password.length < 6) {
			Alert.alert('Login', 'A senha deve ter pelo menos 6 caracteres.');
			return;
		}

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
				'auth/user-disabled': 'Esta conta está desativada.',
				'auth/network-request-failed': 'Sem conexão com a internet. Tente novamente.',
				'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
			};
			Alert.alert('Login', messages[error.code] || 'Não foi possível entrar. Tente novamente.');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handlePasswordRecovery() {
		const normalizedEmail = email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			Alert.alert('Recuperar senha', 'Informe um e-mail válido para continuar.');
			return;
		}

		try {
			await sendPasswordResetEmail(auth, normalizedEmail);
			Alert.alert('Recuperar senha', 'Enviamos um link de recuperação para seu e-mail.');
		} catch (error) {
			const message = error.code === 'auth/network-request-failed'
				? 'Sem conexão com a internet. Tente novamente.'
				: 'Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.';
			Alert.alert('Recuperar senha', message);
		}
	}

	return (
		<ImageBackground source={require('../assets/fundo.png')} resizeMode="cover" style={styles.background}>
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
						<View style={styles.brandArea}>
							<TouchableOpacity
								style={styles.helpButton}
								activeOpacity={0.8}
								onPress={() => Alert.alert('Ajuda', 'Informe seu e-mail e sua senha para entrar.')}
								accessibilityRole="button"
								accessibilityLabel="Ajuda sobre o login"
							>
								<Text style={styles.helpText}>?</Text>
							</TouchableOpacity>
							<Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
						</View>

						<View style={styles.formPanel}>
							<Text style={styles.title}>LOGIN</Text>

							<View style={styles.fields}>
								<View style={styles.inputContainer}>
									<Text style={styles.inputIcon} accessibilityElementsHidden>✉</Text>
									<TextInput
										style={styles.input}
										placeholder="E-mail"
										placeholderTextColor="#858b89"
										value={email}
										onChangeText={setEmail}
										keyboardType="email-address"
										autoCapitalize="none"
										autoComplete="email"
										accessibilityLabel="E-mail"
									/>
								</View>
								<View style={styles.inputContainer}>
									<Text style={styles.inputIcon} accessibilityElementsHidden>▣</Text>
									<TextInput
										style={styles.input}
										placeholder="Senha"
										placeholderTextColor="#858b89"
										value={password}
										onChangeText={setPassword}
										secureTextEntry
										autoComplete="current-password"
										accessibilityLabel="Senha"
									/>
								</View>
							</View>

							<TouchableOpacity
								style={styles.recoveryButton}
								activeOpacity={0.7}
								onPress={handlePasswordRecovery}
								accessibilityRole="button"
							>
								<Text style={styles.recoveryText}>Esqueci minha senha</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.submitButton}
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
								<Text style={styles.termsText}>
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
		minHeight: 245,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 14,
	},
	logo: {
		width: '72%',
		maxWidth: 220,
		aspectRatio: 1,
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
	helpText: {
		color: '#205f4d',
		fontSize: 19,
		fontWeight: '900',
		lineHeight: 22,
	},
	formPanel: {
		flex: 1,
		minHeight: 285,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 10,
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
	},
	title: {
		color: '#101412',
		fontSize: 19,
		fontWeight: '900',
		marginBottom: 25,
	},
	fields: {
		width: '100%',
		gap: 10,
	},
	inputContainer: {
		height: 38,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 9,
		borderRadius: 9,
		backgroundColor: '#f2f3f3',
		elevation: 2,
	},
	inputIcon: {
		width: 20,
		color: '#737b78',
		fontSize: 14,
		textAlign: 'center',
		marginRight: 2,
	},
	input: {
		flex: 1,
		paddingVertical: 0,
		color: '#202623',
		fontSize: 12,
	},
	recoveryButton: {
		alignSelf: 'flex-end',
		paddingTop: 4,
		paddingBottom: 2,
		paddingHorizontal: 10,
	},
	recoveryText: {
		color: '#57916d',
		fontSize: 8,
		textDecorationLine: 'underline',
	},
	submitButton: {
		width: '52%',
		maxWidth: 180,
		minWidth: 140,
		height: 40,
		marginTop: 32,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#145441',
		elevation: 3,
	},
	submitText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '800',
	},
	registerButton: {
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	registerText: {
		color: '#57916d',
		fontSize: 8,
	},
	termsContainer: {
		width: '100%',
		marginTop: 'auto',
		paddingTop: 7,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#aeb4b1',
	},
	termsText: {
		color: '#414744',
		fontSize: 8,
		lineHeight: 10,
		textAlign: 'center',
	},
});
