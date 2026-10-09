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
import DetalheProduto from './Telas/detalheproduto';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState(null);

  useEffect(() => onAuthStateChanged(
    auth,
    (user) => setInitialRouteName(user ? 'TelaHome' : 'TelaLogin'),
    (error) => {
      console.error('Não foi possível verificar a sessão do usuário.', error);
      setInitialRouteName('TelaLogin');
    },
  ), []);

  if (!initialRouteName) {
    return (
      <View style={styles.loadingScreen} accessibilityLabel="Verificando sessão">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TelaLogin" component={TelaLogin} />
        <Stack.Screen name="TelaCadastro" component={TelaCadastro} />
        <Stack.Screen name="TelaHome" component={TelaHome} />
        <Stack.Screen name="TelaSplash" component={TelaSplash} />
        <Stack.Screen name="TelaProdutos" component={TelaProdutos} />
        <Stack.Screen name="TelaFavorito" component={TelaFavorito} />
        <Stack.Screen name="TelaSacola" component={TelaSacola} />
        <Stack.Screen name="TelaPerfil" component={TelaPerfil} />
        <Stack.Screen name="TelaDetalheProduto" component={DetalheProduto} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B4B3D',
  },
});