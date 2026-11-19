import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { DARK, THEME_OPTIONS, themedStyles, tc } from '../Config/Tema';
import { useTema } from './TemaContext';

// Escolha do tema do app: Sistema, Claro ou Escuro (usado no Perfil e nas Configurações do admin).
// showTitle: false quando a tela já tem um título "Aparência" logo acima.
export default function SeletorTema({ style, showTitle = true }) {
	const { preference, setPreference, scheme } = useTema();
	const dark = scheme === 'dark';
	return (
		<View style={[styles.card, style]}>
			{showTitle ? (
				<View style={styles.header}>
					<Feather name="moon" size={18} color={tc('#1B4B3D')} />
					<Text style={styles.title}>Aparência</Text>
				</View>
			) : null}
			<View style={[styles.options, !showTitle && styles.optionsNoTitle]} accessibilityRole="radiogroup">
				{THEME_OPTIONS.map((option) => {
					const selected = preference === option.key;
					// No escuro as opções ficam um tom acima do cartão (e não "buracos" mais escuros).
					const background = selected ? (dark ? DARK.mint : '#1B4B3D') : (dark ? DARK.surfaceRaised : '#F1F3F5');
					return (
						<TouchableOpacity
							key={option.key}
							style={[styles.option, { backgroundColor: background }]}
							onPress={() => setPreference(option.key)}
							accessibilityRole="radio"
							accessibilityState={{ selected }}
							accessibilityLabel={`Tema ${option.label}`}
						>
							<Feather name={option.icon} size={16} color={selected ? '#FFFFFF' : tc('#183F35')} />
							<Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

const styles = themedStyles(StyleSheet.create({
	card: { padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5E1' },
	header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 2 },
	title: { color: '#183F35', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
	options: { flexDirection: 'row', gap: 8 },
	optionsNoTitle: { marginTop: 0 },
	option: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12 },
	optionText: { color: '#183F35', fontFamily: 'Montserrat_700Bold', fontSize: 13 },
	optionTextSelected: { color: '#FFFFFF' },
}), { keep: ['optionTextSelected'] });
