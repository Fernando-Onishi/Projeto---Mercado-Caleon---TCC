import React, { useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import {
	ActivityIndicator,
	Animated,
	Easing,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import CameraSegura from '../Componentes/CameraSegura';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { db } from '../Config/FireBaseConfig';
import { toCompressedDataUrl } from '../Config/ImagemFirestore';
import { isProductBarcode, lookupPublicProduct } from '../Config/CodigoBarras';
import { formatExpiry, maskExpiryInput, parseExpiryInput } from './adminProdutoUtils';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { themedStyles, tc } from '../Config/Tema';

const C = ADMIN_THEME.colors;
const CATEGORIES = [
	'HortiFruti', 'Carnes', 'Bebidas', 'Laticínios', 'Doces',
	'Congelados', 'Higiene', 'Padaria', 'Limpeza', 'Mercearia',
];
const BARCODE_TYPES = ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e'];

const EMPTY_FORM = {
	name: '',
	description: '',
	category: CATEGORIES[0],
	pricePerKg: '',
	originalPricePerKg: '',
	stockCurrent: '0',
	stockMinimum: '0',
	stockMaximum: '0',
	stockCritical: '0',
	defaultWeightGrams: '250',
	unit: 'kg',
	barcode: '',
	// 'un' = embalagem vendida por unidade (ex.: "2 L"); null = vendido por peso.
	unitBase: null,
	// Validade (só o admin vê): dd/mm/aaaa no campo.
	expiresAt: '',
	discountPercent: '',
	images: [],
	availableWeights: [300, 600, 1000, 1500],
};

function toInputValue(value) {
	return value === null || value === undefined ? '' : String(value);
}

function mapProductToForm(product = {}) {
	const safeProduct = product && typeof product === 'object' ? product : {};
	const imageUrls = (Array.isArray(safeProduct.imageUrls) && safeProduct.imageUrls.length ? safeProduct.imageUrls : [safeProduct.imageUrl])
		.filter((url) => typeof url === 'string' && url.length > 0);
	const pricePerKg = Number(safeProduct.pricePerKg ?? safeProduct.price) || 0;
	const originalPricePerKg = Number(safeProduct.originalPricePerKg) || 0;
	return {
		...EMPTY_FORM,
		name: toInputValue(safeProduct.name),
		description: toInputValue(safeProduct.description),
		category: safeProduct.category === 'Horti-Fruti' ? 'HortiFruti' : safeProduct.category || CATEGORIES[0],
		pricePerKg: toInputValue(safeProduct.pricePerKg ?? safeProduct.price),
		originalPricePerKg: toInputValue(safeProduct.originalPricePerKg),
		stockCurrent: toInputValue(safeProduct.stockCurrent ?? safeProduct.stock ?? 0),
		stockMinimum: toInputValue(safeProduct.stockMinimum ?? 0),
		stockMaximum: toInputValue(safeProduct.stockMaximum ?? 0),
		stockCritical: toInputValue(safeProduct.stockCritical ?? 0),
		defaultWeightGrams: toInputValue(safeProduct.defaultWeightGrams ?? 250),
		unit: toInputValue(safeProduct.unit ?? 'kg'),
		barcode: toInputValue(safeProduct.barcode),
		unitBase: safeProduct.unitBase && safeProduct.unitBase !== 'g' ? safeProduct.unitBase : null,
		expiresAt: formatExpiry(safeProduct),
		discountPercent: originalPricePerKg > pricePerKg && pricePerKg > 0
			? String(Math.round((1 - pricePerKg / originalPricePerKg) * 100))
			: '',
		images: imageUrls.slice(0, 3).map((uri) => ({ uri, isLocal: false })),
		availableWeights: Array.isArray(safeProduct.availableWeights) && safeProduct.availableWeights.length
			? safeProduct.availableWeights
			: EMPTY_FORM.availableWeights,
	};
}

function parseAmount(value) {
	if (typeof value !== 'string' || !value.trim()) return null;
	const amount = Number(value.trim().replace(',', '.'));
	return Number.isFinite(amount) ? amount : null;
}

export default function ProductFormModal({ visible, presentation = 'modal', productId = null, product: productFromRoute = null, onClose }) {
	const { height: windowHeight } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [fontsLoaded, fontError] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const isEditing = Boolean(productId);
	const [form, setForm] = useState(() => mapProductToForm(productFromRoute));
	const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing);
	const [loadError, setLoadError] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isScannerVisible, setIsScannerVisible] = useState(false);
	const [scannerPermissionGranted, setScannerPermissionGranted] = useState(false);
	const [hasScanned, setHasScanned] = useState(false);
	const [isLookingUp, setIsLookingUp] = useState(false);
	const [openSelect, setOpenSelect] = useState(null);
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();

	useEffect(() => {
		if (fontError) console.error('Não foi possível carregar as fontes do formulário de produto; usando fontes do sistema.', fontError);
	}, [fontError]);

	useEffect(() => {
		let active = true;
		if (!productId) {
			// Cadastro novo: pode vir preenchido (ex.: produto lido pelo código de barras).
			setForm(mapProductToForm(productFromRoute));
			setIsLoadingProduct(false);
			setLoadError('');
			return () => { active = false; };
		}

		setIsLoadingProduct(true);
		setLoadError('');
		async function loadProduct() {
			try {
				const snapshot = await getDoc(doc(db, 'products', productId));
				if (!active) return;
				if (snapshot.exists()) {
					setForm(mapProductToForm({ ...snapshot.data(), id: snapshot.id }));
				} else if (productFromRoute) {
					setForm(mapProductToForm(productFromRoute));
				} else {
					setLoadError('Produto não encontrado. Feche e tente novamente pelo catálogo.');
				}
			} catch (error) {
				console.error('Não foi possível carregar o produto para edição.', error);
				if (!active) return;
				if (productFromRoute) setForm(mapProductToForm(productFromRoute));
				else setLoadError('Não foi possível carregar o produto. Verifique a conexão e tente novamente.');
			} finally {
				if (active) setIsLoadingProduct(false);
			}
		}

		loadProduct();
		return () => { active = false; };
	}, [productId, productFromRoute]);

	// Folha que sobe de baixo (0 = escondida atrás da barra, 1 = aberta).
	const isSheet = presentation !== 'screen';
	const sheetProgress = useRef(new Animated.Value(isSheet ? 0 : 1)).current;
	const isClosingRef = useRef(false);

	useEffect(() => {
		if (!isSheet || !visible) return;
		Animated.timing(sheetProgress, {
			toValue: 1,
			duration: 300,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: Platform.OS !== 'web',
		}).start();
	}, [isSheet, visible, sheetProgress]);

	function closeModal() {
		if (isSaving || isClosingRef.current) return;
		if (!isSheet) {
			onClose?.();
			return;
		}
		isClosingRef.current = true;
		Animated.timing(sheetProgress, {
			toValue: 0,
			duration: 220,
			easing: Easing.in(Easing.cubic),
			useNativeDriver: Platform.OS !== 'web',
		}).start(() => onClose?.());
	}

	function updateField(key, value) {
		setForm((current) => {
			const next = { ...current, [key]: value };
			if (key === 'discountPercent') {
				const percentage = parseAmount(value);
				const price = parseAmount(current.pricePerKg);
				if (percentage !== null && percentage >= 0 && percentage < 100 && price > 0) {
					next.originalPricePerKg = (price / (1 - percentage / 100)).toFixed(2);
				}
			} else if (key === 'pricePerKg' || key === 'originalPricePerKg') {
				const price = parseAmount(next.pricePerKg);
				const original = parseAmount(next.originalPricePerKg);
				next.discountPercent = price > 0 && original > price
					? String(Math.round((1 - price / original) * 100))
					: '';
			}
			return next;
		});
	}

	async function chooseImage() {
		try {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				showGlobalNotification('Permita o acesso à galeria para selecionar uma imagem.');
				return;
			}
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsMultipleSelection: true,
				selectionLimit: 3,
				quality: 0.85,
			});
			if (!result.canceled && result.assets?.length) {
				setForm((current) => ({
					...current,
					images: [
						...current.images,
						...result.assets
							.filter((image) => image.uri)
							.map((image) => ({ uri: image.uri, isLocal: true })),
					].slice(0, 3),
				}));
			}
		} catch (error) {
			console.error('Não foi possível selecionar a imagem do produto.', error);
			showGlobalNotification('Não foi possível abrir a galeria.');
		}
	}

	function removeImage(index) {
		setForm((current) => ({
			...current,
			images: current.images.filter((_, imageIndex) => imageIndex !== index),
		}));
	}

	async function openBarcodeScanner() {
		try {
			const permission = cameraPermission?.granted
				? cameraPermission
				: await requestCameraPermission();
			if (!permission?.granted) {
				showGlobalNotification('Permita o acesso à câmera para ler o código do produto.');
				return;
			}
			setScannerPermissionGranted(true);
			setHasScanned(false);
			setIsScannerVisible(true);
		} catch (error) {
			console.error('Não foi possível solicitar acesso à câmera.', error);
			showGlobalNotification('Não foi possível abrir a câmera.');
		}
	}

	function handleBarcodeScanned({ data }) {
		if (hasScanned || !data) return;
		setHasScanned(true);
		updateField('barcode', data);
		setIsScannerVisible(false);
		fillFromBarcode(data);
	}

	// Procura o código nas bases públicas e preenche o que ainda está em branco.
	async function fillFromBarcode(code) {
		if (!isProductBarcode(code)) return;
		setIsLookingUp(true);
		try {
			const found = await lookupPublicProduct(code);
			if (!found) {
				showGlobalNotification('Produto não encontrado na base pública. Preencha os dados.');
				return;
			}
			setForm((current) => ({
				...current,
				name: current.name.trim() ? current.name : found.name,
				description: current.description.trim() ? current.description : found.description,
				category: current.name.trim() ? current.category : found.category,
				unit: found.unit,
				unitBase: 'un',
				defaultWeightGrams: '1000',
				availableWeights: [1000],
				images: current.images.length || !found.imageUrl ? current.images : [{ uri: found.imageUrl, isLocal: false }],
			}));
			showGlobalNotification(`Encontrado: ${found.name}`);
		} finally {
			setIsLookingUp(false);
		}
	}

	// A foto do produto vai comprimida dentro do próprio documento no Firestore (o Storage não está ativo).
	async function uploadProductImage(productDocumentId, image) {
		if (!image.isLocal) return { imageUrl: image.uri, imageRef: null };
		return { imageUrl: await toCompressedDataUrl(image.uri, { maxSize: 700, quality: 0.7 }), imageRef: null };
	}

	async function saveProduct() {
		if (isSaving) return;
		const name = form.name.trim().toLocaleUpperCase('pt-BR');
		const pricePerKg = parseAmount(form.pricePerKg);
		const originalPricePerKg = form.originalPricePerKg.trim()
			? parseAmount(form.originalPricePerKg)
			: parseAmount(form.discountPercent) > 0 && parseAmount(form.discountPercent) < 100
				? pricePerKg / (1 - parseAmount(form.discountPercent) / 100)
				: null;
		const stockCurrent = parseAmount(form.stockCurrent);
		const stockMinimum = parseAmount(form.stockMinimum);
		const stockMaximum = parseAmount(form.stockMaximum);
		const defaultWeightGrams = parseAmount(form.defaultWeightGrams);

		if (!name) {
			showGlobalNotification('Informe o nome do produto.');
			return;
		}
		if (pricePerKg === null || pricePerKg <= 0) {
			showGlobalNotification('Informe um preço por kg válido.');
			return;
		}
		if (originalPricePerKg !== null && (originalPricePerKg <= 0 || originalPricePerKg < pricePerKg)) {
			showGlobalNotification('O preço normal deve ser maior ou igual ao preço de venda.');
			return;
		}
		if (stockCurrent === null || stockCurrent < 0 || stockMinimum === null || stockMinimum < 0) {
			showGlobalNotification('Informe quantidades de estoque válidas.');
			return;
		}
		if (stockMaximum === null || stockMaximum < 0) {
			showGlobalNotification('Informe uma quantidade máxima de estoque válida.');
			return;
		}
		if (defaultWeightGrams === null || defaultWeightGrams <= 0) {
			showGlobalNotification('Informe um peso padrão maior que zero.');
			return;
		}
		const expiresAt = parseExpiryInput(form.expiresAt);
		if (expiresAt === undefined) {
			showGlobalNotification('Validade inválida. Use dia/mês/ano, por exemplo 25/12/2026.');
			return;
		}
		const discountPercent = parseAmount(form.discountPercent);
		if (discountPercent !== null && (discountPercent < 0 || discountPercent >= 100)) {
			showGlobalNotification('Informe um desconto entre 0% e 99%.');
			return;
		}

		setIsSaving(true);
		try {
			const productDocument = productId ? doc(db, 'products', productId) : doc(collection(db, 'products'));
			const uploadedImages = [];
			for (const image of form.images) {
				const uploadedImage = await uploadProductImage(productDocument.id, image);
				if (uploadedImage.imageUrl) uploadedImages.push(uploadedImage.imageUrl);
			}
			await setDoc(productDocument, {
				name,
				description: form.description.trim(),
				category: form.category,
				pricePerKg,
				originalPricePerKg: originalPricePerKg && originalPricePerKg > pricePerKg ? originalPricePerKg : null,
				stockCurrent,
				stockMinimum,
				stockMaximum,
				stockCritical: parseAmount(form.stockCritical) ?? 0,
				defaultWeightGrams,
				averageWeightGrams: defaultWeightGrams,
				availableWeights: form.availableWeights,
				unit: form.unit.trim() || 'kg',
				barcode: form.barcode.trim(),
				unitBase: form.unitBase || 'g',
				expiresAt,
				imageUrl: uploadedImages[0] || '',
				imageUrls: uploadedImages,
				// Foto escolhida pelo admin: a sincronização do catálogo inicial não a substitui mais.
				...(form.images.some((image) => image.isLocal) ? { imageFromSeed: false } : {}),
				active: true,
				updatedAt: serverTimestamp(),
				...(isEditing && !productFromRoute?.isSeedProduct ? {} : { createdAt: serverTimestamp() }),
			}, { merge: true });
			// Aviso no topo (funciona também na web, onde o Alert do sistema não aparece) e fecha o formulário.
			showGlobalNotification(isEditing ? 'Produto atualizado' : 'Produto cadastrado no catálogo');
			setIsSaving(false);
			closeModal();
			return;
		} catch (error) {
			console.error('Não foi possível salvar o produto no Firebase.', error);
			showGlobalNotification(error?.message === 'image-too-large'
				? 'Foto grande demais. Escolha uma foto menor.'
				: 'Não foi possível salvar o produto. Confira sua conexão e suas permissões.');
		} finally {
			setIsSaving(false);
		}
	}

	// O cabeçalho verde fica visível em cima e a barra inferior embaixo; a folha ocupa o meio.
	const modalInsets = {
		paddingTop: insets.top + 72,
		paddingBottom: insets.bottom + ADMIN_THEME.layout.bottomBarHeight,
	};
	const sheetMaxHeight = Math.max(320, Math.min(windowHeight * 0.7, windowHeight - modalInsets.paddingTop - modalInsets.paddingBottom - 12));
	const sheetTranslateY = sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [sheetMaxHeight + 24, 0] });

	return (
		<>
			{visible ? (
				<View style={presentation === 'screen' ? styles.screenRoot : styles.modalOverlay} pointerEvents={presentation === 'screen' ? 'auto' : 'box-none'}>
					{presentation === 'screen' ? (
						<View style={styles.screenSpacer} pointerEvents="none" />
					) : (
						<Animated.View style={[styles.backdrop, { top: 0, bottom: 0, opacity: sheetProgress }]}>
							<Pressable style={StyleSheet.absoluteFill} onPress={closeModal} disabled={isSaving} accessibilityLabel="Fechar formulário" />
						</Animated.View>
					)}
					{/* A folha sobe de trás da barra inferior: o recorte termina onde a barra começa. */}
					<View style={isSheet ? [styles.sheetClip, { bottom: modalInsets.paddingBottom }] : styles.screenFormWrap} pointerEvents="box-none">
					<Animated.View style={isSheet ? [StyleSheet.absoluteFill, { transform: [{ translateY: sheetTranslateY }] }] : styles.screenFormCard} pointerEvents="box-none">
					<KeyboardAvoidingView
						style={presentation === 'screen' ? styles.screenFormCard : [styles.modalContentWrap, { height: sheetMaxHeight, bottom: 0 }]}
						behavior="padding"
					>
						<View style={[styles.formCard, presentation === 'screen' ? styles.screenFormCard : { height: sheetMaxHeight }]}>
						<View style={styles.dragHandle} />
						<View style={styles.formHeader}>
							<TouchableOpacity style={styles.closeButton} onPress={closeModal} activeOpacity={0.7} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Fechar formulário">
								<Feather name="x" size={18} color={tc(C.white)} />
							</TouchableOpacity>
							<Text style={styles.formTitle}>{isEditing ? 'Editar Produto' : 'Criar Produto'}</Text>
							<View style={styles.headerActionSpacer} />
						</View>
						{!fontsLoaded && !fontError ? (
							<View style={styles.loading}><ActivityIndicator size="large" color={tc(C.adminPrimary)} /><Text style={styles.loadingText}>Carregando formulário...</Text></View>
						) : isLoadingProduct ? (
							<View style={styles.loading}><ActivityIndicator size="large" color={tc(C.adminPrimary)} /><Text style={styles.loadingText}>Carregando produto...</Text></View>
						) : loadError ? (
							<View style={styles.loadError}>
								<Feather name="alert-circle" size={36} color={tc(C.red)} />
								<Text style={styles.errorText}>{loadError}</Text>
								<TouchableOpacity style={styles.secondaryButton} onPress={closeModal} activeOpacity={0.7}>
									<Text style={styles.secondaryButtonText}>Fechar</Text>
								</TouchableOpacity>
							</View>
						) : (
							<>
								<ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
									<FormField label="Produto:">
										<TextInput style={[styles.input, styles.productInput]} value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Digite o nome do produto" placeholderTextColor={tc(C.muted)} returnKeyType="next" autoCapitalize="characters" />
									</FormField>
										<FormField label="Descrição">
											<TextInput style={[styles.input, styles.descriptionInput]} value={form.description} onChangeText={(value) => updateField('description', value)} placeholder="Digite a descrição do produto" placeholderTextColor={tc(C.muted)} multiline textAlignVertical="top" />
										</FormField>
										<FormField label="Código de barras:">
											<View style={styles.barcodeRow}>
												<TextInput
													style={[styles.input, styles.barcodeInput]}
													value={form.barcode}
													onChangeText={(value) => updateField('barcode', value.replace(/\D/g, ''))}
													onEndEditing={() => fillFromBarcode(form.barcode)}
													placeholder="Ex.: 7894900011517"
													placeholderTextColor={tc(C.muted)}
													keyboardType="number-pad"
													maxLength={14}
													accessibilityLabel="Código de barras"
												/>
												<TouchableOpacity style={styles.scanButton} onPress={openBarcodeScanner} disabled={isLookingUp} accessibilityRole="button" accessibilityLabel="Ler código de barras com a câmera">
													{isLookingUp ? <ActivityIndicator color={tc(C.white)} /> : <Feather name="maximize" size={20} color={tc(C.white)} />}
												</TouchableOpacity>
											</View>
										</FormField>

									<View style={styles.fieldRow}>
										<FormField label="Preço Venda:" style={styles.thirdField}>
											<TextInput style={styles.input} value={form.pricePerKg} onChangeText={(value) => updateField('pricePerKg', value)} placeholder="Ex.: R$ 50,00" placeholderTextColor={tc(C.muted)} keyboardType="decimal-pad" />
										</FormField>
										<FormField label="Preço Normal:" style={styles.thirdField}>
											<TextInput style={styles.input} value={form.originalPricePerKg} onChangeText={(value) => updateField('originalPricePerKg', value)} placeholder="Ex.: R$ 50,00" placeholderTextColor={tc(C.muted)} keyboardType="decimal-pad" />
										</FormField>
										<FormField label="Desconto:" style={styles.thirdField}>
											<SelectField
												value={form.discountPercent ? `${form.discountPercent}%` : '0%'}
												options={['0%', '5%', '10%', '15%', '20%', '25%', '30%', '40%', '50%']}
												open={openSelect === 'discount'}
												onToggle={() => setOpenSelect(openSelect === 'discount' ? null : 'discount')}
												onSelect={(value) => { updateField('discountPercent', value.replace('%', '')); setOpenSelect(null); }}
											/>
										</FormField>
									</View>

									<View style={styles.fieldRow}>
										<FormField label="Categoria:" style={styles.halfField}>
											<SelectField value={form.category === 'HortiFruti' ? 'Frutas' : form.category} options={CATEGORIES.map((category) => category === 'HortiFruti' ? 'Frutas' : category)} open={openSelect === 'category'} onToggle={() => setOpenSelect(openSelect === 'category' ? null : 'category')} onSelect={(value) => { updateField('category', value === 'Frutas' ? 'HortiFruti' : value); setOpenSelect(null); }} />
										</FormField>
										{form.unitBase === 'un' ? (
											<FormField label="Embalagem:" style={styles.halfField}>
												<TextInput style={styles.input} value={form.unit} onChangeText={(value) => updateField('unit', value)} placeholder="Ex.: 2 L, 500g" placeholderTextColor={tc(C.muted)} />
											</FormField>
										) : (
										<FormField label="Peso:" style={styles.halfField}>
											<SelectField value={`${form.defaultWeightGrams} g`} options={[100, 250, 300, 500, 600, 1000, 1500, 2000].map((weight) => `${weight} g`)} open={openSelect === 'weight'} onToggle={() => setOpenSelect(openSelect === 'weight' ? null : 'weight')} onSelect={(value) => { updateField('defaultWeightGrams', value.replace(' g', '')); setOpenSelect(null); }} />
										</FormField>
										)}
									</View>

									<FormField label="Validade:">
										<View style={styles.barcodeRow}>
											<TextInput
												style={[styles.input, styles.barcodeInput]}
												value={form.expiresAt}
												onChangeText={(value) => updateField('expiresAt', maskExpiryInput(value))}
												placeholder="dd/mm/aaaa (opcional)"
												placeholderTextColor={tc(C.muted)}
												keyboardType="number-pad"
												maxLength={10}
												accessibilityLabel="Data de validade"
											/>
											{form.expiresAt ? (
												<TouchableOpacity style={styles.clearExpiry} onPress={() => updateField('expiresAt', '')} accessibilityRole="button" accessibilityLabel="Tirar a validade">
													<Feather name="x" size={18} color={tc('#7A7A7A')} />
												</TouchableOpacity>
											) : null}
										</View>
									</FormField>

									<View style={styles.fieldRow}>
										<FormField label="Estoque Inicial:" style={styles.thirdField}>
											<SelectField value={form.stockCurrent === '0' ? '' : form.stockCurrent} options={['0', '5', '10', '20', '50', '100']} open={openSelect === 'stockCurrent'} onToggle={() => setOpenSelect(openSelect === 'stockCurrent' ? null : 'stockCurrent')} onSelect={(value) => { updateField('stockCurrent', value); setOpenSelect(null); }} />
										</FormField>
										<FormField label="Estoque Mínimo:" style={styles.thirdField}>
											<SelectField value={form.stockMinimum === '0' ? '' : form.stockMinimum} options={['0', '5', '10', '20', '50', '100']} open={openSelect === 'stockMinimum'} onToggle={() => setOpenSelect(openSelect === 'stockMinimum' ? null : 'stockMinimum')} onSelect={(value) => { updateField('stockMinimum', value); setOpenSelect(null); }} />
										</FormField>
										<FormField label="Estoque Abaixo:" style={styles.thirdField}>
											<SelectField value={form.stockCritical === '0' ? '' : form.stockCritical} options={['0', '5', '10', '20', '50', '100']} open={openSelect === 'stockCritical'} onToggle={() => setOpenSelect(openSelect === 'stockCritical' ? null : 'stockCritical')} onSelect={(value) => { updateField('stockCritical', value); setOpenSelect(null); }} />
										</FormField>
									</View>
									<View style={styles.imageRow}>
										<TouchableOpacity style={styles.addPhotoButton} onPress={chooseImage} activeOpacity={0.7} accessibilityRole="button">
											<Feather name="plus" size={24} color={tc('#7A7A7A')} />
											<Text style={styles.addPhotoText}>Adicionar{"\n"}Foto</Text>
										</TouchableOpacity>
										{Array.from({ length: 3 }, (_, index) => form.images[index] || null).map((image, index) => (
											<View key={`photo-slot-${index}`} style={styles.thumbnailWrap}>
												{image ? (
													<>
														<Image source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
														<TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Remover foto">
															<Feather name="x" size={10} color={tc('#333333')} />
														</TouchableOpacity>
													</>
												) : null}
											</View>
										))}
									</View>

								</ScrollView>

								<View style={styles.footer}>
									<TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={saveProduct} activeOpacity={0.7} disabled={isSaving} accessibilityRole="button">
										{isSaving ? <ActivityIndicator size="small" color={tc(C.white)} /> : null}
										<Text style={styles.saveButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.cancelButton} onPress={closeModal} activeOpacity={0.7} disabled={isSaving} accessibilityRole="button">
										<Text style={styles.saveButtonText}>Cancelar</Text>
									</TouchableOpacity>
								</View>
							</>
						)}
						</View>
					</KeyboardAvoidingView>
					</Animated.View>
					</View>
				</View>
			) : null}

			<Modal visible={isScannerVisible} animationType="slide" onRequestClose={() => setIsScannerVisible(false)}>
				<SafeAreaView style={styles.scannerRoot} edges={['top', 'bottom']}>
					<StatusBar barStyle="light-content" backgroundColor={C.adminHeaderBg} />
					<View style={styles.scannerHeader}>
						<Text style={styles.scannerTitle}>Ler código do produto</Text>
						<TouchableOpacity onPress={() => setIsScannerVisible(false)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Fechar leitor">
							<Feather name="x" size={25} color={tc(C.white)} />
						</TouchableOpacity>
					</View>
					{scannerPermissionGranted ? (
						<CameraSegura
							active={isScannerVisible}
							style={styles.camera}
							facing="back"
							barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
							onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
						/>
					) : (
						<View style={styles.cameraFallback}><Text style={styles.cameraFallbackText}>Permissão da câmera necessária para ler o código.</Text></View>
					)}
					<Text style={styles.scannerHint}>Aponte a câmera para um QR Code ou código de barras.</Text>
				</SafeAreaView>
			</Modal>
		</>
	);
}

