import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import CircularIconButton from './CircularIconButton';
import ModalSobe from './ModalSobe';
import AjusteImagem from './AjusteImagem';
import { showGlobalNotification } from './NotificacaoGlobal';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { PRODUCT_CATEGORIES } from '../Config/Produtos';
import { toCompressedDataUrl } from '../Config/ImagemFirestore';
import {
	BANNER_TARGETS,
	createBanner,
	deleteBanner,
	subscribeBanners,
	swapBannerOrder,
	updateBanner,
} from '../Config/Banners';
import { themedStyles, tc } from '../Config/Tema';

const C = ADMIN_THEME.colors;
const F = ADMIN_THEME.fonts;

function targetLabel(banner) {
	if (banner.target === 'ofertas') return 'Abre as ofertas';
	if (banner.target === 'categoria' || banner.categoryId) return `Abre ${banner.categoryId || 'uma categoria'}`;
	return 'Só imagem';
}

function friendlyError(error) {
	if (error?.message === 'image-too-large') return 'Imagem grande demais. Escolha uma imagem menor.';
	if (error?.code === 'permission-denied') return 'Só administradores podem alterar o carrossel.';
	return 'Não foi possível salvar. Confira sua conexão e tente de novo.';
}

async function pickBannerImage() {
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!permission.granted) {
		showGlobalNotification('Permita o acesso à galeria para escolher a imagem do banner.');
		return null;
	}
	const result = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ['images'],
		quality: 1,
	});
	if (result.canceled) return null;
	return result.assets?.[0]?.uri || null;
}

const EMPTY_DRAFT = { uri: null, title: '', target: 'ofertas', categoryId: PRODUCT_CATEGORIES[0] };

/**
 * Carrossel da Home: o admin adiciona, pausa, reordena, troca a imagem e exclui os banners
 * de promoção que os clientes veem no topo da tela inicial.
 */
