import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const SACOLA_KEY = '@sacola_itens';
const SACOLA_CHANGED_EVENT = 'caleon:sacola-changed';

function countItems(items) {
	if (!Array.isArray(items)) {
		throw new Error('Os dados salvos na sacola não estão em um formato válido.');
	}

	return items.reduce((total, item) => {
		const quantity = Number(item?.quantidade);
		return total + (Number.isFinite(quantity) ? Math.max(0, quantity) : 0);
	}, 0);
}

export function publishSacolaCount(items) {
	DeviceEventEmitter.emit(SACOLA_CHANGED_EVENT, countItems(items));
}

export default function useSacolaCount() {
	const [count, setCount] = useState(0);

	useFocusEffect(useCallback(() => {
		let isActive = true;
		const subscription = DeviceEventEmitter.addListener(SACOLA_CHANGED_EVENT, setCount);

		async function refreshCount() {
			try {
				const storedItems = await AsyncStorage.getItem(SACOLA_KEY);
				const items = storedItems ? JSON.parse(storedItems) : [];
				const nextCount = countItems(items);
				if (isActive) setCount(nextCount);
			} catch (error) {
				console.error('Não foi possível atualizar a quantidade de itens na sacola.', error);
			}
		}

		refreshCount();

		return () => {
			isActive = false;
			subscription.remove();
		};
	}, []));

	return count;
}