function FormField({ label, children, style }) {
	return (
		<View style={[styles.field, style]}>
			<Text style={styles.fieldLabel} numberOfLines={1}>{label}</Text>
			{children}
		</View>
	);
}

function SelectField({ value, options, open, onToggle, onSelect }) {
	return (
		<View style={styles.selectWrap}>
			<TouchableOpacity style={styles.selectButton} onPress={onToggle} activeOpacity={0.7} accessibilityRole="button">
				<Text style={styles.selectValue} numberOfLines={1}>{value}</Text>
				<Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={tc('#000000')} />
			</TouchableOpacity>
			{open ? (
				<ScrollView style={styles.selectOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
					{options.map((option) => (
						<TouchableOpacity key={option} style={styles.selectOption} onPress={() => onSelect(option)} activeOpacity={0.7}>
							<Text style={styles.selectOptionText}>{option}</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			) : null}
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	screenRoot: { flex: 1, minHeight: 0, justifyContent: 'flex-end', backgroundColor: '#F0F2F3' },
	screenSpacer: { flex: 0.18, backgroundColor: '#B5B7B9' },
	screenFormWrap: { flex: 0.82, minHeight: 0 },
	screenFormCard: { flex: 1, minHeight: 0 },
	modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
	backdrop: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
	modalContentWrap: { position: 'absolute', left: 0, right: 0, minHeight: 0, justifyContent: 'flex-end' },
	sheetClip: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
	formCard: { width: '100%', minHeight: 0, paddingTop: 0, flexDirection: 'column', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F0F2F3', overflow: 'hidden' },
	dragHandle: { alignSelf: 'center', width: 80, height: 5, marginTop: 20, marginBottom: 14, borderRadius: 3, backgroundColor: '#7A7A7A' },
	formHeader: { minHeight: 46, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
	closeButton: { position: 'absolute', left: 16, top: -22, zIndex: 2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF0000' },
	formTitle: { marginTop: 26, marginBottom: 8, color: '#000000', fontFamily: ADMIN_THEME.fonts.display, fontSize: 26 },
	headerActionSpacer: { width: 28 },
	loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.background },
	loadingText: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 14 },
	loadError: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 },
	errorText: { color: C.ink, fontFamily: ADMIN_THEME.fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
	secondaryButton: { minHeight: 44, minWidth: 120, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.adminPrimary },
	secondaryButtonText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
	formScroll: { flex: 1, minHeight: 0 },
	formContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8 },
	field: { alignSelf: 'stretch', minWidth: 0, marginTop: 0, marginBottom: 20 },
	fieldRow: { width: '100%', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 },
	halfField: { flex: 1, minWidth: 0 },
	thirdField: { flex: 1, minWidth: 0 },
	fieldLabel: { marginBottom: 4, color: '#000000', fontFamily: ADMIN_THEME.fonts.display, fontSize: 14 },
	input: { height: 50, minHeight: 50, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 0, borderColor: 'transparent', backgroundColor: '#FFFFFF', color: '#7A7A7A', fontFamily: ADMIN_THEME.fonts.medium, fontSize: 12 },
	productInput: { height: 40, minHeight: 40 },
	descriptionInput: { height: 60, minHeight: 60, paddingTop: 9 },
	selectWrap: { position: 'relative' },
	selectButton: { height: 50, minHeight: 50, paddingHorizontal: 10, borderRadius: 8, borderWidth: 0, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, backgroundColor: C.white },
	selectValue: { flex: 1, color: '#7A7A7A', fontFamily: ADMIN_THEME.fonts.medium, fontSize: 12 },
	selectOptions: { maxHeight: 120, marginTop: 3, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: C.white },
	selectOption: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E7E5' },
	selectOptionText: { color: C.ink, fontFamily: ADMIN_THEME.fonts.body, fontSize: 12 },
	barcodeRow: { flexDirection: 'row', gap: 8 },
	barcodeInput: { flex: 1, minWidth: 0 },
	clearExpiry: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
	scanButton: { width: 50, height: 50, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
	imageRow: { flexDirection: 'row', flexWrap: 'nowrap', width: '100%', alignItems: 'stretch', gap: 6, marginTop: 6, marginBottom: 10 },
	thumbnailWrap: { position: 'relative', flex: 1, aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
	thumbnail: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#E8EEEB' },
	removeImageButton: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
	addPhotoButton: { flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#DCDCDC' },
	addPhotoText: { color: '#7A7A7A', fontFamily: ADMIN_THEME.fonts.medium, fontSize: 12, lineHeight: 15, textAlign: 'center' },
	footer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 26, borderTopWidth: 0, borderTopColor: '#E2E8F0', flexDirection: 'row', gap: 13, backgroundColor: '#F0F2F3' },
	saveButton: { flex: 1, height: 36, minHeight: 36, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#00B878' },
	cancelButton: { flex: 1, height: 36, minHeight: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF0000' },
	saveButtonText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 16 },
	disabledButton: { opacity: 0.65 },
	scannerRoot: { flex: 1, backgroundColor: '#0A0F0D' },
	scannerHeader: { minHeight: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.adminHeaderBg },
	scannerTitle: { color: C.white, fontFamily: ADMIN_THEME.fonts.display, fontSize: 20 },
	camera: { flex: 1 },
	cameraFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
	cameraFallbackText: { color: C.white, fontFamily: ADMIN_THEME.fonts.body, fontSize: 15, textAlign: 'center' },
	scannerHint: { padding: 18, color: C.white, fontFamily: ADMIN_THEME.fonts.body, fontSize: 14, textAlign: 'center' },
}));