export default function CarrosselModal({ visible, onClose }) {
	const [banners, setBanners] = useState([]);
	const [loading, setLoading] = useState(true);
	const [draft, setDraft] = useState(null);
	const [busyId, setBusyId] = useState(null);
	// Foto aguardando ajuste: { uri, onDone(uriAjustada) }
	const [adjust, setAdjust] = useState(null);

	useEffect(() => {
		if (!visible) return undefined;
		setLoading(true);
		return subscribeBanners((list) => {
			setBanners(list);
			setLoading(false);
		}, (error) => {
			console.error('Não foi possível carregar os banners.', error);
			setLoading(false);
		});
	}, [visible]);

	useEffect(() => {
		if (!visible) setDraft(null);
	}, [visible]);

	const activeCount = banners.filter((banner) => banner.ativo !== false).length;

	async function run(id, task, success) {
		setBusyId(id);
		try {
			await task();
			if (success) showGlobalNotification(success);
		} catch (error) {
			console.error('Carrossel da Home:', error);
			showGlobalNotification(friendlyError(error));
		} finally {
			setBusyId(null);
		}
	}

	async function startNew() {
		const uri = await pickBannerImage();
		if (uri) setAdjust({ uri, onDone: (cropped) => setDraft({ ...EMPTY_DRAFT, uri: cropped }) });
	}

	// Reajustar a foto do novo banner antes de publicar.
	function readjustDraft() {
		if (draft?.uri) setAdjust({ uri: draft.uri, onDone: (cropped) => setDraft((current) => ({ ...current, uri: cropped })) });
	}

	function saveDraft() {
		if (!draft?.uri) return;
		run('novo', async () => {
			const imageUrl = await toCompressedDataUrl(draft.uri, { maxSize: 1200, quality: 0.7 });
			await createBanner({ ...draft, imageUrl, title: draft.title.trim() }, banners);
			setDraft(null);
		}, 'Banner adicionado ao carrossel');
	}

	async function replaceImage(banner) {
		const uri = await pickBannerImage();
		if (!uri) return;
		setAdjust({ uri, onDone: (cropped) => saveBannerImage(banner, cropped) });
	}

	function saveBannerImage(banner, uri) {
		run(banner.id, async () => {
			const imageUrl = await toCompressedDataUrl(uri, { maxSize: 1200, quality: 0.7 });
			await updateBanner(banner.id, { imageUrl });
		}, 'Imagem do banner atualizada');
	}

	function confirmDelete(banner) {
		Alert.alert(
			'Excluir banner',
			`Tirar "${banner.title || 'este banner'}" do carrossel? Isso não pode ser desfeito.`,
			[
				{ text: 'Cancelar', style: 'cancel' },
				{ text: 'Excluir', style: 'destructive', onPress: () => run(banner.id, () => deleteBanner(banner.id), 'Banner excluído') },
			],
		);
	}

	return (
		<>
		<AjusteImagem
			visible={Boolean(adjust)}
			uri={adjust?.uri}
			aspect={3}
			shape="rect"
			outputWidth={1200}
			title="Ajustar banner"
			onCancel={() => setAdjust(null)}
			onConfirm={(cropped) => {
				const done = adjust?.onDone;
				setAdjust(null);
				done?.(cropped);
			}}
		/>
		<ModalSobe visible={visible} onRequestClose={onClose} backdropColor="rgba(0, 0, 0, 0.4)">
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Fechar carrossel" />
				<View style={styles.dialog}>
					<View style={styles.header}>
						<CircularIconButton
							size={30}
							borderRadius={10}
							backgroundColor={C.red}
							icon={<Feather name="x" size={17} color={tc(C.white)} />}
							onPress={onClose}
							accessibilityLabel="Fechar carrossel"
						/>
						<Text style={styles.title}>Carrossel da Home</Text>
						<View style={styles.headerSpacer} />
					</View>

					<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
						<View style={styles.info}>
							<Feather name="info" size={16} color={tc(C.green)} />
							<Text style={styles.infoText}>
								{activeCount
									? `${activeCount} ${activeCount === 1 ? 'banner aparece' : 'banners aparecem'} no topo da tela inicial dos clientes.`
									: 'Nenhum banner ativo: os clientes veem as ofertas automáticas do catálogo.'}
							</Text>
						</View>

						{draft ? (
							<View style={styles.draft}>
								<Text style={styles.label}>Novo banner</Text>
								<TouchableOpacity onPress={readjustDraft} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Ajustar a imagem do banner">
									<Image source={{ uri: draft.uri }} style={styles.draftImage} resizeMode="cover" />
									<View style={styles.adjustBadge}>
										<Feather name="crop" size={13} color="#FFFFFF" />
										<Text style={styles.adjustBadgeText}>Ajustar</Text>
									</View>
								</TouchableOpacity>
								<TextInput
									style={styles.input}
									value={draft.title}
									onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
									placeholder="Nome do banner (ex.: Semana do Hortifruti)"
									placeholderTextColor={tc('#A3AAA7')}
									maxLength={60}
									accessibilityLabel="Nome do banner"
								/>
								<Text style={styles.subLabel}>Ao tocar no banner</Text>
								<View style={styles.chips}>
									{BANNER_TARGETS.map((target) => {
										const selected = draft.target === target.key;
										return (
											<TouchableOpacity
												key={target.key}
												style={[styles.chip, selected && styles.chipSelected]}
												onPress={() => setDraft((current) => ({ ...current, target: target.key }))}
												accessibilityRole="radio"
												accessibilityState={{ selected }}
											>
												<Text style={[styles.chipText, selected && styles.chipTextSelected]}>{target.label}</Text>
											</TouchableOpacity>
										);
									})}
								</View>
								{draft.target === 'categoria' ? (
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
										{PRODUCT_CATEGORIES.map((category) => {
											const selected = draft.categoryId === category;
											return (
												<TouchableOpacity
													key={category}
													style={[styles.chip, selected && styles.chipSelected]}
													onPress={() => setDraft((current) => ({ ...current, categoryId: category }))}
													accessibilityRole="radio"
													accessibilityState={{ selected }}
												>
													<Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								) : null}
								<View style={styles.draftActions}>
									<TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={() => setDraft(null)} disabled={busyId === 'novo'} accessibilityRole="button">
										<Text style={[styles.buttonText, styles.buttonGhostText]}>Cancelar</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={saveDraft} disabled={busyId === 'novo'} accessibilityRole="button">
										{busyId === 'novo' ? <ActivityIndicator color={tc(C.white)} /> : <Feather name="check" size={18} color={tc(C.white)} />}
										<Text style={styles.buttonText}>{busyId === 'novo' ? 'Salvando...' : 'Publicar'}</Text>
									</TouchableOpacity>
								</View>
							</View>
						) : (
							<TouchableOpacity style={styles.addButton} onPress={startNew} accessibilityRole="button" accessibilityLabel="Adicionar banner">
								<Feather name="plus" size={20} color={tc(C.white)} />
								<Text style={styles.addText}>Adicionar banner</Text>
							</TouchableOpacity>
						)}

						<Text style={[styles.label, styles.listLabel]}>Banners ({banners.length})</Text>
						{loading ? <ActivityIndicator style={styles.loading} color={tc(C.green)} /> : null}
						{!loading && banners.length === 0 ? (
							<Text style={styles.empty}>Nenhum banner cadastrado ainda.</Text>
						) : null}
						{banners.map((banner, index) => {
							const active = banner.ativo !== false;
							const busy = busyId === banner.id;
							return (
								<View key={banner.id} style={[styles.bannerCard, !active && styles.bannerPaused]}>
									<TouchableOpacity onPress={() => replaceImage(banner)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Trocar imagem de ${banner.title || 'banner'}`}>
										{banner.imageUrl ? <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} resizeMode="cover" /> : <View style={styles.bannerImage} />}
										<View style={styles.imageBadge}>
											{busy ? <ActivityIndicator size="small" color={tc(C.white)} /> : <Feather name="image" size={13} color={tc(C.white)} />}
										</View>
									</TouchableOpacity>
									<View style={styles.bannerRow}>
										<View style={styles.flex}>
											<Text style={styles.bannerTitle} numberOfLines={1}>{banner.title || `Banner ${index + 1}`}</Text>
											<Text style={styles.bannerMeta} numberOfLines={1}>{active ? 'Aparecendo' : 'Pausado'} • {targetLabel(banner)}</Text>
										</View>
										<Switch
											value={active}
											onValueChange={(value) => run(banner.id, () => updateBanner(banner.id, { ativo: value }), value ? 'Banner ativado' : 'Banner pausado')}
											trackColor={{ false: '#C9D2CE', true: C.mint }}
											thumbColor={C.white}
											accessibilityLabel={active ? 'Pausar banner' : 'Ativar banner'}
										/>
									</View>
									<View style={styles.bannerActions}>
										<TouchableOpacity style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]} onPress={() => run(banner.id, () => swapBannerOrder(banners, index, -1))} disabled={index === 0 || busy} accessibilityRole="button" accessibilityLabel="Mover para antes">
											<Feather name="arrow-up" size={18} color={tc(C.green)} />
										</TouchableOpacity>
										<TouchableOpacity style={[styles.iconButton, index === banners.length - 1 && styles.iconButtonDisabled]} onPress={() => run(banner.id, () => swapBannerOrder(banners, index, 1))} disabled={index === banners.length - 1 || busy} accessibilityRole="button" accessibilityLabel="Mover para depois">
											<Feather name="arrow-down" size={18} color={tc(C.green)} />
										</TouchableOpacity>
										<TouchableOpacity style={styles.iconButton} onPress={() => replaceImage(banner)} disabled={busy} accessibilityRole="button" accessibilityLabel="Trocar imagem">
											<Feather name="edit-2" size={17} color={tc(C.green)} />
										</TouchableOpacity>
										<View style={styles.flex} />
										<TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={() => confirmDelete(banner)} disabled={busy} accessibilityRole="button" accessibilityLabel="Excluir banner">
											<Feather name="trash-2" size={17} color={tc(C.red)} />
										</TouchableOpacity>
									</View>
								</View>
							);
						})}
					</ScrollView>
				</View>
			</View>
		</ModalSobe>
		</>
	);
}

const styles = themedStyles(StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
	dialog: { width: '100%', maxWidth: 460, maxHeight: '88%', padding: 18, borderRadius: 18, backgroundColor: C.white, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerSpacer: { width: 30 },
	title: { color: '#111715', fontFamily: F.display, fontSize: 24 },
	content: { paddingTop: 14, paddingBottom: 4 },
	info: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#D8F6E9' },
	infoText: { flex: 1, color: C.ink, fontFamily: F.medium, fontSize: 12, lineHeight: 17 },
	label: { color: C.ink, fontFamily: F.bold, fontSize: 15 },
	subLabel: { marginTop: 12, color: C.muted, fontFamily: F.bold, fontSize: 12 },
	listLabel: { marginTop: 20 },
	addButton: { minHeight: 52, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: C.green },
	addText: { color: C.white, fontFamily: F.bold, fontSize: 15 },
	draft: { marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.mint, backgroundColor: '#F2FBF7' },
	adjustBadge: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(27, 75, 61, 0.9)' },
	adjustBadgeText: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 11 },
	draftImage: { width: '100%', aspectRatio: 3, marginTop: 10, borderRadius: 12, backgroundColor: '#E8ECEA' },
	input: { height: 48, marginTop: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDE5E1', backgroundColor: C.white, color: C.ink, fontFamily: F.medium, fontSize: 14 },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
	chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: '#DDE5E1', backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
	chipSelected: { borderColor: C.green, backgroundColor: C.green },
	chipText: { color: C.ink, fontFamily: F.bold, fontSize: 12 },
	chipTextSelected: { color: C.white },
	draftActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
	button: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12 },
	buttonPrimary: { backgroundColor: C.green },
	buttonGhost: { backgroundColor: C.white, borderWidth: 1, borderColor: '#DDE5E1' },
	buttonText: { color: C.white, fontFamily: F.bold, fontSize: 14 },
	buttonGhostText: { color: C.ink },
	loading: { marginTop: 12 },
	empty: { marginTop: 10, color: C.muted, fontFamily: F.body, fontSize: 13 },
	bannerCard: { marginTop: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: '#DDE5E1', backgroundColor: C.white },
	bannerPaused: { opacity: 0.6 },
	bannerImage: { width: '100%', aspectRatio: 3, borderRadius: 10, backgroundColor: '#E8ECEA' },
	imageBadge: { position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(27, 75, 61, 0.85)', alignItems: 'center', justifyContent: 'center' },
	bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
	bannerTitle: { color: C.ink, fontFamily: F.bold, fontSize: 14 },
	bannerMeta: { color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 2 },
	bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
	iconButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
	iconButtonDisabled: { opacity: 0.35 },
	deleteButton: { backgroundColor: '#FFF0F0' },
}));
