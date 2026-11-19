import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth } from './Config/FireBaseConfig';
import ClienteTabsPager from './Telas/ClienteTabsPager';
import TelaSplash from './Telas/Splash';
import TelaCadastro from './Telas/cadastro';
import TelaLogin from './Telas/login';
import HistoricoPedidosScreen from './Telas/HistoricoPedidosScreen';
import ProdutosCategoriaScreen from './Telas/ProdutosCategoriaScreen';
import DetalheProduto from './Telas/detalheproduto';
import Pagamento from './Telas/Pagamento';
import PedidoAcompanhamento from './Telas/PedidoAcompanhamento';
import TelaTroca from './Telas/TelaTroca';
import CompraSucesso from './Telas/CompraSucesso';
import TelaCarregamento from './Componentes/TelaCarregamento';
import AdminTabsPager from './TelasAdmin/AdminTabsPager';
import AdminAdicionarProduto from './TelasAdmin/AdminAdicionarProduto';
import ControleEstoque from './TelasAdmin/controleEstoque';
import AdminProdutos from './TelasAdmin/AdminProdutos';
import { ProductModalProvider } from './Componentes/ProductModalContext';
import { AdminNotificationsProvider } from './Componentes/AdminNotificationsContext';
import { ClienteNotificacoesProvider } from './Componentes/ClienteNotificacoesContext';
import NotificacaoGlobal from './Componentes/NotificacaoGlobal';
import SincronizacaoCliente from './Componentes/SincronizacaoCliente';
import { getHomeRouteByRole, getUserRole } from './src/utils/getUserRole';
import { registerSignedInUser } from './Config/Equipe';
import { DARK, themedStyles } from './Config/Tema';
import { TemaProvider, useTema } from './Componentes/TemaContext';

const Stack = createNativeStackNavigator();
const ADMIN_EMPLOYEE_ROLES = ['admin', 'employee'];
const ADMIN_ONLY_ROLES = ['admin'];

function RoleProtectedScreen({ allowedRoles, Screen, navigation, route }) {
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [userRole, setUserRole] = useState(null);

	useEffect(() => {
		let active = true;
		async function verifyAccess() {
			try {
				const user = auth.currentUser;
				if (!user) {
					navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
					return;
				}

				const role = await getUserRole(user);
				if (!allowedRoles.includes(role)) {
					navigation.reset({ index: 0, routes: [{ name: getHomeRouteByRole(role) }] });
					return;
				}
				if (active) {
					setUserRole(role);
					setIsAuthorized(true);
				}
			} catch (error) {
				console.error('Não foi possível validar o acesso a esta tela.', error);
				navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
			}
		}

		verifyAccess();
		return () => { active = false; };
	}, [allowedRoles, navigation]);

	if (!isAuthorized) {
		return <TelaCarregamento variant="troca" accessibilityLabel="Validando acesso" />;
	}

	return <Screen navigation={navigation} route={route} userRole={userRole} />;
}

function AdminHomeRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={ADMIN_EMPLOYEE_ROLES} Screen={AdminTabsPager} navigation={navigation} route={route} />;
}

function AdminAddProductRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={ADMIN_ONLY_ROLES} Screen={AdminAdicionarProduto} navigation={navigation} route={route} />;
}


function AdminProductsRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={ADMIN_EMPLOYEE_ROLES} Screen={AdminProdutos} navigation={navigation} route={route} />;
}

function ControleEstoqueRoute({ navigation, route }) {
	if (route?.params?.preview) return <ControleEstoque navigation={navigation} route={route} />;
	return <RoleProtectedScreen allowedRoles={['admin', 'employee']} Screen={ControleEstoque} navigation={navigation} route={route} />;
}

// Tempo mínimo da tela de abertura com o logo, para não piscar quando a sessão carrega rápido.
const OPENING_MIN_MS = 1800;

export default function App() {
	return (
		<TemaProvider>
			<AppConteudo />
		</TemaProvider>
	);
}

