import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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

function FormField({ icon, placeholder, value, onChangeText, ...inputProps }) {
	return (
		<View style={styles.inputContainer}>
			<Text style={styles.inputIcon} accessibilityElementsHidden>{icon}</Text>
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
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

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
								onPress={() => Alert.alert('Ajuda', 'Preencha seus dados para criar uma conta.')}
								accessibilityRole="button"
								accessibilityLabel="Ajuda sobre o cadastro"
							>
								<Text style={styles.helpText}>?</Text>
							</TouchableOpacity>
							<Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
						</View>

						<View style={styles.formPanel}>
							<Text style={styles.title}>CADASTRE-SE</Text>

							<View style={styles.fields}>
								<FormField
									icon="♟"
									placeholder="Nome"
									value={name}
									onChangeText={setName}
									autoCapitalize="words"
									autoComplete="name"
									accessibilityLabel="Nome"
								/>
								<FormField
									icon="✉"
									placeholder="E-mail"
									value={email}
									onChangeText={setEmail}
									keyboardType="email-address"
									autoCapitalize="none"
									autoComplete="email"
									accessibilityLabel="E-mail"
								/>
								<FormField
									icon="▣"
									placeholder="Senha"
									value={password}
									onChangeText={setPassword}
									secureTextEntry
									autoComplete="new-password"
									accessibilityLabel="Senha"
								/>
							</View>

							<TouchableOpacity
								style={styles.submitButton}
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
		marginBottom: 14,
	},
	fields: {
		width: '100%',
		gap: 9,
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
	submitButton: {
		width: '52%',
		maxWidth: 180,
		minWidth: 140,
		height: 40,
		marginTop: 14,
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
	backButton: {
		paddingHorizontal: 16,
		paddingVertical: 7,
	},
	backText: {
		color: '#c8ccca',
		fontSize: 13,
		fontWeight: '800',
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
