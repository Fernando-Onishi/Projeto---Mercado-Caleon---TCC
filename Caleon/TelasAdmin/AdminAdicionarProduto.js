import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { useAdminNotifications } from '../Componentes/AdminNotificationsContext';
import ProductFormModal from './ProductFormModal';
import { ADMIN_THEME } from '../Config/AdminTheme';

const C = ADMIN_THEME.colors;

export default function AdminAdicionarProduto({ navigation, userRole }) {
	const [fontsLoaded] = useFonts({
		LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
		Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
		Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
		Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
	});
	const [notificationsVisible, setNotificationsVisible] = useState(false);
	const { notifications } = useAdminNotifications();

	function closeScreen() {
		if (navigation.canGoBack()) navigation.goBack();
		else navigation.navigate('AdminHome');
	}

	if (!fontsLoaded) return null;

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor="#164F40" />
			<AdminNotificationsModal
				visible={notificationsVisible}
				onClose={() => setNotificationsVisible(false)}
				navigation={navigation}
			/>
			<AdminScreenLayout
				style={styles.screen}
				contentStyle={styles.contentPanel}
				headerHeight={82}
				headerContent={(
					<View style={styles.topbar}>
						<TouchableOpacity
							style={styles.brandMark}
							onPress={() => navigation.navigate('AdminConfiguracoes')}
							accessibilityRole="button"
							accessibilityLabel="Configurações da conta"
						>
							<Feather name="user" size={20} color={C.white} />
						</TouchableOpacity>
						<View style={styles.brandCopy}>
							<Text style={styles.kicker}>Painel Operacional</Text>
							<Text style={styles.greeting}>Olá, Administrador</Text>
						</View>
						<View style={styles.notificationButton}>
							<CircularIconButton
								size={40}
								borderRadius={12}
								backgroundColor="#35B394"
								icon={<Feather name="bell" size={20} color={C.white} />}
								onPress={() => setNotificationsVisible(true)}
								accessibilityLabel="Notificações"
							/>
							{notifications.length > 0 ? (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>{notifications.length > 99 ? '99+' : notifications.length}</Text>
								</View>
							) : null}
						</View>
					</View>
				)}
				footerContent={(
					<NavegacaoAdmin
						navigation={navigation}
						activeTab="Adicionar"
						showAdd={userRole === 'admin'}
					/>
				)}
			>
				<ProductFormModal visible presentation="screen" onClose={closeScreen} />
			</AdminScreenLayout>
		</>
	);
}

const styles = StyleSheet.create({
	screen: { backgroundColor: '#164F40' },
	contentPanel: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
	topbar: { minHeight: 82, paddingHorizontal: ADMIN_THEME.layout.contentPadding, flexDirection: 'row', alignItems: 'center', backgroundColor: '#164F40' },
	brandMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#35B394', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
	brandCopy: { flex: 1, justifyContent: 'center' },
	kicker: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10, color: '#00B878', marginBottom: 2 },
	greeting: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 20, lineHeight: 24 },
	notificationButton: { position: 'relative', marginLeft: 8 },
	badge: { position: 'absolute', right: -4, top: -4, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#FF3F4D', alignItems: 'center', justifyContent: 'center' },
	badgeText: { color: '#FFFFFF', fontSize: 8, fontFamily: ADMIN_THEME.fonts.bold },
});
