import React from 'react';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../Config/FireBaseConfig';

export default function NavegacaoAdmin({ navigation, activeTab }) {
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});

	async function handleLogout() {
		try {
			await signOut(auth);
			navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
		} catch (error) {
			console.error('Não foi possível sair da conta administrativa.', error);
			Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
		}
	}

	return (
		<View style={styles.bar}>
			<TouchableOpacity
				style={styles.tab}
				onPress={() => navigation.navigate('AdminHome')}
				accessibilityRole="button"
				accessibilityState={{ selected: activeTab === 'Início' }}
			>
				<Feather name="home" size={21} color={activeTab === 'Início' ? '#076653' : '#757575'} />
				<Text style={styles.label}>Início</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.addTab}
				onPress={() => navigation.navigate('AdminCriarProduto')}
				accessibilityRole="button"
				accessibilityLabel="Adicionar produto"
			>
				<View style={styles.addIcon}><Feather name="plus" size={24} color="#FFFFFF" /></View>
				<Text style={[styles.label, styles.addLabel]}>Adicionar</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.tab}
				onPress={handleLogout}
				accessibilityRole="button"
				accessibilityLabel="Sair da conta"
			>
				<Feather name="log-out" size={21} color="#757575" />
				<Text style={styles.label}>Sair</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		minHeight: 76,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F1F3F5',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#D5D9DB',
	},
	tab: {
		minWidth: 58,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	addTab: {
		minWidth: 72,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	addIcon: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: '#076653',
		alignItems: 'center',
		justifyContent: 'center',
	},
	label: {
		color: '#757575',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 11,
	},
	addLabel: { color: '#076653' },
});
