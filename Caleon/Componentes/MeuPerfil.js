import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';

// Foto e nome de quem está logado (users/{uid}), atualizados na hora quando mudam.
export function useMeuPerfil() {
	const [uid, setUid] = useState(auth.currentUser?.uid || null);
	const [perfil, setPerfil] = useState({ photo: null, firstName: '' });

	useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid || null)), []);

	useEffect(() => {
		if (!uid) {
			setPerfil({ photo: null, firstName: '' });
			return undefined;
		}
		return onSnapshot(doc(db, 'users', uid), (snapshot) => {
			const data = snapshot.data() || {};
			const fullName = data.nome || auth.currentUser?.displayName || '';
			setPerfil({ photo: data.photoURL || null, firstName: String(fullName).trim().split(/\s+/)[0] || '' });
		}, () => {});
	}, [uid]);

	return perfil;
}

/** Quadradinho com a foto do usuário (ou o ícone de pessoa, se ele não tiver foto). */
export function FotoMeuPerfil({ photo, size = 40, radius = 12, iconColor = '#FFFFFF' }) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [photo]);
	if (photo && !failed) {
		return (
			<View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}>
				<Image source={{ uri: photo }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel="Sua foto de perfil" />
			</View>
		);
	}
	return <Feather name="user" size={Math.round(size * 0.55)} color={iconColor} />;
}
