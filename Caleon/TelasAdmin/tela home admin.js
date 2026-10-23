import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	BackHandler,
	Image,
	KeyboardAvoidingView,
	Modal,
	PanResponder,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getIdTokenResult, signOut } from 'firebase/auth';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../Config/FireBaseConfig';

const COLORS = {
	green: '#1B4B3D',
	mint: '#40B190',
	active: '#076653',
	background: '#E9ECED',
	white: '#FFFFFF',
	black: '#000000',
	muted: '#757575',
	success: '#00AA6A',
	red: '#FE3030',
};

const CATEGORIES = ['Horti-Fruti', 'Carnes', 'Bebidas', 'Laticínios', 'Doces', 'Congelados', 'Higiene', 'Padaria', 'Limpeza'];
const UNITS = ['150g', '300g', '500g', '600g', '1kg', '1,5kg', '2kg', '1L', '2L', 'Unidade', 'Pacote'];
const DISCOUNTS = [0, 5, 10, 15, 20, 25, 30, 40, 50];
const MAX_IMAGES = 5;

function centsFromInput(value) {
	return Number(String(value).replace(/\D/g, '')) || 0;
}

function inputFromCents(value) {
	const cents = String(Math.max(0, Number(value) || 0)).padStart(3, '0');
	return `${cents.slice(0, -2)},${cents.slice(-2)}`;
}

