import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CircularIconButton from './CircularIconButton';
import { useFonts } from 'expo-font';
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { auth } from '../Config/FireBaseConfig';

const tabs = [
	{ label: 'Início', icon: 'home', activeIcon: 'home-fill', route: 'AdminHome' },
	{ label: 'Leitor', icon: 'maximize', route: 'AdminQrCode' },
	{ label: 'Adicionar', icon: 'plus', route: 'AdminCriarProduto' },
	{ label: 'Catálogo', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list', route: 'AdminProdutos' },
	{ label: 'Configurações', icon: 'cog-outline', activeIcon: 'cog', route: 'AdminConfiguracoes' },
];

export default function NavegacaoAdmin({ navigation, activeTab }) {
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [pressedTab, setPressedTab] = useState(null);
	useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});

	function navigateTo(route, label) {
		const routeNames = navigation.getState()?.routeNames || [];
		if (!routeNames.includes(route)) {
			setPressedTab(label);
			Alert.alert(label, 'Esta tela ainda não está disponível no aplicativo.');
			return;
		}

		setPressedTab(null);
		navigation.navigate(route);
	}

	async function handleLogout() {
		if (isLoggingOut) return;
		setIsLoggingOut(true);
		try {
			await signOut(auth);
			navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
		} catch (error) {
			console.error('Não foi possível sair da conta administrativa.', error);
			Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<View style={styles.bar}>
			{tabs.map((tab) => {
				const selected = activeTab === tab.label || pressedTab === tab.label;
				const isAddTab = tab.label === 'Adicionar';
				return (
					<TouchableOpacity
						key={tab.label}
						style={styles.tab}
						onPress={() => navigateTo(tab.route, tab.label)}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={tab.label}
					>
						<View style={[
							styles.iconBox,
							!isAddTab && styles.homeMenuIcon,
							!isAddTab && selected && styles.homeMenuIconSelected,
							isAddTab && styles.homeAddIcon,
						]}>
							{tab.label === 'Leitor' ? (
								<Feather name="maximize" size={24} color={selected || isAddTab ? '#FFFFFF' : '#757575'} />
							) : tab.label === 'Início' ? (
								<Octicons
									name={selected ? tab.activeIcon : tab.icon}
									size={23}
									color={selected ? '#FFFFFF' : '#757575'}
								/>
							) : tab.label === 'Catálogo' || tab.label === 'Configurações' ? (
								<MaterialCommunityIcons
									name={selected && tab.activeIcon ? tab.activeIcon : tab.icon}
									size={21}
									color={selected ? '#FFFFFF' : '#757575'}
								/>
							) : (
								<Feather
									name={tab.icon}
									size={isAddTab ? 24 : 21}
									color={isAddTab ? '#FFFFFF' : selected ? '#FFFFFF' : '#757575'}
								/>
							)}
						</View>
						<Text style={[
							styles.label,
							selected && styles.selectedLabel,
							isAddTab && styles.addLabel,
						]} numberOfLines={1}>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
			<View style={styles.tab}>
				<CircularIconButton
					icon={isLoggingOut
						? <ActivityIndicator size="small" color="#FFFFFF" />
						: <Ionicons name="exit-outline" size={24} color="#FFFFFF" />}
					onPress={handleLogout}
					disabled={isLoggingOut}
					accessibilityLabel="Sair da conta"
				/>
				<Text style={styles.label}>{isLoggingOut ? 'Saindo...' : 'Sair'}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		minHeight: 80,
		paddingHorizontal: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#F1F3F5',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#D5D9DB',
	},
	tab: {
		flex: 1,
		minWidth: 0,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 3,
	},
	iconBox: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	homeMenuIcon: {
		width: 46,
		height: 46,
		borderRadius: 12,
	},
	homeMenuIconSelected: {
		backgroundColor: '#076653',
	},
	homeAddIcon: {
		width: 46,
		height: 46,
		borderRadius: 23,
		backgroundColor: '#40B190',
	},
	label: {
		color: '#757575',
		fontFamily: 'LilitaOne_400Regular',
		fontSize: 10,
	},
	selectedLabel: {
		color: '#076653',
	},
	addLabel: {
		color: '#076653',
	},
});
