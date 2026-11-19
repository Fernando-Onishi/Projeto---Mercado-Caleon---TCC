import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../Config/FireBaseConfig';
import {
	DEVICE_ID,
	cartFromRemote,
	getCart,
	getFavorites,
	writeCart,
	writeFavorites,
} from '../Config/ProdutoStorage';

// Mantém sacola e favoritos iguais em todos os aparelhos da mesma conta (users/{uid}.cart e .favorites).
// Não desenha nada: fica montado no App e só sincroniza.

const LAST_UID_KEY = '@caleon_sync_uid';

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cartKey = (items) => JSON.stringify(items.map((item) => [item.id, Number(item.quantidade) || 0, !!item.favorito]));

export default function SincronizacaoCliente() {
	useEffect(() => {
		let stopUserDoc = () => {};

		const stopAuth = onAuthStateChanged(auth, async (user) => {
			stopUserDoc();
			stopUserDoc = () => {};
			if (!user) return;

			// Outra conta neste aparelho: a sacola/favoritos locais eram da conta anterior, não misturar.
			let lastUid = null;
			try {
				lastUid = await AsyncStorage.getItem(LAST_UID_KEY);
				await AsyncStorage.setItem(LAST_UID_KEY, user.uid);
			} catch {}
			const sameAccount = !lastUid || lastUid === user.uid;
			let first = true;

			stopUserDoc = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
				const data = snapshot.data() || {};
				const isFirst = first;
				first = false;
				// Eco da própria gravação deste aparelho: nada a aplicar.
				if (!isFirst && data.syncDevice === DEVICE_ID) return;

				try {
					// Favoritos
					const localFavorites = sameAccount ? await getFavorites() : [];
					if (Array.isArray(data.favorites)) {
						const next = isFirst ? [...new Set([...data.favorites, ...localFavorites])] : data.favorites;
						if (!sameList(next, localFavorites)) await writeFavorites(next, { sync: false });
						if (isFirst && !sameList(next, data.favorites)) await writeFavorites(next);
					} else if (isFirst) {
						if (sameAccount && localFavorites.length) await writeFavorites(localFavorites);
						else if (!sameAccount) await writeFavorites([], { sync: false });
					}

					// Sacola
					const localCart = sameAccount ? await getCart() : [];
					if (Array.isArray(data.cart)) {
						if (isFirst && sameAccount && localCart.length && data.cart.length === 0) {
							await writeCart(localCart);
						} else {
							const remoteCart = cartFromRemote(data.cart);
							if (cartKey(remoteCart) !== cartKey(localCart) || !sameAccount) await writeCart(remoteCart, { sync: false });
						}
					} else if (isFirst) {
						if (sameAccount && localCart.length) await writeCart(localCart);
						else if (!sameAccount) await writeCart([], { sync: false });
					}
				} catch (error) {
					console.warn('Não foi possível aplicar a sincronização de sacola/favoritos.', error);
				}
			}, (error) => console.warn('Sincronização de sacola/favoritos indisponível.', error?.code || error));
		});

		return () => {
			stopUserDoc();
			stopAuth();
		};
	}, []);

	return null;
}
