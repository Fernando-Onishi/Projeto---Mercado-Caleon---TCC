import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../Config/FireBaseConfig';
import { tc, themeColor } from '../Config/Tema';

// Foto de perfil do cliente (users/{uid}.photoURL), mostrada nos pedidos do painel admin.
// Vários pedidos do mesmo cliente compartilham uma única leitura do Firebase.
const photos = new Map(); // uid -> { photo, listeners:Set, stop }

function watchPhoto(uid, listener) {
	let entry = photos.get(uid);
	if (!entry) {
		entry = { photo: null, listeners: new Set(), stop: null };
		entry.stop = onSnapshot(doc(db, 'users', uid), (snapshot) => {
			entry.photo = snapshot.data()?.photoURL || null;
			entry.listeners.forEach((fn) => fn(entry.photo));
		}, () => {});
		photos.set(uid, entry);
	}
	entry.listeners.add(listener);
	listener(entry.photo);
	return () => {
		entry.listeners.delete(listener);
		if (!entry.listeners.size) {
			entry.stop?.();
			photos.delete(uid);
		}
	};
}

export default function FotoCliente({ userId, size = 38, style }) {
	const [photo, setPhoto] = useState(() => (userId ? photos.get(userId)?.photo || null : null));
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setFailed(false);
		if (!userId) {
			setPhoto(null);
			return undefined;
		}
		return watchPhoto(userId, setPhoto);
	}, [userId]);

	const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: themeColor('#EEF2F0', 'bg') };
	return (
		<View style={[styles.box, box, style]}>
			{photo && !failed ? (
				<Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel="Foto do cliente" />
			) : (
				<Feather name="user" size={Math.round(size * 0.47)} color={tc('#8B9291')} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
