import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TelaHome from './Telas/home';
import TelaSplash from './Telas/Splash';
import TelaCadastro from './Telas/cadastro';
import TelaLogin from './Telas/login';
import TelaFavorito from './Telas/Favoritos';
import TelaSacola from './Telas/sacola';
import { Produtos as TelaProdutos } from './Telas/home';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* <Stack.Screen name="TelaSplash" component={TelaSplash} /> */}
        <Stack.Screen name="TelaLogin" component={TelaLogin} />
        <Stack.Screen name="TelaCadastro" component={TelaCadastro} />
        <Stack.Screen name="TelaHome" component={TelaHome} />
        <Stack.Screen name="TelaProdutos" component={TelaProdutos} />
        <Stack.Screen name="TelaFavorito" component={TelaFavorito} />
        <Stack.Screen name="TelaSacola" component={TelaSacola} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f7',
  },
});