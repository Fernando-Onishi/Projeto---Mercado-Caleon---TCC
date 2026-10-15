import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useSacolaCount from './useSacolaCount';

export default function BotaoSacola({ navigation }) {
	const bagCount = useSacolaCount();

	return (
		<TouchableOpacity
			style={styles.button}
			onPress={() => navigation?.navigate('TelaSacola')}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={`Abrir sacola, ${bagCount} ${bagCount === 1 ? 'item' : 'itens'}`}
		>
			<MaterialCommunityIcons name="shopping-outline" size={34} color="#ffffff" />
			{bagCount > 0 && (
				<View style={styles.badge}>
					<Text style={styles.badgeText}>{bagCount > 99 ? '99+' : bagCount}</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		width: 50,
		height: 50,
		borderRadius: 16,
		backgroundColor: '#40B190',
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		top: -5,
		right: -5,
		minWidth: 22,
		height: 22,
		paddingHorizontal: 5,
		borderRadius: 11,
		backgroundColor: '#FF383C',
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: '#ffffff',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 11,
	},
});
