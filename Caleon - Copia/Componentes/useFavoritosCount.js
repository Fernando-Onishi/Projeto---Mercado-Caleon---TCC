import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { FAVORITES_CHANGED_EVENT, getFavorites } from '../Config/ProdutoStorage';

// Quantidade de favoritos para a bolinha vermelha da barra de baixo.
// Atualiza na hora quando um favorito é marcado/desmarcado (inclusive vindo de outro aparelho).
export default function useFavoritosCount() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		let isActive = true;
		const subscription = DeviceEventEmitter.addListener(FAVORITES_CHANGED_EVENT, (ids) => {
			setCount(Array.isArray(ids) ? ids.length : 0);
		});
		getFavorites()
			.then((ids) => { if (isActive) setCount(Array.isArray(ids) ? ids.length : 0); })
			.catch(() => {});
		return () => {
			isActive = false;
			subscription.remove();
		};
	}, []);

	return count;
}