// Tema da navegação (cor de fundo entre uma tela e outra).
const NAV_THEMES = {
	light: { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F1F3F5' } },
	dark: { ...DarkTheme, colors: { ...DarkTheme.colors, background: DARK.background, card: DARK.surface, border: DARK.border } },
};

function AppConteudo() {
	const { scheme } = useTema();
	// Ao trocar o tema as telas são redesenhadas, mas a navegação volta para a mesma tela.
	const navigationState = useRef(undefined);
	const [initialRouteName, setInitialRouteName] = useState(null);
	const [openingDone, setOpeningDone] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setOpeningDone(true), OPENING_MIN_MS);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		let active = true;
		let latestRequest = 0;
		const unsubscribe = onAuthStateChanged(
			auth,
			async (user) => {
				const request = ++latestRequest;
				// Registra a conta em users (e-mail e nome) para o admin poder encontrá-la na tela Equipe.
				if (user) registerSignedInUser(user);
				try {
					const route = user
						? getHomeRouteByRole(await getUserRole(user))
						: 'TelaLogin';
					if (active && request === latestRequest) setInitialRouteName(route);
				} catch (error) {
					console.error('Não foi possível verificar o perfil do usuário.', error);
					if (active && request === latestRequest) setInitialRouteName('TelaLogin');
				}
			},
			(error) => {
				console.error('Não foi possível verificar a sessão do usuário.', error);
				if (active) setInitialRouteName('TelaLogin');
			},
		);
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	return (
		<SafeAreaProvider>
			{!initialRouteName || !openingDone ? (
				<TelaCarregamento variant="logo" />
			) : (
				<View style={styles.appRoot}>
					<AdminNotificationsProvider>
					<ClienteNotificacoesProvider>
						<ProductModalProvider>
							<NavigationContainer
								key={scheme}
								theme={NAV_THEMES[scheme]}
								initialState={navigationState.current}
								onStateChange={(state) => { navigationState.current = state; }}
							>
							<Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
								<Stack.Screen name="TelaLogin" component={TelaLogin} />
								<Stack.Screen name="TelaCadastro" component={TelaCadastro} />
								<Stack.Screen name="TelaHome" component={ClienteTabsPager} />
								<Stack.Screen name="TelaSplash" component={TelaSplash} />
								<Stack.Screen name="ProdutosCategoriaScreen" component={ProdutosCategoriaScreen} />
								<Stack.Screen name="TelaHistoricoPedidos" component={HistoricoPedidosScreen} />
								<Stack.Screen name="TelaDetalheProduto" component={DetalheProduto} />
								<Stack.Screen name="TelaPagamento" component={Pagamento} />
								<Stack.Screen name="TelaPedido" component={PedidoAcompanhamento} />
								<Stack.Screen name="TelaTroca" component={TelaTroca} options={{ animation: 'fade', gestureEnabled: false }} />
								<Stack.Screen name="TelaCompraSucesso" component={CompraSucesso} options={{ animation: 'fade', gestureEnabled: false }} />
								<Stack.Screen name="AdminHome" component={AdminHomeRoute} />
								<Stack.Screen name="AdminAdicionarProduto" component={AdminAddProductRoute} />
								<Stack.Screen name="AdminProdutos" component={AdminProductsRoute} />
								<Stack.Screen name="ControleEstoque" component={ControleEstoqueRoute} />
								</Stack.Navigator>
								</NavigationContainer>
								<NotificacaoGlobal />
								<SincronizacaoCliente />
							</ProductModalProvider>
						</ClienteNotificacoesProvider>
						</AdminNotificationsProvider>
				</View>
			)}
		</SafeAreaProvider>
	);
}

const styles = themedStyles(StyleSheet.create({
	appRoot: {
		flex: 1,
		backgroundColor: '#F1F3F5',
	},
	loadingScreen: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1B4B3D',
	},
}));
