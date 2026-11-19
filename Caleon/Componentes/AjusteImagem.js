import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

// Tela para ajustar uma foto antes de salvar: arrastar para posicionar e dar zoom
// (dois dedos ou botões + e −). O molde é redondo (foto de perfil) ou retangular (banner).
// Funciona igual no Android, no iPhone e na web.

let Manipulator = null;
try {
	// eslint-disable-next-line global-require
	Manipulator = require('expo-image-manipulator');
} catch {
	Manipulator = null;
}

const MAX_ZOOM = 4;
const GREEN = '#1B4B3D';
const MINT = '#40B190';

function distance(touches) {
	const [a, b] = touches;
	return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * Abre o ajuste de uma imagem.
 * aspect: largura / altura do molde (1 = quadrado/redondo, 3 = banner).
 * shape: 'circle' | 'rect'. outputWidth: largura final em pixels.
 * onConfirm(uriRecortada) / onCancel().
 */
export default function AjusteImagem({ visible, uri, aspect = 1, shape = 'rect', outputWidth = 1080, title = 'Ajustar imagem', onConfirm, onCancel }) {
	const { width: screenWidth } = useWindowDimensions();
	const frameWidth = Math.min(screenWidth - 40, aspect > 1 ? 420 : 320);
	const frameHeight = frameWidth / aspect;
	const [size, setSize] = useState(null);
	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [saving, setSaving] = useState(false);
	const gesture = useRef({ startOffset: { x: 0, y: 0 }, startZoom: 1, startDistance: 0 });
	const stateRef = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
	stateRef.current = { zoom, offset };

	useEffect(() => {
		if (!visible || !uri) return;
		setSize(null);
		setZoom(1);
		setOffset({ x: 0, y: 0 });
		setSaving(false);
		Image.getSize(uri, (width, height) => setSize({ width, height }), () => setSize({ width: frameWidth, height: frameHeight }));
	}, [visible, uri, frameWidth, frameHeight]);

	// Escala mínima: a imagem sempre cobre o molde inteiro.
	const baseScale = size ? Math.max(frameWidth / size.width, frameHeight / size.height) : 1;

	function clampOffset(next, nextZoom) {
		if (!size) return next;
		const scale = baseScale * nextZoom;
		const maxX = Math.max(0, (size.width * scale - frameWidth) / 2);
		const maxY = Math.max(0, (size.height * scale - frameHeight) / 2);
		return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
	}

	function applyZoom(nextZoom) {
		const clamped = Math.max(1, Math.min(MAX_ZOOM, nextZoom));
		setZoom(clamped);
		setOffset((current) => clampOffset(current, clamped));
	}

	const panResponder = useMemo(() => PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onMoveShouldSetPanResponder: () => true,
		onPanResponderTerminationRequest: () => false,
		onPanResponderGrant: (event) => {
			gesture.current.startOffset = stateRef.current.offset;
			gesture.current.startZoom = stateRef.current.zoom;
			gesture.current.startDistance = event.nativeEvent.touches?.length >= 2 ? distance(event.nativeEvent.touches) : 0;
		},
		onPanResponderMove: (event, g) => {
			const touches = event.nativeEvent.touches || [];
			if (touches.length >= 2) {
				// Pinça: zoom pela distância entre os dedos.
				const current = distance(touches);
				if (!gesture.current.startDistance) {
					gesture.current.startDistance = current;
					gesture.current.startZoom = stateRef.current.zoom;
					return;
				}
				applyZoom(gesture.current.startZoom * (current / gesture.current.startDistance));
				return;
			}
			gesture.current.startDistance = 0;
			setOffset(clampOffset({ x: gesture.current.startOffset.x + g.dx, y: gesture.current.startOffset.y + g.dy }, stateRef.current.zoom));
		},
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}), [size, baseScale, frameWidth, frameHeight]);

	async function confirm() {
		if (!size || saving) return;
		const scale = baseScale * zoom;
		const cropWidth = frameWidth / scale;
		const cropHeight = frameHeight / scale;
		const originX = size.width / 2 - offset.x / scale - cropWidth / 2;
		const originY = size.height / 2 - offset.y / scale - cropHeight / 2;
		const crop = {
			originX: Math.max(0, Math.round(originX)),
			originY: Math.max(0, Math.round(originY)),
			width: Math.min(size.width, Math.round(cropWidth)),
			height: Math.min(size.height, Math.round(cropHeight)),
		};
		crop.width = Math.min(crop.width, size.width - crop.originX);
		crop.height = Math.min(crop.height, size.height - crop.originY);
		if (!Manipulator?.manipulateAsync) {
			onConfirm?.(uri);
			return;
		}
		setSaving(true);
		try {
			const actions = [{ crop }];
			if (crop.width > outputWidth) actions.push({ resize: { width: outputWidth } });
			const result = await Manipulator.manipulateAsync(uri, actions, { compress: 0.9, format: Manipulator.SaveFormat.JPEG });
			onConfirm?.(result.uri);
		} catch (error) {
			console.error('Não foi possível recortar a imagem.', error);
			onConfirm?.(uri);
		} finally {
			setSaving(false);
		}
	}

	const scale = baseScale * zoom;
	const imageStyle = size ? {
		width: size.width * scale,
		height: size.height * scale,
		left: frameWidth / 2 - (size.width * scale) / 2 + offset.x,
		top: frameHeight / 2 - (size.height * scale) / 2 + offset.y,
	} : null;
	const radius = shape === 'circle' ? frameWidth / 2 : 14;

	return (
		<Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
			<View style={styles.overlay}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.hint}>Arraste para posicionar • use dois dedos ou os botões para o zoom</Text>

				<View style={[styles.frame, { width: frameWidth, height: frameHeight, borderRadius: radius }]} {...panResponder.panHandlers}>
					{size ? (
						<Image source={{ uri }} style={[styles.image, imageStyle]} resizeMode="stretch" />
					) : (
						<ActivityIndicator color="#FFFFFF" />
					)}
					<View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.frameBorder, { borderRadius: radius }]} />
				</View>

				<View style={styles.zoomRow}>
					<TouchableOpacity style={styles.zoomButton} onPress={() => applyZoom(zoom - 0.25)} accessibilityRole="button" accessibilityLabel="Diminuir zoom">
						<Feather name="minus" size={20} color="#FFFFFF" />
					</TouchableOpacity>
					<View style={styles.zoomTrack}>
						<View style={[styles.zoomFill, { width: `${((zoom - 1) / (MAX_ZOOM - 1)) * 100}%` }]} />
					</View>
					<TouchableOpacity style={styles.zoomButton} onPress={() => applyZoom(zoom + 0.25)} accessibilityRole="button" accessibilityLabel="Aumentar zoom">
						<Feather name="plus" size={20} color="#FFFFFF" />
					</TouchableOpacity>
					<TouchableOpacity style={styles.zoomButton} onPress={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} accessibilityRole="button" accessibilityLabel="Centralizar">
						<Feather name="maximize" size={18} color="#FFFFFF" />
					</TouchableOpacity>
				</View>

				<View style={styles.actions}>
					<TouchableOpacity style={[styles.action, styles.cancel]} onPress={onCancel} disabled={saving} accessibilityRole="button">
						<Text style={styles.actionText}>Cancelar</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.action, styles.confirm]} onPress={confirm} disabled={saving || !size} accessibilityRole="button">
						{saving ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="check" size={18} color="#FFFFFF" />}
						<Text style={styles.actionText}>{saving ? 'Salvando...' : 'Usar foto'}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(5, 12, 10, 0.94)' },
	title: { color: '#FFFFFF', fontFamily: 'LilitaOne_400Regular', fontSize: 26 },
	hint: { marginTop: 6, marginBottom: 20, color: '#A8E8D1', fontFamily: 'Montserrat_500Medium', fontSize: 12, textAlign: 'center' },
	frame: { overflow: 'hidden', backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
	image: { position: 'absolute' },
	frameBorder: { borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.85)' },
	zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, width: '100%', maxWidth: 420 },
	zoomButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.14)', alignItems: 'center', justifyContent: 'center' },
	zoomTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.18)', overflow: 'hidden' },
	zoomFill: { height: '100%', backgroundColor: MINT },
	actions: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', maxWidth: 420 },
	action: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
	cancel: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
	confirm: { backgroundColor: GREEN },
	actionText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
});
