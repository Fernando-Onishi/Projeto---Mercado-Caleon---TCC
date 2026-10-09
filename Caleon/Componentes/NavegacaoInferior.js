import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const tabs = [
	{ label: 'Início', icon: 'home', route: 'TelaHome' },
	{ label: 'Favoritos', icon: 'heart', route: 'TelaFavorito' },
	{ label: 'Sacola', icon: 'shopping-outline', route: 'TelaSacola' },
	{ label: 'Catálogo', icon: 'clipboard-list-outline', route: 'TelaProdutos' },
	{ label: 'Perfil', icon: 'account-outline' },
];

export default function NavegacaoInferior({ activeTab, navigation, onUnavailable }) {
	function handlePress(tab) {
		if (tab.route) {
			if (tab.label !== activeTab) navigation.navigate(tab.route);
			return;
		}

		if (onUnavailable) {
			onUnavailable(tab.label);
			return;
		}

		Alert.alert(tab.label, 'Esta tela ainda não está disponível no aplicativo.');
	}

	return (
		<View style={styles.tabBar}>
			{tabs.map((tab) => {
				const active = tab.label === activeTab;

				return (
					<TouchableOpacity
						key={tab.label}
						style={styles.tab}
						onPress={() => handlePress(tab)}
						accessibilityRole="button"
						accessibilityLabel={tab.label}
						accessibilityState={{ selected: active }}
					>
						<View style={[styles.tabIcon, active && styles.activeTabIcon]}>
							<MaterialCommunityIcons
								name={tab.icon}
								size={23}
								color={active ? '#ffffff' : '#777777'}
							/>
							{tab.label === 'Sacola' && (
								<View style={styles.tabBadge}>
									<Text style={styles.badgeText}>1</Text>
								</View>
							)}
						</View>
						<Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{tab.label}</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		height: 58,
		borderTopWidth: 1,
		borderTopColor: '#8d8d8d',
		backgroundColor: '#f1f2f3',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 1,
	},
	tabIcon: {
		width: 31,
		height: 31,
		alignItems: 'center',
		justifyContent: 'center',
	},
	activeTabIcon: {
		borderRadius: 8,
		backgroundColor: '#006d56',
	},
	tabBadge: {
		position: 'absolute',
		right: -1,
		top: 2,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#ff2929',
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: {
		color: '#ffffff',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 8,
	},
	tabLabel: {
		color: '#747474',
		fontFamily: 'Montserrat_700Bold',
		fontSize: 8,
	},
	activeTabLabel: {
		color: '#006d56',
	},
});