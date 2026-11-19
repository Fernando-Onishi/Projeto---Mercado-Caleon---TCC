import React, { useEffect } from 'react';
import TelaCarregamento from '../Componentes/TelaCarregamento';

// Tempo mínimo da animação de troca, para não piscar.
const SWITCH_DURATION_MS = 600;

/**
 * Tela intermediária ao trocar entre a área do cliente e o painel admin.
 * Uso: navigation.navigate('TelaTroca', { destino: 'TelaHome' | 'AdminHome' })
 */
export default function TelaTroca({ navigation, route }) {
	const destino = route?.params?.destino === 'AdminHome' ? 'AdminHome' : 'TelaHome';

	useEffect(() => {
		const timer = setTimeout(() => {
			navigation.reset({ index: 0, routes: [{ name: destino }] });
		}, SWITCH_DURATION_MS);
		return () => clearTimeout(timer);
	}, [navigation, destino]);

	return (
		<TelaCarregamento
			variant="troca"
			accessibilityLabel={destino === 'AdminHome' ? 'Abrindo o painel administrativo' : 'Abrindo a área do cliente'}
		/>
	);
}
