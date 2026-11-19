import { Alert, Platform } from 'react-native';

// Na versão web o Alert.alert do React Native não mostra nada: avisos e confirmações sumiam
// ("cliquei e nada aconteceu"). Aqui ele passa a usar os diálogos do navegador.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
	Alert.alert = (title, message, buttons) => {
		const text = [title, message].filter(Boolean).join('\n\n');
		const list = Array.isArray(buttons) ? buttons : [];
		const cancel = list.find((button) => button?.style === 'cancel');
		const actions = list.filter((button) => button && button !== cancel);

		if (actions.length === 0) {
			window.alert(text);
			(cancel || list[0])?.onPress?.();
			return;
		}
		if (actions.length === 1 && !cancel) {
			window.alert(text);
			actions[0].onPress?.();
			return;
		}
		// Confirmação: "OK" executa a ação principal (a última que não é cancelar); "Cancelar" executa o cancelar.
		const confirmed = window.confirm(`${text}\n\nOK: ${actions[actions.length - 1].text || 'Confirmar'}`);
		if (confirmed) actions[actions.length - 1].onPress?.();
		else cancel?.onPress?.();
	};
}
