import React, { useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import {
	ActivityIndicator,
	Image,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabFocused } from '../Componentes/TabPagerContext';
import Feather from '@expo/vector-icons/Feather';
import { useCameraPermissions } from 'expo-camera';
import CameraSegura from '../Componentes/CameraSegura';
import CircularIconButton from '../Componentes/CircularIconButton';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { useProductModal } from '../Componentes/ProductModalContext';
import { resolveScannedCode } from '../Config/CodigoBarras';
import { formatCurrency } from '../Config/Produtos';
import { themedStyles, tc } from '../Config/Tema';

const COLORS = ADMIN_THEME.colors;

const BARCODE_TYPES = {
	qrcode: ['qr'],
	barcode: ['ean13', 'ean8', 'code128', 'upc_a', 'upc_e'],
};

function formatBarcodeType(type) {
	if (type === 'qr') return 'QR Code';
	return type.toUpperCase().replace('_', '-');
}

export default function AdminQrCode({ navigation, userRole }) {
	const { openProductModal, isProductModalOpen } = useProductModal();
	// Resultado da busca do código: { status: 'loading' | 'store' | 'found' | 'unknown', product }
	const [lookup, setLookup] = useState(null);
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const { height, width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const isFocused = useTabFocused();
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
		const code = String(result.data).trim();
		setLookup({ status: 'loading', code });
		resolveScannedCode(code)
			.then((resolved) => setLookup((current) => (current?.code === code ? { ...resolved, code } : current)))
			.catch(() => setLookup((current) => (current?.code === code ? { status: 'unknown', code, product: { barcode: code } } : current)));
	}

	function registerScanned() {
		if (!lookup?.product) return;
		if (lookup.status === 'store') {
			openProductModal({ productId: lookup.product.id, product: lookup.product });
		} else {
			openProductModal({ product: lookup.product });
		}
	}

	function scanAgain() {
		scanLock.current = false;
		setScanned(false);
		setScanResult(null);
		setLookup(null);
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
					<ActivityIndicator size="large" color={tc(COLORS.mint)} />
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
					{isFocused ? <StatusBar barStyle="light-content" backgroundColor={COLORS.green} /> : null}
					<CircularIconButton
						style={[styles.permissionBack, { top: insets.top + 12 }]}
						icon={<Feather name="chevron-left" size={27} color={tc(COLORS.white)} />}
						onPress={() => navigation.goBack()}
						accessibilityLabel="Voltar"
					/>
					<Feather name="camera-off" size={56} color={tc(COLORS.mint)} />
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
			{isFocused ? <StatusBar barStyle="light-content" backgroundColor="transparent" translucent /> : null}
			{/* Câmera desliga fora da aba e quando o formulário de produto (que tem leitor próprio) está aberto. */}
			<CameraSegura
				key={cameraKey}
				active={isFocused && !isProductModalOpen}
				style={StyleSheet.absoluteFill}
				facing={facing}
				enableTorch={flashAtivo && facing === 'back'}
				barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES[modoLeitura] }}
				onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
			/>

			{cameraError ? (
				<View style={styles.cameraErrorPanel}>
					<CircularIconButton
						style={[styles.permissionBack, { top: insets.top + 12 }]}
						icon={<Feather name="chevron-left" size={27} color={tc(COLORS.white)} />}
						onPress={() => navigation.goBack()}
						accessibilityLabel="Voltar"
					/>
					<Feather name="camera-off" size={50} color={tc(COLORS.white)} />
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
							icon={<Feather name="chevron-left" size={30} color={tc(COLORS.white)} />}
							onPress={() => navigation.goBack()}
							accessibilityLabel="Voltar"
						/>
						<CircularIconButton
							icon={<Feather name={flashAtivo ? 'zap' : 'zap-off'} size={24} color={tc(COLORS.white)} />}
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
							<Text style={styles.resultType}>{formatBarcodeType(scanResult.type)} • {scanResult.data}</Text>
							{!lookup || lookup.status === 'loading' ? (
								<View style={styles.lookupRow}>
									<ActivityIndicator color={tc(COLORS.green)} />
									<Text style={styles.lookupText}>Procurando o produto...</Text>
								</View>
							) : (
								<>
									<View style={styles.lookupRow}>
										{lookup.product?.imageUrl ? (
											<Image source={{ uri: lookup.product.imageUrl }} style={styles.lookupImage} resizeMode="contain" />
										) : (
											<View style={[styles.lookupImage, styles.lookupImageEmpty]}>
												<Feather name={lookup.status === 'unknown' ? 'help-circle' : 'package'} size={22} color={tc(COLORS.muted)} />
											</View>
										)}
										<View style={styles.lookupCopy}>
											<Text style={styles.lookupTag}>
												{lookup.status === 'store' ? 'Já está no catálogo' : lookup.status === 'found' ? 'Produto encontrado' : 'Produto desconhecido'}
											</Text>
											<Text style={styles.lookupName} numberOfLines={2}>
												{lookup.product?.name || 'Sem nome — preencha no cadastro'}
											</Text>
											<Text style={styles.lookupMeta} numberOfLines={1}>
												{lookup.status === 'store'
													? `${formatCurrency(Number(lookup.product.pricePerKg) || 0)} • estoque ${Number(lookup.product.stockCurrent) || 0}`
													: [lookup.product?.category, lookup.product?.unit].filter(Boolean).join(' • ')}
											</Text>
										</View>
									</View>
									{userRole === 'admin' ? (
										<TouchableOpacity style={styles.primaryButton} onPress={registerScanned} accessibilityRole="button">
											<Feather name={lookup.status === 'store' ? 'edit-2' : 'plus'} size={18} color={tc(COLORS.white)} />
											<Text style={styles.primaryButtonText}>
												{lookup.status === 'store' ? 'Editar produto' : 'Cadastrar produto'}
											</Text>
										</TouchableOpacity>
									) : null}
								</>
							)}
							<TouchableOpacity style={styles.secondaryButton} onPress={scanAgain} accessibilityRole="button">
								<Text style={styles.secondaryButtonText}>Escanear novamente</Text>
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
								icon={<Feather name="refresh-cw" size={24} color={tc(COLORS.white)} />}
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

const styles = themedStyles(StyleSheet.create({
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
	lookupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
	lookupText: { color: COLORS.white, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 14 },
	lookupImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.white },
	lookupImageEmpty: { alignItems: 'center', justifyContent: 'center' },
	lookupCopy: { flex: 1, minWidth: 0 },
	lookupTag: { color: '#FFC928', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
	lookupName: { marginTop: 2, color: COLORS.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 15 },
	lookupMeta: { marginTop: 2, color: '#A8E8D1', fontFamily: ADMIN_THEME.fonts.body, fontSize: 12 },
	secondaryButton: { minHeight: 42, marginTop: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)' },
	secondaryButtonText: { color: COLORS.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	primaryButton: {
		minHeight: 46,
		marginTop: 14,
		paddingHorizontal: 18,
		flexDirection: 'row',
		gap: 8,
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
}));
