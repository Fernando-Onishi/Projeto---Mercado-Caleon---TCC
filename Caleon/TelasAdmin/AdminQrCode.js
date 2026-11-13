import React, { useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import {
	ActivityIndicator,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Feather from '@expo/vector-icons/Feather';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CircularIconButton from '../Componentes/CircularIconButton';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';

const COLORS = ADMIN_THEME.colors;

const BARCODE_TYPES = {
	qrcode: ['qr'],
	barcode: ['ean13', 'ean8', 'code128', 'upc_a', 'upc_e'],
};

function formatBarcodeType(type) {
	if (type === 'qr') return 'QR Code';
	return type.toUpperCase().replace('_', '-');
}

export default function AdminQrCode({ navigation }) {
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const { height, width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const isFocused = useIsFocused();
	const [permission, requestPermission] = useCameraPermissions();
	const [modoLeitura, setModoLeitura] = useState('qrcode');
	const [flashAtivo, setFlashAtivo] = useState(false);
	const [facing, setFacing] = useState('back');
	const [scanned, setScanned] = useState(false);
	const [scanResult, setScanResult] = useState(null);
	const [cameraError, setCameraError] = useState('');
	const scanLock = useRef(false);
	const [cameraKey, setCameraKey] = useState(0);
	const frameWidth = Math.min(modoLeitura === 'qrcode' ? 250 : 280, width - 40);
	const frameHeight = modoLeitura === 'qrcode' ? 250 : 140;
	const frameTop = Math.max(insets.top + 92, (height - frameHeight) / 2 - 25);
	const sideSize = Math.max(0, (width - frameWidth) / 2);

	function handleBarcodeScanned(result) {
		if (scanLock.current || !result.data) return;
		scanLock.current = true;
		setScanned(true);
		setScanResult({ data: result.data, type: result.type });
	}

	function scanAgain() {
		scanLock.current = false;
		setScanned(false);
		setScanResult(null);
		setCameraError('');
		setCameraKey((key) => key + 1);
	}

	function changeMode(mode) {
		if (mode === modoLeitura) return;
		setModoLeitura(mode);
		scanAgain();
	}

	function alternarLadoCamera() {
		setFacing((currentFacing) => {
			const nextFacing = currentFacing === 'back' ? 'front' : 'back';
			if (nextFacing === 'front') setFlashAtivo(false);
			return nextFacing;
		});
		scanAgain();
	}

	function alternarFlash() {
		if (facing !== 'back') {
			setFacing('back');
			setFlashAtivo(true);
			return;
		}
		setFlashAtivo((active) => !active);
	}

	if (!permission) {
		return (
			<View style={styles.permissionRoot}>
				<View style={styles.permissionScreen}>
					<ActivityIndicator size="large" color={COLORS.mint} />
					<Text style={styles.permissionMessage}>Verificando permissão da câmera...</Text>
				</View>
				<View style={[styles.bottomNavigation, { paddingBottom: insets.bottom }]}><NavegacaoAdmin navigation={navigation} activeTab="QR Code" /></View>
			</View>
		);
	}

	if (!permission.granted) {
		return (
			<View style={styles.permissionRoot}>
				<View style={styles.permissionScreen}>
					<StatusBar barStyle="light-content" backgroundColor={COLORS.green} />
					<CircularIconButton
						style={[styles.permissionBack, { top: insets.top + 12 }]}
						icon={<Feather name="chevron-left" size={27} color={COLORS.white} />}
						onPress={() => navigation.goBack()}
						accessibilityLabel="Voltar"
					/>
					<Feather name="camera-off" size={56} color={COLORS.mint} />
					<Text style={styles.permissionTitle}>Permissão da câmera</Text>
					<Text style={styles.permissionMessage}>
						Permita o acesso à câmera para ler QR Codes e códigos de barras.
					</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
						<Text style={styles.primaryButtonText}>Permitir câmera</Text>
					</TouchableOpacity>
				</View>
				<View style={[styles.bottomNavigation, { paddingBottom: insets.bottom }]}><NavegacaoAdmin navigation={navigation} activeTab="QR Code" /></View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
			{isFocused && !cameraError ? (
				<CameraView
					key={cameraKey}
					style={StyleSheet.absoluteFill}
					facing={facing}
					enableTorch={flashAtivo && facing === 'back'}
					barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES[modoLeitura] }}
					onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
					onMountError={({ message }) => {
						console.error('Não foi possível iniciar a câmera do scanner.', message);
						setCameraError(message || 'Não foi possível iniciar a câmera.');
					}}
				/>
			) : null}

			{cameraError ? (
				<View style={styles.cameraErrorPanel}>
					<CircularIconButton
						style={[styles.permissionBack, { top: insets.top + 12 }]}
						icon={<Feather name="chevron-left" size={27} color={COLORS.white} />}
						onPress={() => navigation.goBack()}
						accessibilityLabel="Voltar"
					/>
					<Feather name="camera-off" size={50} color={COLORS.white} />
					<Text style={styles.cameraErrorText}>Não foi possível iniciar a câmera.</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={scanAgain}>
						<Text style={styles.primaryButtonText}>Tentar novamente</Text>
					</TouchableOpacity>
				</View>
			) : (
				<>
					<View pointerEvents="none" style={StyleSheet.absoluteFill}>
						<View style={[styles.shade, { height: frameTop }]} />
						<View style={[styles.frameRow, { top: frameTop, height: frameHeight }]}>
							<View style={[styles.frameSideShade, { width: sideSize }]} />
							<View style={[styles.scanFrame, { width: frameWidth, height: frameHeight }]} />
							<View style={[styles.frameSideShade, { width: sideSize }]} />
						</View>
						<View style={[styles.shade, { top: frameTop + frameHeight, bottom: 0 }]} />
					</View>

					<View style={[styles.header, { top: insets.top + 12 }]}>
						<CircularIconButton
							icon={<Feather name="chevron-left" size={30} color={COLORS.white} />}
							onPress={() => navigation.goBack()}
							accessibilityLabel="Voltar"
						/>
						<CircularIconButton
							icon={<Feather name={flashAtivo ? 'zap' : 'zap-off'} size={24} color={COLORS.white} />}
							onPress={alternarFlash}
							accessibilityState={{ selected: flashAtivo }}
							accessibilityLabel={flashAtivo ? 'Desligar lanterna' : 'Ligar lanterna'}
						/>
					</View>

					<View style={[styles.guidance, { top: frameTop + frameHeight + 18 }]}>
						<Text style={styles.guidanceText}>
							Posicione {modoLeitura === 'qrcode' ? 'o QR Code' : 'o código de barras'} dentro da área
						</Text>
					</View>

					{scanResult ? (
						<View style={[styles.resultPanel, { bottom: insets.bottom + 77 + 144 }]}>
							<Text style={styles.resultTitle}>Código lido</Text>
							<Text style={styles.resultType}>{formatBarcodeType(scanResult.type)}</Text>
							<Text selectable style={styles.resultData}>{scanResult.data}</Text>
							<TouchableOpacity style={styles.primaryButton} onPress={scanAgain}>
								<Text style={styles.primaryButtonText}>Escanear Novamente</Text>
							</TouchableOpacity>
						</View>
					) : null}
					<View style={[styles.footer, { bottom: insets.bottom + 61 + 16 }]}>
						<View style={styles.modeSelector}>
							<TouchableOpacity
								style={[styles.modeButton, modoLeitura === 'qrcode' && styles.modeButtonActive]}
								onPress={() => changeMode('qrcode')}
								accessibilityRole="button"
								accessibilityState={{ selected: modoLeitura === 'qrcode' }}
							>
								<Text style={[styles.modeButtonText, modoLeitura === 'qrcode' && styles.modeButtonTextActive]}>
									QR Code
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modeButton, modoLeitura === 'barcode' && styles.modeButtonActive]}
								onPress={() => changeMode('barcode')}
								accessibilityRole="button"
								accessibilityState={{ selected: modoLeitura === 'barcode' }}
							>
								<Text style={[styles.modeButtonText, modoLeitura === 'barcode' && styles.modeButtonTextActive]}>
									Código de Barras
								</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.flipControl}>
							<CircularIconButton
								icon={<Feather name="refresh-cw" size={24} color={COLORS.white} />}
								onPress={alternarLadoCamera}
								accessibilityLabel={facing === 'back' ? 'Usar câmera frontal' : 'Usar câmera traseira'}
							/>
							<Text style={styles.flipButtonText}>Inverter câmera</Text>
						</View>
					</View>
				</>
			)}
			<View style={[styles.bottomNavigation, { paddingBottom: insets.bottom }]}><NavegacaoAdmin navigation={navigation} activeTab="QR Code" /></View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	shade: {
		position: 'absolute',
		left: 0,
		right: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.58)',
	},
	frameSideShade: {
		backgroundColor: 'rgba(0, 0, 0, 0.58)',
	},
	frameRow: {
		position: 'absolute',
		left: 0,
		right: 0,
		flexDirection: 'row',
	},
	scanFrame: {
		borderWidth: 3,
		borderColor: COLORS.green,
		borderRadius: ADMIN_THEME.layout.cardRadius,
		backgroundColor: 'transparent',
		flexShrink: 0,
	},
	header: {
		position: 'absolute',
		left: 16,
		right: 16,
		zIndex: 2,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	guidance: {
		position: 'absolute',
		left: 30,
		right: 30,
		alignItems: 'center',
		zIndex: 2,
	},
	guidanceText: {
		color: COLORS.white,
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
		textShadowColor: '#000000',
		textShadowRadius: 5,
	},
	resultPanel: {
		position: 'absolute',
		left: 20,
		right: 20,
		zIndex: 3,
		padding: 18,
		borderRadius: ADMIN_THEME.layout.cardRadius,
		backgroundColor: 'rgba(27, 75, 61, 0.96)',
	},
	resultTitle: {
		color: COLORS.white,
		fontFamily: ADMIN_THEME.fonts.display,
		fontSize: 24,
		textAlign: 'center',
	},
	resultType: {
		marginTop: 6,
		color: '#A8E8D1',
		fontFamily: ADMIN_THEME.fonts.bold,
		fontSize: 14,
		textAlign: 'center',
	},
	resultData: {
		marginTop: 8,
		marginBottom: 14,
		color: COLORS.white,
		fontFamily: ADMIN_THEME.fonts.body,
		fontSize: 14,
		textAlign: 'center',
	},
	primaryButton: {
		minHeight: 46,
		paddingHorizontal: 18,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.mint,
	},
	primaryButtonText: {
		color: COLORS.white,
		fontFamily: ADMIN_THEME.fonts.bold,
		fontSize: 14,
	},
	permissionScreen: {
		flex: 1,
		paddingHorizontal: 32,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		backgroundColor: COLORS.green,
	},
	permissionRoot: {
		flex: 1,
		backgroundColor: COLORS.green,
	},
	bottomNavigation: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 5,
	},
	permissionBack: {
		position: 'absolute',
		left: 16,
	},
	permissionTitle: {
		color: COLORS.white,
		fontFamily: ADMIN_THEME.fonts.display,
		fontSize: 26,
		textAlign: 'center',
	},
	permissionMessage: {
		color: COLORS.background,
		fontFamily: ADMIN_THEME.fonts.body,
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
	},
	cameraErrorPanel: {
		flex: 1,
		paddingHorizontal: 32,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 18,
		backgroundColor: COLORS.green,
	},
	cameraErrorText: {
		color: COLORS.white,
		fontFamily: ADMIN_THEME.fonts.body,
		fontSize: 15,
		textAlign: 'center',
	},
	footer: {
		position: 'absolute',
		left: 20,
		right: 20,
		zIndex: 2,
		alignItems: 'center',
		gap: 16,
	},
	modeSelector: {
		width: '100%',
		padding: 4,
		borderRadius: 14,
		flexDirection: 'row',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modeButton: {
		flex: 1,
		minHeight: 44,
		paddingHorizontal: 8,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modeButtonActive: {
		backgroundColor: COLORS.mint,
	},
	modeButtonText: {
		color: COLORS.white,
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center',
	},
	modeButtonTextActive: {
		fontWeight: '700',
	},
	flipControl: {
		alignItems: 'center',
		gap: 6,
	},
	flipButtonText: {
		color: COLORS.white,
		fontSize: 13,
		fontWeight: '600',
	},
});
