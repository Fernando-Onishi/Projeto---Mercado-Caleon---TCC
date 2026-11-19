import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { themedStyles, tc } from '../Config/Tema';

// "Ver mais ›" das seções: ao tocar fica destacado (fundo verde-claro e texto verde) e abre a lista completa.
export default function LinkVerMais({ onPress, label = 'Ver mais', accessibilityLabel }) {
	return (
		<Pressable
			onPress={onPress}
			hitSlop={8}
			accessibilityRole="link"
			accessibilityLabel={accessibilityLabel || label}
			style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
		>
			{({ pressed }) => (
				<>
					<Text style={[styles.text, pressed && styles.textPressed]}>{label}</Text>
					<Feather name="chevron-right" size={14} color={tc(pressed ? '#1B4B3D' : '#656f6c')} />
				</>
			)}
		</Pressable>
	);
}

const styles = themedStyles(StyleSheet.create({
	link: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
	linkPressed: { backgroundColor: '#D8F6E9', transform: [{ scale: 0.96 }] },
	text: { color: '#656f6c', fontFamily: 'Montserrat_500Medium', fontSize: 12 },
	textPressed: { color: '#1B4B3D', fontFamily: 'Montserrat_700Bold' },
}));
