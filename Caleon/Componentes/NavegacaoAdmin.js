import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import {
	Alert,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

const tabs = [
	{ label: 'Início', icon: 'home', activeIcon: 'home-fill', route: 'AdminHome' },
	{ label: 'QR Code', icon: 'maximize', route: 'AdminQrCode' },
	{ label: 'Adicionar', icon: 'plus', route: 'AdminCriarProduto' },
	{ label: 'Catálogo', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list', route: 'AdminProdutos' },
	{ label: 'Configurações', icon: 'settings', route: 'AdminConfiguracoes' },
];

export default function NavegacaoAdmin({ navigation, activeTab, showAdd = true }) {
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});

	function navigateTo(route, label) {
		const state = navigation.getState();
		const routeNames = state?.routeNames || [];
		if (!routeNames.includes(route)) {
			Alert.alert(label, 'Esta tela ainda não está disponível no aplicativo.');
			return;
		}

		if (state?.routes?.[state.index]?.name === route && route !== 'AdminProdutos') return;
		navigation.navigate(route, route === 'AdminProdutos' ? { stockFilter: null, lowStock: false } : undefined);
	}

	return (
		<View style={styles.bar}>
			{tabs.filter((tab) => showAdd || tab.label !== 'Adicionar').map((tab) => {
				const selected = activeTab === tab.label;
				const iconSize = tab.label === 'Início' ? 23 : 26;
				const iconColor = selected ? '#FFFFFF' : '#757575';
				return (
					<TouchableOpacity
						key={tab.label}
						style={styles.tab}
						onPress={() => navigateTo(tab.route, tab.label)}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={tab.label}
					>
						<View style={[styles.iconBox, selected && styles.menuIconSelected]}>
							{tab.label === 'QR Code' ? (
								<Feather name="maximize" size={iconSize} color={iconColor} />
							) : tab.label === 'Início' ? (
								<Octicons name={selected ? tab.activeIcon : tab.icon} size={iconSize} color={iconColor} />
							) : tab.label === 'Catálogo' ? (
								<MaterialCommunityIcons name={selected ? tab.activeIcon : tab.icon} size={iconSize} color={iconColor} />
							) : (
								<Feather name={tab.icon} size={iconSize} color={iconColor} />
							)}
						</View>
						<Text style={[
							styles.label,
							selected && styles.selectedLabel,
						]} numberOfLines={1}>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		height: 92,
		paddingHorizontal: 3,
		paddingBottom: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#f2f3f4',
		borderTopWidth: 1,
		borderTopColor: '#dfe3e6',
	},
	tab: {
		flex: 1,
		minWidth: 0,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 4,
	},
	iconBox: {
		width: 46,
		height: 46,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		borderRadius: 12,
	},
	menuIcon: {
		width: 46,
		height: 46,
		borderRadius: 12,
	},
	menuIconSelected: {
		backgroundColor: '#076653',
	},
	addTabIcon: {
		width: 46,
		height: 46,
		borderRadius: 12,
		backgroundColor: '#40B190',
	},
	label: {
		color: '#757575',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 10,
		marginTop: 4,
	},
	selectedLabel: {
		color: '#076653',
	},
});
