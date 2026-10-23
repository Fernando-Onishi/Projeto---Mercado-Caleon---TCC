import React, {useEffect} from 'react';
import {StyleSheet, Image, ImageBackground} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Config/FireBaseConfig';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';


export default function TelaSplash({navigation}) {
  useEffect(() => {
    let timer;
    let hasResolvedAuth = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (hasResolvedAuth) return;
      hasResolvedAuth = true;
      timer = setTimeout(() => {
        navigation.replace(user ? 'TelaHome' : 'TelaLogin');
      }, 2500);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation]);

  return(
    <SafeAreaScreen style={estilos.caixa} edges={[]}>
      <ImageBackground source={require('../assets/fundo.png')} style={estilos.fundo}>
      <Image source={require('../assets/logo.png')} style={estilos.logo} />
      </ImageBackground>
    </SafeAreaScreen>
  )
}

const estilos = StyleSheet.create({
  caixa:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
  },
  logo:{
    width:'70%',
    aspectRatio:1,
    maxWidth:280,
    maxHeight:280,
    resizeMode:'contain'
  },
  fundo:{
    flex:1,
    width: '100%',
    height: '100%',
    justifyContent:'center',
    alignItems:'center',
    resizeMode:'cover'
  }


  }
)
