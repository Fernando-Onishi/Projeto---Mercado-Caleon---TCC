import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import Feather from '@expo/vector-icons/Feather';

// Câmera "à prova de tela preta" para o leitor de QR Code / código de barras.
// - Só liga quando `active` (aba visível, nenhum outro leitor aberto) e um instante depois,
//   para não abrir no meio da animação de troca de aba.
// - Desliga quando o app vai para segundo plano e reinicia ao voltar.
// - Se não ficar pronta em alguns segundos, reinicia sozinha; depois de algumas tentativas,
//   mostra um botão para tentar de novo.

const START_DELAY_MS = 350;
const READY_TIMEOUT_MS = 3000;
const MAX_AUTO_RETRIES = 2;

export default function CameraSegura({ active = true, style, onMountError, ...cameraProps }) {
	const [appActive, setAppActive] = useState(AppState.currentState === 'active');
	const [started, setStarted] = useState(false);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const [cameraKey, setCameraKey] = useState(0);
	const retries = useRef(0);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', (state) => {
			const isActive = state === 'active';
			setAppActive(isActive);
			// Voltou para o app: nova câmera (a antiga costuma voltar preta).
			if (isActive) setCameraKey((key) => key + 1);
		});
		return () => subscription.remove();
	}, []);

	const shouldRun = active && appActive && !failed;

	useEffect(() => {
		setReady(false);
		if (!shouldRun) {
			setStarted(false);
			return undefined;
		}
		const timer = setTimeout(() => setStarted(true), START_DELAY_MS);
		return () => clearTimeout(timer);
	}, [shouldRun, cameraKey]);

	// Vigia: se a câmera não avisar que está pronta, reinicia.
	useEffect(() => {
		if (!started || ready) return undefined;
		const timer = setTimeout(() => {
			if (retries.current < MAX_AUTO_RETRIES) {
				retries.current += 1;
				setStarted(false);
				setCameraKey((key) => key + 1);
			} else {
				setFailed(true);
			}
		}, READY_TIMEOUT_MS);
		return () => clearTimeout(timer);
	}, [started, ready, cameraKey]);

	function retry() {
		retries.current = 0;
		setFailed(false);
		setCameraKey((key) => key + 1);
	}

	return (
		<View style={[styles.root, style]}>
			{started && shouldRun ? (
				<CameraView
					key={cameraKey}
					style={StyleSheet.absoluteFill}
					{...cameraProps}
					onCameraReady={() => {
						retries.current = 0;
						setReady(true);
						cameraProps.onCameraReady?.();
					}}
					onMountError={(event) => {
						console.error('Não foi possível iniciar a câmera.', event?.message);
						onMountError?.(event);
						if (retries.current < MAX_AUTO_RETRIES) {
							retries.current += 1;
							setStarted(false);
							setCameraKey((key) => key + 1);
						} else {
							setFailed(true);
						}
					}}
				/>
			) : null}
			{!ready && active ? (
				<View style={styles.overlay} pointerEvents={failed ? 'auto' : 'none'}>
					{failed ? (
						<>
							<Feather name="camera-off" size={40} color="#FFFFFF" />
							<Text style={styles.text}>A câmera não abriu.</Text>
							<TouchableOpacity style={styles.button} onPress={retry} accessibilityRole="button">
								<Feather name="refresh-cw" size={16} color="#FFFFFF" />
								<Text style={styles.buttonText}>Tentar de novo</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<ActivityIndicator size="large" color="#FFFFFF" />
							<Text style={styles.text}>Abrindo a câmera...</Text>
						</>
					)}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	root: { backgroundColor: '#000000', overflow: 'hidden' },
	overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#000000' },
	text: { color: '#FFFFFF', fontFamily: 'Montserrat_500Medium', fontSize: 14 },
	button: { minHeight: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#40B190' },
	buttonText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 14 },
});
