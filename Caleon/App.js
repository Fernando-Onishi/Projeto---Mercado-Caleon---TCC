import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './Config/FireBaseConfig';
import TelaHome from './Telas/home';
import TelaSplash from './Telas/Splash';
import TelaCadastro from './Telas/cadastro';
import TelaLogin from './Telas/login';
import TelaFavorito from './Telas/Favoritos';
import TelaSacola from './Telas/sacola';
import TelaProdutos from './Telas/produto';
import TelaPerfil from './Telas/Perfil';
import ProdutosCategoriaScreen from './Telas/ProdutosCategoriaScreen';
import DetalheProduto from './Telas/detalheproduto';
import AdminHome from './TelasAdmin/AdminHome';
import HomeAdmin from './Telas/homeadmin';
import ControleEstoque from './TelasAdmin/controleEstoque';
import AdminPedido from './TelasAdmin/AdminPedido';
import TelaHomeAdmin from './TelasAdmin/tela home admin';
import NotificacaoGlobal from './Componentes/NotificacaoGlobal';
import { getHomeRouteByRole, getUserRole } from './src/utils/getUserRole';

const Stack = createNativeStackNavigator();

function RoleProtectedScreen({ allowedRoles, Screen, navigation, route }) {
	const [isAuthorized, setIsAuthorized] = useState(false);

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
				if (active) setIsAuthorized(true);
			} catch (error) {
				console.error('Não foi possível validar o acesso a esta tela.', error);
				navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
			}
		}

		verifyAccess();
		return () => { active = false; };
	}, [allowedRoles, navigation]);

	if (!isAuthorized) {
		return (
			<View style={styles.loadingScreen} accessibilityLabel="Validando acesso">
				<ActivityIndicator size="large" color="#ffffff" />
			</View>
		);
	}

	return <Screen navigation={navigation} route={route} />;
}

function AdminHomeRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={['admin', 'employee']} Screen={AdminHome} navigation={navigation} route={route} />;
}

function AdminCreateProductRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={['admin']} Screen={TelaHomeAdmin} navigation={navigation} route={route} />;
}

function AdminOrderRoute({ navigation, route }) {
	return <RoleProtectedScreen allowedRoles={['admin', 'employee']} Screen={AdminPedido} navigation={navigation} route={route} />;
}

function AdminPanelPreviewRoute({ navigation }) {
	return <HomeAdmin navigation={navigation} previewMode />;
}

function ControleEstoqueRoute({ navigation, route }) {
	if (route?.params?.preview) return <ControleEstoque navigation={navigation} route={route} />;
	return <RoleProtectedScreen allowedRoles={['admin', 'employee']} Screen={ControleEstoque} navigation={navigation} route={route} />;
}

export default function App() {
	const [initialRouteName, setInitialRouteName] = useState(null);

	useEffect(() => {
		let active = true;
		let latestRequest = 0;
		const unsubscribe = onAuthStateChanged(
			auth,
			async (user) => {
				const request = ++latestRequest;
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

	if (!initialRouteName) {
		return (
			<View style={styles.loadingScreen} accessibilityLabel="Verificando sessão">
				<ActivityIndicator size="large" color="#ffffff" />
			</View>
		);
	}

	return (
		<View style={styles.appRoot}>
			<NavigationContainer>
				<Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
					<Stack.Screen name="TelaLogin" component={TelaLogin} />
					<Stack.Screen name="TelaCadastro" component={TelaCadastro} />
					<Stack.Screen name="TelaHome" component={TelaHome} />
					<Stack.Screen name="TelaSplash" component={TelaSplash} />
					<Stack.Screen name="TelaProdutos" component={TelaProdutos} />
					<Stack.Screen name="ProdutosCategoriaScreen" component={ProdutosCategoriaScreen} />
					<Stack.Screen name="TelaFavorito" component={TelaFavorito} />
					<Stack.Screen name="TelaSacola" component={TelaSacola} />
					<Stack.Screen name="TelaPerfil" component={TelaPerfil} />
					<Stack.Screen name="TelaDetalheProduto" component={DetalheProduto} />
					<Stack.Screen name="AdminHome" component={AdminHomeRoute} />
					<Stack.Screen name="AdminPainelPreview" component={AdminPanelPreviewRoute} />
					<Stack.Screen name="AdminPedido" component={AdminOrderRoute} />
					<Stack.Screen name="ControleEstoque" component={ControleEstoqueRoute} />
					<Stack.Screen
						name="AdminCriarProduto"
						component={AdminCreateProductRoute}
						options={{
							presentation: 'transparentModal',
							animation: 'none',
							contentStyle: { backgroundColor: 'transparent' },
							gestureEnabled: false,
						}}
					/>
				</Stack.Navigator>
			</NavigationContainer>
			<NotificacaoGlobal />
		</View>
	);
}

const styles = StyleSheet.create({
	appRoot: {
		flex: 1,
	},
	loadingScreen: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1B4B3D',
	},
});
