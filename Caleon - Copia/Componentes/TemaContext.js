import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';
import { THEME_OPTIONS, readThemePreference, saveThemePreference, setScheme } from '../Config/Tema';

// Guarda a escolha de tema (Sistema / Claro / Escuro):
// - no aparelho (abre já no tema certo, mesmo sem internet);
// - na conta (users/{uid}.theme), para valer em qualquer celular em que a pessoa entrar.
const TemaContext = createContext({ scheme: 'light', preference: 'sistema', setPreference: () => {} });

const isValid = (value) => THEME_OPTIONS.some((option) => option.key === value);

export function TemaProvider({ children }) {
	const systemScheme = useColorScheme();
	const [preference, setPreferenceState] = useState('sistema');
	const [uid, setUid] = useState(null);
	const preferenceRef = useRef(preference);
	preferenceRef.current = preference;
	// A escolha salva na conta vale mais que a do aparelho (que pode estar desatualizada).
	const remoteApplied = useRef(false);

	useEffect(() => {
		readThemePreference().then((local) => {
			if (!remoteApplied.current) setPreferenceState(local);
		});
	}, []);

	useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid || null)), []);

	// Tema salvo na conta: aplica quando a pessoa entra (ou quando muda em outro aparelho).
	useEffect(() => {
		if (!uid) return undefined;
		return onSnapshot(doc(db, 'users', uid), (snapshot) => {
			const remote = snapshot.data()?.theme;
			if (isValid(remote)) remoteApplied.current = true;
			if (isValid(remote) && remote !== preferenceRef.current) {
				setPreferenceState(remote);
				saveThemePreference(remote);
			}
		}, () => {});
	}, [uid]);

	const scheme = preference === 'escuro' || (preference === 'sistema' && systemScheme === 'dark') ? 'dark' : 'light';
	// Atualiza antes de desenhar: os estilos leem o tema atual na hora em que são usados.
	setScheme(scheme);

	const setPreference = useCallback((value) => {
		if (!isValid(value)) return;
		setPreferenceState(value);
		saveThemePreference(value);
		const user = auth.currentUser;
		if (user) {
			setDoc(doc(db, 'users', user.uid), { theme: value }, { merge: true })
				.catch((error) => console.warn('Não foi possível salvar o tema na conta.', error?.code || error));
		}
	}, []);

	const value = useMemo(() => ({ scheme, preference, setPreference }), [scheme, preference, setPreference]);
	return <TemaContext.Provider value={value}>{children}</TemaContext.Provider>;
}

export function useTema() {
	return useContext(TemaContext);
}
