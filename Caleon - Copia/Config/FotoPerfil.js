import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './FireBaseConfig';
import { isStoredImage, toCompressedDataUrl } from './ImagemFirestore';

// Foto de perfil guardada em users/{uid}.photoURL (imagem comprimida dentro do Firestore),
// para aparecer igual em qualquer aparelho em que a pessoa entrar.

export function isRemotePhoto(uri) {
	return isStoredImage(uri);
}

export async function uploadProfilePhoto(localUri) {
	const user = auth.currentUser;
	if (!user) throw new Error('not-signed-in');
	const photoURL = await toCompressedDataUrl(localUri, { maxSize: 480, quality: 0.7 });
	try {
		await setDoc(doc(db, 'users', user.uid), { photoURL, updatedAt: serverTimestamp() }, { merge: true });
	} catch (error) {
		// Guarda a foto já comprimida no erro, para a tela poder mantê-la ao menos neste aparelho.
		error.photoURL = photoURL;
		throw error;
	}
	return photoURL;
}

// Explica em português o motivo de um erro do Firebase.
export function describePhotoError(error) {
	if (error?.message === 'image-too-large') return 'Essa foto é grande demais. Escolha outra ou recorte mais.';
	const code = String(error?.code || '').replace('firestore/', '');
	if (code === 'permission-denied') {
		return 'O Firebase recusou salvar a foto: as regras do Firestore não deixam este usuário gravar em "users". A foto ficou salva só neste aparelho.';
	}
	if (code === 'unavailable') return 'Sem conexão com o Firebase agora. A foto ficou salva só neste aparelho; tente de novo depois.';
	if (code === 'invalid-argument' || code === 'resource-exhausted') return 'A foto ficou grande demais para o Firebase. Escolha outra ou recorte mais.';
	return `Não foi possível salvar a foto no Firebase (${code || error?.message || 'erro desconhecido'}).`;
}

// Avisa a foto atual e qualquer troca feita em outro aparelho.
export function subscribeProfilePhoto(uid, onChange) {
	if (!uid) {
		onChange(null);
		return () => {};
	}
	return onSnapshot(doc(db, 'users', uid), (snapshot) => {
		onChange(snapshot.data()?.photoURL || null);
	}, () => onChange(null));
}
