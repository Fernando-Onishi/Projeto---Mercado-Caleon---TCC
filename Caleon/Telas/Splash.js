import React, {useEffect} from 'react';
import {View, StyleSheet, Text, Image, ImageBackground, TouchableOpacity} from 'react-native';


export default function TelaSplash({navigation}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('TelaHome');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return(
    <View style={estilos.caixa}>
      <ImageBackground source={require('../assets/fundo.png')} style={estilos.fundo}>
      <Image source={require('../assets/logo.png')} style={estilos.logo} />
      </ImageBackground>
    </View>
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

