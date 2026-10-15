import React, { useState, useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import {
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';

import NavegacaoInferior from '../Componentes/NavegacaoInferior';
import { publishSacolaCount } from '../Componentes/useSacolaCount';
import { PRODUCTS } from '../Config/Produtos';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SACOLA_KEY = '@sacola_itens';
const DELETE_WIDTH = 80;
const SCREEN_WIDTH = Dimensions.get('window').width;

const itensIniciais = [
  {
    id: 1,
    nome: 'Maçã',
    preco: 7.99,
    unidade: '/kg',
    peso: '300g',
    quantidade: 1,
    imagem: { uri: 'https://cdn-icons-png.flaticon.com/512/415/415682.png' },
    desconto: null,
    precoOriginal: null,
    favorito: false,
  },
  {
    id: 2,
    nome: 'Melancia',
    preco: 6.79,
    unidade: '/u',
    peso: null,
    quantidade: 1,
    imagem: { uri: 'https://cdn-icons-png.flaticon.com/512/765/765560.png' },
    desconto: null,
    precoOriginal: 10.99,
    favorito: true,
  },
  {
    id: 3,
    nome: 'Maçã',
    preco: 7.99,
    unidade: '/kg',
    peso: '300g',
    quantidade: 1,
    imagem: { uri: 'https://cdn-icons-png.flaticon.com/512/415/415682.png' },
    desconto: null,
    precoOriginal: null,
    favorito: false,
  },
  {
    id: 4,
    nome: 'Melancia',
    preco: 7.99,
    unidade: '/kg',
    peso: null,
    quantidade: 1,
    imagem: { uri: 'https://cdn-icons-png.flaticon.com/512/765/765560.png' },
    desconto: '40% off',
    precoOriginal: 10.99,
    favorito: false,
  },
];

function SwipeableCard({ children, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 10,
      onPanResponderMove: (_, gestureState) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const nextX = base + gestureState.dx;
        translateX.setValue(Math.max(Math.min(nextX, 0), -DELETE_WIDTH));
      },
      onPanResponderRelease: (_, gestureState) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const finalX = base + gestureState.dx;

        if (finalX < -DELETE_WIDTH / 2) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onDelete();
    });
  };

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeShadow}>
      <View style={styles.swipeContainer}>
        <Animated.View style={[styles.deleteBtnBg, { opacity: deleteOpacity }]}>
          <TouchableOpacity
            style={styles.deleteBtnAction}
            onPress={handleDelete}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Excluir produto da sacola"
          >
            <Feather name="trash-2" size={40} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View
          style={{ width: '100%', zIndex: 1, transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

export default function TelaSacola({ navigation }) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [fontsLoaded] = useFonts({
    LuckiestGuy: require('@expo-google-fonts/luckiest-guy/400Regular/LuckiestGuy_400Regular.ttf'),
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
  });

  const carregarSacola = async () => {
    try {
      const dados = await AsyncStorage.getItem(SACOLA_KEY);
      if (dados !== null) {
        const savedItems = JSON.parse(dados);
        setItens(savedItems);
        publishSacolaCount(savedItems);
      } else {
        setItens(itensIniciais);
        await AsyncStorage.setItem(SACOLA_KEY, JSON.stringify(itensIniciais));
        publishSacolaCount(itensIniciais);
      }
    } catch (error) {
      console.error('Erro ao carregar sacola:', error);
    } finally {
      setCarregado(true);
    }
  };

  useEffect(() => {
    carregarSacola();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      carregarSacola();
    });
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, [navigation]);

  const salvarSacola = async (novosItens) => {
    try {
      await AsyncStorage.setItem(SACOLA_KEY, JSON.stringify(novosItens));
      publishSacolaCount(novosItens);
    } catch (error) {
      console.error('Erro ao salvar sacola:', error);
    }
  };

  const alterarQuantidade = (id, delta) => {
    setItens((prev) => {
      const itemAtual = prev.find((item) => item.id === id);
      if (!itemAtual) return prev;

      const novaQuantidade = itemAtual.quantidade + delta;
      const novos =
        novaQuantidade <= 0
          ? prev.filter((item) => item.id !== id)
          : prev.map((item) =>
              item.id === id ? { ...item, quantidade: novaQuantidade } : item
            );

      salvarSacola(novos);
      return novos;
    });
  };

  const removerItem = (id) => {
    setItens((prev) => {
      const novos = prev.filter((item) => item.id !== id);
      salvarSacola(novos);
      return novos;
    });
  };

  const toggleFavorito = (id) => {
    setItens((prev) => {
      const novos = prev.map((item) =>
        item.id === id ? { ...item, favorito: !item.favorito } : item
      );
      salvarSacola(novos);
      return novos;
    });
  };

  const abrirDetalhes = (item) => {
    const productId =
      item.productId ||
      PRODUCTS.find((product) => product.name === item.nome)?.id;

    if (productId) {
      navigation?.navigate?.('TelaDetalheProduto', { productId });
    }
  };

  const subtotal = itens.reduce(
    (acc, item) => acc + (Number(item.preco) || 0) * (Number(item.quantidade) || 1),
    0
  );
  const taxaServico = 5.0;
  const total = subtotal + taxaServico;

  const renderItem = (item) => (
    <SwipeableCard key={item.id} onDelete={() => removerItem(item.id)}>
      <View style={styles.card}>
        {item.desconto ? (
          <View style={styles.descontoBadge}>
            <Text style={styles.descontoText}>{item.desconto}</Text>
          </View>
        ) : null}

        <View style={styles.cardRow}>
          <View style={styles.imagemContainer}>
            <Image
              source={item.imagem}
              style={styles.produtoImagem}
              resizeMode="contain"
            />
            {item.favorito ? (
              <TouchableOpacity
                style={styles.favoritoOverlay}
                onPress={() => toggleFavorito(item.id)}
              >
                <Ionicons name="heart" size={14} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.produtoInfo}>
            <Text style={styles.produtoNome}>{item.nome}</Text>
            <View style={styles.precoRow}>
              <Text style={styles.produtoPreco}>
                R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                <Text style={styles.produtoUnidade}>{item.unidade}</Text>
              </Text>
              {item.precoOriginal ? (
                <Text style={styles.precoOriginal}>
                  R${Number(item.precoOriginal).toFixed(2).replace('.', ',')}/u
                </Text>
              ) : null}
            </View>
            {item.peso ? <Text style={styles.produtoPeso}>{item.peso}</Text> : null}
          </View>

          <View style={styles.cardActions}>
            {item.favorito ? (
              <TouchableOpacity
                style={styles.favoritoBtnAtivo}
                onPress={() => toggleFavorito(item.id)}
              >
                <Ionicons name="heart" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => abrirDetalhes(item)}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes de ${item.nome}`}
              >
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.quantidadeContainer}>
          <TouchableOpacity
            style={styles.quantidadeBtn}
            onPress={() => alterarQuantidade(item.id, -1)}
          >
            <Feather name="minus" size={18} color="#1a8e5f" />
          </TouchableOpacity>
          <Text style={styles.quantidadeText}>{item.quantidade}</Text>
          <TouchableOpacity
            style={styles.quantidadeBtn}
            onPress={() => alterarQuantidade(item.id, 1)}
          >
            <Feather name="plus" size={18} color="#1a8e5f" />
          </TouchableOpacity>
        </View>
      </View>
    </SwipeableCard>
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B4B3D" barStyle="light-content" />
      <View style={styles.topBand} />

      <View style={styles.screenPanel}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Feather name="chevron-left" size={27} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Sacola</Text>
        </View>

        <View style={styles.painel}>
          <ScrollView
            style={styles.lista}
            contentContainerStyle={styles.listaContent}
            showsVerticalScrollIndicator={false}
          >
            {itens.map(renderItem)}

            {itens.length === 0 && carregado ? (
              <View style={styles.sacolaVazia}>
                <Ionicons name="bag-outline" size={60} color="#ccc" />
                <Text style={styles.sacolaVaziaTexto}>Sua sacola está vazia</Text>
              </View>
            ) : null}
          </ScrollView>

          {itens.length > 0 && (
            <View style={styles.checkoutSection}>
              <View style={styles.resumo}>
                <View style={styles.resumoRow}>
                  <Text style={styles.resumoLabel}>SubTotal:</Text>
                  <Text style={styles.resumoValor}>
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.resumoRow}>
                  <Text style={styles.resumoLabel}>Taxa de Serviço:</Text>
                  <Text style={styles.resumoValor}>
                    R$ {taxaServico.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={[styles.resumoRow, { marginTop: 8 }]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValor}>
                    R$ {total.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.finalizarBtn}>
                <Text style={styles.finalizarText}>Finalizar Compra</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <NavegacaoInferior activeTab="Sacola" navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4B3D' },
  topBand: { height: 40, backgroundColor: '#1B4B3D' },
  screenPanel: {
    flex: 1,
    marginTop: -1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F1F3F5',
    overflow: 'hidden',
  },
  header: {
    height: 116,
    alignItems: 'center',
    paddingTop: 15,
  },
  backButton: {
    position: 'absolute',
    top: 15,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#40B190',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    color: '#000000',
    fontSize: 30,
    fontFamily: 'LilitaOne_400Regular',
    marginTop: 14,
  },
  painel: {
    flex: 1,
    backgroundColor: '#F1F3F5',
    overflow: 'hidden',
  },
  lista: {
    flex: 1,
  },
  listaContent: {
    flexGrow: 1,
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 20,
  },
  checkoutSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#F1F3F5',
  },
  swipeShadow: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 12,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeContainer: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: 13,
  },
  deleteBtnBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#ff2929',
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#edf0ee',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  imagemContainer: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#f7f9f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  produtoImagem: { width: 58, height: 58, borderRadius: 16 },
  favoritoOverlay: {
    position: 'absolute',
    bottom: -5,
    left: -5,
    backgroundColor: '#1a8e5f',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  produtoInfo: { flex: 1, marginLeft: 12 },
  produtoNome: {
    fontSize: 18,
    color: '#1e2a28',
    fontFamily: 'LuckiestGuy',
  },
  precoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  produtoPreco: {
    fontSize: 16,
    color: '#1a8e5f',
    fontFamily: 'LuckiestGuy',
  },
  produtoUnidade: {
    fontSize: 12,
    color: '#1a8e5f',
    fontFamily: 'LuckiestGuy',
    marginLeft: 2,
  },
  precoOriginal: {
    fontSize: 11,
    color: '#8b938f',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    fontFamily: 'LuckiestGuy',
  },
  produtoPeso: {
    fontSize: 12,
    color: '#7a847f',
    marginTop: 3,
    fontFamily: 'LuckiestGuy',
  },
  cardActions: { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  actionBtn: {
    backgroundColor: '#1a8e5f',
    borderRadius: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoritoBtnAtivo: {
    backgroundColor: '#1a8e5f',
    borderRadius: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    backgroundColor: '#eef3f1',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#dfeae6',
  },
  quantidadeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeText: {
    fontSize: 18,
    minWidth: 26,
    textAlign: 'center',
    color: '#1a1a1a',
    fontFamily: 'LuckiestGuy',
    marginHorizontal: 6,
  },
  sacolaVazia: {
    alignItems: 'center',
    paddingTop: 38,
  },
  sacolaVaziaTexto: {
    fontSize: 17,
    color: '#87918D',
    marginTop: 12,
    fontFamily: 'LilitaOne_400Regular',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  resumo: {
    marginTop: 10,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#edf2ef',
  },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resumoLabel: { fontSize: 15, color: '#5e6965', fontFamily: 'LuckiestGuy' },
  resumoValor: {
    fontSize: 15,
    color: '#1e2a28',
    fontFamily: 'LuckiestGuy',
  },
  totalLabel: {
    fontSize: 19,
    color: '#1e2a28',
    fontFamily: 'LuckiestGuy',
  },
  totalValor: {
    fontSize: 19,
    color: '#1a8e5f',
    fontFamily: 'LuckiestGuy',
  },
  finalizarBtn: {
    backgroundColor: '#1a8e5f',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  finalizarText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'LuckiestGuy',
  },
  descontoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ff5a5f',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  descontoText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'LuckiestGuy',
  },
});
