import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import { auth } from '../Config/FireBaseConfig';
import { getUserRole } from '../src/utils/getUserRole';

const COLORS = {
	green: '#1B4B3D',
	mint: '#40B190',
	active: '#076653',
	background: '#F1F3F5',
	muted: '#757575',
	white: '#FFFFFF',
};

const adminTabs = [
	{ label: 'Início', icon: 'home', route: 'AdminHome' },
	{ label: 'QrCode', icon: 'maximize', route: 'AdminQrCode' },
	{ label: 'Adicionar', icon: 'plus', route: 'AdminCriarProduto' },
	{ label: 'Catálogo', icon: 'clipboard', route: 'AdminProdutos' },
	{ label: 'Configurações', icon: 'settings', route: 'AdminConfiguracoes' },
];

const previewContent = {
	Início: { title: 'Painel Administrativo', description: 'Ambiente de prototipação local.' },
	QrCode: { title: 'QrCode', description: 'Área de leitura de códigos em preparação.' },
	Adicionar: { title: 'Adicionar', description: 'Área de cadastro de produtos em preparação.' },
	Catálogo: { title: 'Catálogo', description: 'Área de produtos em preparação.' },
	Configurações: { title: 'Configurações', description: 'Área de configurações em preparação.' },
};

export default function HomeAdmin({ navigation, previewMode = false }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
	});
	const [authorized, setAuthorized] = useState(previewMode);
	const [activeTab, setActiveTab] = useState('Início');

	useEffect(() => {
		if (previewMode) {
			setAuthorized(true);
			return undefined;
		}

		let mounted = true;
		async function verifyAdmin() {
			try {
				const user = auth.currentUser;
				if (!user || await getUserRole(user) !== 'admin') {
					navigation.reset({ index: 0, routes: [{ name: user ? 'TelaHome' : 'TelaLogin' }] });
					return;
				}
				if (mounted) setAuthorized(true);
			} catch (error) {
				console.error('Não foi possível validar o acesso administrativo.', error);
				navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
			}
		}

		verifyAdmin();
		return () => { mounted = false; };
	}, [navigation, previewMode]);

	function handleTabPress(route, label) {
		if (previewMode) {
			setActiveTab(label);
			return;
		}

		const routeNames = navigation.getState()?.routeNames || [];
		if (!routeNames.includes(route)) {
			Alert.alert(label, 'Esta tela ainda não está disponível no aplicativo.');
			return;
		}
		navigation.navigate(route);
	}

	if (!fontsLoaded || !authorized) {
		return (
			<View style={styles.loading} accessibilityLabel="Validando acesso administrativo">
				<ActivityIndicator size="large" color={COLORS.green} />
			</View>
		);
	}

	const greeting = previewMode ? 'Modo de desenvolvimento' : auth.currentUser?.displayName?.trim() || 'Administrador';
	const currentContent = previewContent[activeTab];

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={COLORS.green} />
			<View style={styles.header}>
				<View style={styles.avatar}><Text style={styles.avatarLetter}>C</Text></View>
				<View style={styles.headerCopy}>
					<Text style={styles.eyebrow}>Painel Operacional</Text>
					<Text style={styles.greeting} numberOfLines={1}>Olá, {greeting}</Text>
				</View>
				<TouchableOpacity
					style={styles.notificationButton}
					onPress={() => Alert.alert('Notificações', 'As notificações não estão configuradas.')}
					accessibilityRole="button"
					accessibilityLabel="Notificações"
				>
					<Feather name="bell" size={19} color={COLORS.white} />
				</TouchableOpacity>
			</View>

			<View style={styles.workspace}>
				<View style={styles.previewContent}>
					<Feather name={activeTab === 'Início' ? 'layers' : adminTabs.find((tab) => tab.label === activeTab)?.icon || 'grid'} size={30} color={COLORS.mint} />
					<Text style={styles.previewTitle}>{currentContent.title}</Text>
					<Text style={styles.previewDescription}>{currentContent.description}</Text>
					{previewMode ? <Text style={styles.previewBadge}>RASCUNHO · SEM BANCO DE DADOS</Text> : null}
				</View>
			</View>

			<View style={styles.footer}>
				{adminTabs.map((tab) => {
					const selected = tab.label === activeTab;
					const addTab = tab.label === 'Adicionar';
					return (
						<TouchableOpacity
							key={tab.label}
							style={styles.tab}
							onPress={() => handleTabPress(tab.route, tab.label)}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							accessibilityLabel={tab.label}
						>
							<View style={[styles.iconBox, addTab && styles.addIconBox]}>
								<Feather name={tab.icon} size={addTab ? 23 : 20} color={addTab ? COLORS.white : selected ? COLORS.active : COLORS.muted} />
							</View>
							<Text style={[styles.tabLabel, selected && styles.selectedLabel, addTab && styles.addLabel]} numberOfLines={1}>
								{tab.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
	header: { minHeight: 80, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.green },
	avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.mint },
	avatarLetter: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 26 },
	headerCopy: { flex: 1, minWidth: 0 },
	eyebrow: { color: '#B8E8D8', fontFamily: 'LilitaOne_400Regular', fontSize: 12 },
	greeting: { color: COLORS.white, fontFamily: 'LilitaOne_400Regular', fontSize: 18, marginTop: 1 },
	notificationButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.mint },
	workspace: { flex: 1, backgroundColor: COLORS.background },
	previewContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
	previewTitle: { marginTop: 12, color: COLORS.green, fontFamily: 'LilitaOne_400Regular', fontSize: 22, textAlign: 'center' },
	previewDescription: { marginTop: 6, color: COLORS.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 13, textAlign: 'center' },
	previewBadge: { marginTop: 18, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', borderRadius: 6, backgroundColor: '#DDF5EC', color: COLORS.active, fontFamily: 'LilitaOne_400Regular', fontSize: 9 },
	footer: { minHeight: 80, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: COLORS.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5D9DB' },
	tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3 },
	iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
	addIconBox: { borderRadius: 8, backgroundColor: COLORS.active },
	tabLabel: { color: COLORS.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 10 },
	selectedLabel: { color: COLORS.active },
	addLabel: { color: COLORS.active },
});