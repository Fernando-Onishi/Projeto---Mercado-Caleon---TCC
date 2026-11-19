import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './FireBaseConfig';

// Dados do perfil do cliente (nome, telefone, endereço e CEP).
// Ficam salvos em dois lugares:
// - no aparelho (abre na hora, mesmo sem internet);
// - na conta, em users/{uid}.perfil (voltam em qualquer celular, depois de reinstalar ou sair e entrar).

export const PROFILE_FIELDS = ['name', 'phone', 'address', 'cep'];

export function getProfileStorageKey(uid) {
	return `caleon-profile-${uid || 'anonymous'}`;
}

function pickFields(data = {}) {
	const result = {};
	PROFILE_FIELDS.forEach((field) => {
		if (typeof data[field] === 'string') result[field] = data[field];
	});
	return result;
}

export async function readLocalProfile(uid) {
	try {
		const stored = JSON.parse(await AsyncStorage.getItem(getProfileStorageKey(uid)) || '{}');
		return stored && typeof stored === 'object' ? stored : {};
	} catch {
		return {};
	}
}

async function writeLocalProfile(uid, fields) {
	const current = await readLocalProfile(uid);
	const next = { ...current, ...fields };
	await AsyncStorage.setItem(getProfileStorageKey(uid), JSON.stringify(next));
	return next;
}

/** Salva no aparelho e na conta. fields: { name?, phone?, address?, cep?, photoUri? } */
export async function saveProfileData(uid, fields) {
	const local = await writeLocalProfile(uid, fields);
	if (!uid) return local;
	const remote = pickFields(fields);
	if (Object.keys(remote).length) {
		try {
			await setDoc(doc(db, 'users', uid), {
				perfil: { ...remote, updatedAt: serverTimestamp() },
				...(remote.name ? { nome: remote.name } : {}),
			}, { merge: true });
		} catch (error) {
			console.warn('Não foi possível salvar o perfil na conta; ficou salvo no aparelho.', error?.code || error);
		}
	}
	return local;
}

/** Lê o perfil: o da conta (mais recente) por cima do salvo no aparelho. */
export async function loadProfileData(uid) {
	const local = await readLocalProfile(uid);
	if (!uid) return local;
	try {
		const snapshot = await getDoc(doc(db, 'users', uid));
		const remote = pickFields(snapshot.data()?.perfil);
		if (Object.keys(remote).length) return writeLocalProfile(uid, remote);
	} catch {
		// Sem internet: fica com o do aparelho.
	}
	return local;
}

/**
 * Acompanha o perfil salvo na conta. onChange(perfilCompleto) — já mesclado com o do aparelho.
 * Se a conta ainda não tem perfil mas o aparelho tem (versões antigas do app), envia o do aparelho.
 */
export function subscribeProfileData(uid, onChange) {
	if (!uid) return () => {};
	let firstSnapshot = true;
	return onSnapshot(doc(db, 'users', uid), async (snapshot) => {
		const remote = pickFields(snapshot.data()?.perfil);
		if (Object.keys(remote).length) {
			onChange(await writeLocalProfile(uid, remote));
		} else if (firstSnapshot) {
			const local = await readLocalProfile(uid);
			const localFields = pickFields(local);
			if (Object.keys(localFields).length) saveProfileData(uid, localFields);
		}
		firstSnapshot = false;
	}, () => {});
}