function formatCurrency(cents) {
	return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function SelectField({ label, value, placeholder, options, onChange, compact = false }) {
	const [visible, setVisible] = useState(false);
	return (
		<>
			<View style={[styles.fieldGroup, compact && styles.compactFieldGroup]}>
				<Text style={styles.label}>{label}</Text>
				<TouchableOpacity
					style={[styles.input, styles.selectInput]}
					onPress={() => setVisible(true)}
					accessibilityRole="button"
					accessibilityLabel={`${label}: ${value || placeholder}`}
				>
					<Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholder]}>{value || placeholder}</Text>
					<Feather name="chevron-down" size={16} color={COLORS.black} />
				</TouchableOpacity>
			</View>
			<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
				<View style={styles.dropdownOverlay}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setVisible(false)} accessibilityLabel="Fechar opções" />
					<View style={styles.dropdownPanel}>
						<Text style={styles.dropdownTitle}>{label}</Text>
						<ScrollView style={styles.dropdownOptions}>
							{options.map((option) => (
								<TouchableOpacity
									key={String(option)}
									style={styles.dropdownOption}
									onPress={() => { onChange(option); setVisible(false); }}
									accessibilityRole="button"
									accessibilityState={{ selected: value === option }}
								>
									<Text style={[styles.dropdownOptionText, value === option && styles.dropdownOptionSelected]}>{option}</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
						<TouchableOpacity style={styles.dropdownCancel} onPress={() => setVisible(false)} accessibilityRole="button">
							<Text style={styles.dropdownCancelText}>Fechar</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</>
	);
}

function NumberField({ label, value, onChange, placeholder = '0', compact = false }) {
	return (
		<View style={[styles.fieldGroup, compact && styles.compactFieldGroup]}>
			<Text style={styles.label} numberOfLines={1}>{label}</Text>
			<TextInput
				style={[styles.input, styles.numberInput]}
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				placeholderTextColor="#9B9B9B"
				keyboardType="decimal-pad"
				accessibilityLabel={label}
			/>
		</View>
	);
}

export default function TelaHomeAdmin({ navigation }) {
	const { height: windowHeight } = useWindowDimensions();
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [salePrice, setSalePrice] = useState('');
	const [normalPrice, setNormalPrice] = useState('');
	const [discount, setDiscount] = useState(0);
	const [category, setCategory] = useState('');
	const [unit, setUnit] = useState('');
	const [initialStock, setInitialStock] = useState('');
	const [minimumStock, setMinimumStock] = useState('');
	const [criticalStock, setCriticalStock] = useState('');
	const [images, setImages] = useState([]);
	const [saving, setSaving] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [phase, setPhase] = useState('opening');
	const translateY = useRef(new Animated.Value(windowHeight)).current;
	const backdropOpacity = useRef(new Animated.Value(0)).current;
	const busyRef = useRef(false);
	const dirty = Boolean(name || description || salePrice || normalPrice || category || unit || initialStock || minimumStock || criticalStock || images.length);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
			Animated.timing(backdropOpacity, { toValue: 0.25, duration: 350, useNativeDriver: true }),
		]).start(({ finished }) => {
			if (finished) setPhase('open');
		});
	}, [backdropOpacity, translateY]);

	const dismiss = (changesConfirmed = false) => {
		if (busyRef.current || phase === 'closing') return;
		const close = () => {
			setPhase('closing');
			Animated.parallel([
				Animated.timing(translateY, { toValue: windowHeight, duration: 280, useNativeDriver: true }),
				Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
			]).start(({ finished }) => {
				if (finished) navigation.goBack();
			});
		};

		if (dirty && !changesConfirmed) {
			Alert.alert('Descartar alterações?', 'Os dados preenchidos ainda não foram salvos.', [
				{ text: 'Continuar editando', style: 'cancel' },
				{ text: 'Descartar', style: 'destructive', onPress: close },
			]);
			return;
		}
		close();
	};

	function confirmSignOut() {
		if (busyRef.current || isSigningOut) return;
		Alert.alert(
			'Sair da conta',
			dirty
				? 'Deseja sair da sua conta? Os dados do produto preenchidos serão descartados.'
				: 'Deseja realmente sair da sua conta?',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Sair',
					style: 'destructive',
					onPress: async () => {
						setIsSigningOut(true);
						try {
							await signOut(auth);
							navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
						} catch (error) {
							console.error('Não foi possível sair da conta administrativa.', error);
							Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
						} finally {
							setIsSigningOut(false);
						}
					},
				},
			],
		);
	}

	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			dismiss();
			return true;
		});
		return () => subscription.remove();
	});

	const panResponder = useMemo(() => PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => phase === 'open' && gesture.dy > 7 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
		onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dy > 110 || gesture.vy > 1) {
				dismiss();
				return;
			}
			Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 14 }).start();
		},
		onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 14 }).start(),
	}), [dismiss, phase, translateY]);

	function updateNormalPrice(value) {
		const nextCents = centsFromInput(value);
		setNormalPrice(inputFromCents(nextCents));
		if (discount > 0) setSalePrice(inputFromCents(Math.round(nextCents * (100 - discount) / 100)));
	}

	function updateSalePrice(value) {
		const nextCents = centsFromInput(value);
		setSalePrice(inputFromCents(nextCents));
		const originalCents = centsFromInput(normalPrice);
		if (originalCents > 0) {
			setDiscount(Math.min(100, Math.max(0, Math.round((1 - nextCents / originalCents) * 100))));
		}
	}

	function updateDiscount(value) {
		const nextDiscount = Number(value);
		setDiscount(nextDiscount);
		const originalCents = centsFromInput(normalPrice);
		if (originalCents > 0) setSalePrice(inputFromCents(Math.round(originalCents * (100 - nextDiscount) / 100)));
	}

	async function pickImages() {
		if (images.length >= MAX_IMAGES) {
			Alert.alert('Limite de fotos', `Adicione no máximo ${MAX_IMAGES} fotos por produto.`);
			return;
		}
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert('Permissão necessária', 'Permita o acesso à galeria para selecionar fotos do produto.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsMultipleSelection: true,
			selectionLimit: MAX_IMAGES - images.length,
			orderedSelection: true,
			quality: 0.8,
		});
		if (!result.canceled) {
			const seen = new Set(images.map((image) => image.uri));
			setImages((current) => [...current, ...result.assets.filter((asset) => !seen.has(asset.uri)).map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' }))].slice(0, MAX_IMAGES));
		}
	}

	function validate() {
		const saleCents = centsFromInput(salePrice);
		const normalCents = centsFromInput(normalPrice);
		const opening = Number(initialStock || 0);
		const minimum = Number(minimumStock || 0);
		const critical = Number(criticalStock || 0);
		if (!name.trim()) return 'Informe o nome do produto.';
		if (!category) return 'Selecione uma categoria.';
		if (!unit) return 'Selecione o peso ou unidade de venda.';
		if (saleCents <= 0) return 'Informe um preço de venda maior que zero.';
		if (normalCents > 0 && saleCents > normalCents) return 'O preço de venda não pode ser maior que o preço normal.';
		if ([opening, minimum, critical].some((value) => !Number.isFinite(value) || value < 0)) return 'Os valores de estoque não podem ser negativos.';
		if (critical > minimum) return 'O estoque crítico deve ser menor ou igual ao estoque mínimo.';
		return null;
	}

	async function saveProduct() {
		if (busyRef.current) return;
		const validationError = validate();
		if (validationError) {
			Alert.alert('Revise o cadastro', validationError);
			return;
		}
		const user = auth.currentUser;
		if (!user) {
			Alert.alert('Sessão encerrada', 'Entre novamente com uma conta administrativa.');
			return;
		}
		busyRef.current = true;
		setSaving(true);
		const uploadedFiles = [];
		try {
			const token = await getIdTokenResult(user, true);
			if (token.claims.admin !== true) throw new Error('Somente uma conta autorizada com a permissão administrativa pode cadastrar produtos.');

			const productRef = doc(collection(db, 'products'));
			const imageUrls = [];
			for (let index = 0; index < images.length; index += 1) {
				const image = images[index];
				const fileRef = ref(storage, `products/${productRef.id}/${Date.now()}-${index}.jpg`);
				const response = await fetch(image.uri);
				const blob = await response.blob();
				try {
					await uploadBytes(fileRef, blob, { contentType: image.mimeType });
				} finally {
					if (typeof blob.close === 'function') blob.close();
				}
				uploadedFiles.push(fileRef);
				imageUrls.push(await getDownloadURL(fileRef));
			}

			const saleCents = centsFromInput(salePrice);
			const normalCents = centsFromInput(normalPrice);
			const unitMatch = unit.match(/^(\d+(?:,\d+)?)\s*(kg|g|l)$/i);
			const unitAmount = unitMatch ? Number(unitMatch[1].replace(',', '.')) : 1;
			const unitType = unitMatch ? unitMatch[2].toLowerCase() : 'unit';
			const baseQuantity = unitType === 'kg' || unitType === 'l'
				? unitAmount * 1000
				: unitType === 'g' ? unitAmount : 1000;
			const priceMultiplier = 1000 / baseQuantity;
			const stockBaseUnit = unitType === 'kg' || unitType === 'g' ? 'g' : unitType === 'l' ? 'ml' : 'unit';
			const stockMultiplier = unitType === 'kg' || unitType === 'l'
				? unitAmount * 1000
				: unitType === 'g' ? unitAmount : 1;
			const catalogCategory = category === 'Horti-Fruti' ? 'HortiFruti' : category;
			await setDoc(productRef, {
				name: name.trim(),
				description: description.trim(),
				category: catalogCategory,
				priceCents: saleCents,
				normalPriceCents: normalCents || null,
				discountPercent: discount,
				unit,
				unitBase: stockBaseUnit,
				pricePerKg: Math.round(saleCents * priceMultiplier) / 100,
				originalPricePerKg: normalCents ? Math.round(normalCents * priceMultiplier) / 100 : null,
				averageWeightGrams: stockBaseUnit === 'g' ? Math.round(baseQuantity) : null,
				availableWeights: [Math.round(baseQuantity)],
				defaultWeightGrams: Math.round(baseQuantity),
				stockInitial: Math.round(Number(initialStock || 0) * stockMultiplier),
				stockCurrent: Math.round(Number(initialStock || 0) * stockMultiplier),
				stockMinimum: Math.round(Number(minimumStock || 0) * stockMultiplier),
				stockCritical: Math.round(Number(criticalStock || 0) * stockMultiplier),
				imageUrls,
				imageUrl: imageUrls[0] || null,
				active: true,
				createdBy: user.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
			Alert.alert('Produto salvo', 'O Firestore confirmou o cadastro do produto.');
			busyRef.current = false;
			setSaving(false);
			setName('');
			setDescription('');
			setSalePrice('');
			setNormalPrice('');
			setDiscount(0);
			setCategory('');
			setUnit('');
			setInitialStock('');
			setMinimumStock('');
			setCriticalStock('');
			setImages([]);
			dismiss(true);
		} catch (error) {
			await Promise.all(uploadedFiles.map((fileRef) => deleteObject(fileRef).catch(() => null)));
			console.error('Não foi possível salvar o produto.', error);
			const message = error.code === 'permission-denied'
				? 'A conta não tem permissão nas regras do Firebase para cadastrar produtos.'
				: error.message?.includes('permissão administrativa')
					? error.message
					: 'Não foi possível salvar o produto. Confira sua conexão e a configuração do Firestore/Storage.';
			Alert.alert('Falha ao salvar', message);
		} finally {
			busyRef.current = false;
			setSaving(false);
		}
	}

	if (!fontsLoaded) return null;

	return (
		<View style={styles.overlay}>
			<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} accessibilityLabel="Fechar formulário" />
			<Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
			<KeyboardAvoidingView style={styles.sheetHost} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<Animated.View style={[styles.sheet, { maxHeight: windowHeight * 0.82, transform: [{ translateY }] }]}>
					<View {...panResponder.panHandlers} style={styles.sheetHeader}>
						<CircularIconButton
							style={styles.closeButton}
							icon={<Feather name="x" size={21} color={COLORS.white} />}
							onPress={dismiss}
							accessibilityLabel="Fechar formulário"
						/>
						<View style={styles.grabHandle} />
						<Text style={styles.title}>Criar Produto</Text>
						<CircularIconButton
							style={[styles.logoutButton, isSigningOut && styles.disabledButton]}
							icon={isSigningOut
								? <ActivityIndicator color={COLORS.white} size="small" />
								: <Ionicons name="exit-outline" size={24} color={COLORS.white} />}
							onPress={confirmSignOut}
							disabled={isSigningOut || saving}
							accessibilityLabel="Sair da conta"
						/>
					</View>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.formContent}
					>
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Produto:</Text>
							<TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome do Produto" placeholderTextColor="#9B9B9B" maxLength={80} />
						</View>
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Descrição</Text>
							<TextInput style={[styles.input, styles.description]} value={description} onChangeText={setDescription} placeholder="Descrição do Produto" placeholderTextColor="#9B9B9B" multiline maxLength={500} />
						</View>
						<View style={styles.row}>
							<NumberField label="Preço Venda:" value={salePrice} onChange={updateSalePrice} compact />
							<NumberField label="Preço Normal:" value={normalPrice} onChange={updateNormalPrice} compact />
							<SelectField label="Desconto:" value={`${discount}%`} placeholder="0%" options={DISCOUNTS.map((value) => `${value}%`)} onChange={(value) => updateDiscount(value.replace('%', ''))} compact />
						</View>
						<Text style={styles.priceHint}>Venda atual: {salePrice ? formatCurrency(centsFromInput(salePrice)) : 'R$ 0,00'}</Text>
						<View style={styles.row}>
							<SelectField label="Categoria:" value={category} placeholder="Selecionar" options={CATEGORIES} onChange={setCategory} />
							<SelectField label="Peso / unidade:" value={unit} placeholder="Selecionar" options={UNITS} onChange={setUnit} />
						</View>
						<View style={styles.row}>
							<NumberField label="Estoque Inicial:" value={initialStock} onChange={setInitialStock} compact />
							<NumberField label="Estoque Mínimo:" value={minimumStock} onChange={setMinimumStock} compact />
							<NumberField label="Estoque Abaixo:" value={criticalStock} onChange={setCriticalStock} compact />
						</View>
						<Text style={styles.stockHint}>Estoque armazenado em gramas, mililitros ou unidades conforme a venda.</Text>
						<View style={styles.photoSection}>
							<Text style={styles.label}>Fotos do produto</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
								{images.map((image, index) => (
									<View key={`${image.uri}-${index}`} style={styles.thumbnailWrap}>
										<Image source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
										<TouchableOpacity style={styles.removeImage} onPress={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} accessibilityRole="button" accessibilityLabel={`Remover foto ${index + 1}`}>
											<Feather name="x" size={13} color={COLORS.black} />
										</TouchableOpacity>
									</View>
								))}
								{images.length < MAX_IMAGES && (
									<TouchableOpacity style={styles.addPhoto} onPress={pickImages} accessibilityRole="button" accessibilityLabel="Adicionar fotos">
										<Feather name="plus" size={29} color={COLORS.muted} />
										<Text style={styles.addPhotoText}>Adicionar Foto</Text>
									</TouchableOpacity>
								)}
							</ScrollView>
						</View>
						<View style={styles.actions}>
							<TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={dismiss} disabled={saving} accessibilityRole="button">
								<Text style={styles.actionText}>Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.actionButton, styles.saveButton, saving && styles.disabledButton]} onPress={saveProduct} disabled={saving} accessibilityRole="button">
								{saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.actionText}>Salvar</Text>}
							</TouchableOpacity>
						</View>
					</ScrollView>
				</Animated.View>
			</KeyboardAvoidingView>
			<SafeAreaScreen pointerEvents="none" style={styles.footerClearance} edges={['bottom']} />
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
	backdrop: { ...StyleSheet.absoluteFillObject, bottom: 76, backgroundColor: '#000000' },
	sheetHost: { flex: 1, justifyContent: 'flex-end', paddingBottom: 76 },
	sheet: { width: '100%', backgroundColor: COLORS.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
	sheetHeader: { minHeight: 72, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
	grabHandle: { position: 'absolute', top: 10, width: 81, height: 6, borderRadius: 4, backgroundColor: COLORS.muted },
	closeButton: { position: 'absolute', left: 16, bottom: 6, zIndex: 1 },
	title: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 24, textAlign: 'center' },
	logoutButton: { position: 'absolute', right: 16, bottom: 6, zIndex: 1 },
	formContent: { paddingHorizontal: 16, paddingBottom: 18, gap: 10 },
	fieldGroup: { flex: 1, minWidth: 0 },
	compactFieldGroup: { flex: 1 },
	label: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 14, marginBottom: 4 },
	input: { minHeight: 40, paddingHorizontal: 11, borderRadius: 6, backgroundColor: COLORS.white, color: COLORS.black, fontSize: 13 },
	description: { height: 60, paddingTop: 9, textAlignVertical: 'top' },
	row: { flexDirection: 'row', gap: 8 },
	numberInput: { minHeight: 50, paddingHorizontal: 7, textAlign: 'center' },
	selectInput: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
	selectText: { flex: 1, color: COLORS.black, fontSize: 11, marginRight: 3 },
	placeholder: { color: '#9B9B9B' },
	dropdownOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.35)' },
	dropdownPanel: { maxHeight: '75%', borderRadius: 12, padding: 16, backgroundColor: COLORS.white },
	dropdownTitle: { color: COLORS.black, fontFamily: 'LilitaOne_400Regular', fontSize: 20, marginBottom: 8 },
	dropdownOptions: { flexGrow: 0 },
	dropdownOption: { minHeight: 44, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E7E8' },
	dropdownOptionText: { color: COLORS.black, fontSize: 15 },
	dropdownOptionSelected: { color: COLORS.active, fontFamily: 'LilitaOne_400Regular' },
	dropdownCancel: { alignItems: 'center', paddingTop: 12 },
	dropdownCancelText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
	priceHint: { marginTop: -7, color: COLORS.muted, fontSize: 10, textAlign: 'right' },
	stockHint: { marginTop: -6, color: COLORS.muted, fontSize: 10 },
	photoSection: { gap: 4 },
	photoRow: { gap: 8, paddingVertical: 2 },
	thumbnailWrap: { width: 89, height: 92, position: 'relative' },
	thumbnail: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#D9D9D9' },
	removeImage: { position: 'absolute', top: 4, right: 4, width: 21, height: 21, borderRadius: 11, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
	addPhoto: { width: 90, height: 92, borderRadius: 8, backgroundColor: '#D9D9D9', alignItems: 'center', justifyContent: 'center', gap: 2 },
	addPhotoText: { color: COLORS.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 10 },
	actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 2 },
	actionButton: { flex: 1, height: 38, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
	cancelButton: { backgroundColor: '#FF0000' },
	saveButton: { backgroundColor: COLORS.success },
	disabledButton: { opacity: 0.65 },
	actionText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
	footerClearance: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});