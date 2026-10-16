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
import { getFavorites, toggleFavorite as persistFavorite } from '../Config/ProdutoStorage';
import { showGlobalNotification } from '../Componentes/NotificacaoGlobal';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SACOLA_KEY = '@sacola_itens';
const DELETE_WIDTH = 80;
const FAVORITE_WIDTH = 80;
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

function SwipeableCard({ children, onDelete, onFavorite }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [favoriteCommitted, setFavoriteCommitted] = useState(false);
  const favoriteCommittedRef = useRef(false);
  const onDeleteRef = useRef(onDelete);
  const onFavoriteRef = useRef(onFavorite);
  onDeleteRef.current = onDelete;
  onFavoriteRef.current = onFavorite;

  const updateFavoriteCommitted = (value) => {
    if (favoriteCommittedRef.current !== value) {
      favoriteCommittedRef.current = value;
      setFavoriteCommitted(value);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.15,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.15,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(Math.max(Math.min(gestureState.dx, FAVORITE_WIDTH), -DELETE_WIDTH));
        updateFavoriteCommitted(gestureState.dx >= FAVORITE_WIDTH / 2);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (
          gestureState.dx < -DELETE_WIDTH / 2 ||
          (gestureState.vx < -0.5 && gestureState.dx < -20)
        ) {
          updateFavoriteCommitted(false);
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 220,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onDeleteRef.current?.();
            }
          });
        } else if (
          gestureState.dx > FAVORITE_WIDTH / 2 ||
          (gestureState.vx > 0.5 && gestureState.dx > 20)
        ) {
          onFavoriteRef.current?.();
          updateFavoriteCommitted(true);
          Animated.sequence([
            Animated.spring(translateX, {
              toValue: FAVORITE_WIDTH,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.delay(250),
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
          ]).start(({ finished }) => {
            if (finished) updateFavoriteCommitted(false);
          });
        } else {
          updateFavoriteCommitted(false);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        updateFavoriteCommitted(false);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const favoriteOpacity = translateX.interpolate({
    inputRange: [0, FAVORITE_WIDTH],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <View style={styles.swipeShadow}>
      <View style={styles.swipeContainer}>
        <Animated.View style={[styles.favoriteBtnBg, { opacity: favoriteOpacity }]}>
          <View style={styles.favoriteIconLayer}>
            <Ionicons
              name={favoriteCommitted ? 'heart' : 'heart-outline'}
              size={38}
              color="#fff"
            />
          </View>
        </Animated.View>
        <Animated.View style={[styles.deleteBtnBg, { opacity: deleteOpacity }]}>
          <View style={styles.deleteBtnAction}>
            <Feather name="trash-2" size={40} color="#fff" />
          </View>
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

  const definirFavorito = async (item) => {
    const productId =
      item.productId || PRODUCTS.find((product) => product.name === item.nome)?.id;

    try {
      const favoriteIds = await getFavorites();
      const favorito = productId
        ? !favoriteIds.includes(productId)
        : !item.favorito;

      if (productId) {
        await persistFavorite(productId);
      }

      setItens((prev) => {
        const novos = prev.map((produto) =>
          produto.id === item.id ? { ...produto, favorito } : produto
        );
        salvarSacola(novos);
        return novos;
      });
      showGlobalNotification(
        favorito
          ? `${item.nome} salvo nos favoritos`
          : `${item.nome} removido dos favoritos`
      );
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };

  const toggleFavorito = (item) => definirFavorito(item);

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
    <SwipeableCard
      key={item.id}
      onDelete={() => {
        removerItem(item.id);
        showGlobalNotification(`${item.nome} removido da sacola`);
      }}
      onFavorite={() => toggleFavorito(item)}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirDetalhes(item)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${item.nome}`}
      >
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
          </View>

          <View style={styles.produtoInfo}>
            <View style={styles.productTitleRow}>
              <Text style={styles.produtoNome}>{item.nome}</Text>
              {item.peso ? <Text style={styles.produtoPeso}>{item.peso}</Text> : null}
            </View>
            <View style={styles.precoRow}>
              <Text style={styles.produtoPreco}>
                R$ {Number(item.preco).toFixed(2).replace('.', ',')}
              </Text>
              {item.precoOriginal ? (
                <Text style={styles.precoOriginal}>
                  R$ {Number(item.precoOriginal).toFixed(2).replace('.', ',')}
                </Text>
              ) : null}
            </View>
            <View style={styles.cardMetaRow}>
              <View style={styles.quantidadeContainer}>
                <TouchableOpacity
                  style={styles.quantidadeBtn}
                  onPress={(event) => {
                    event.stopPropagation();
                    alterarQuantidade(item.id, -1);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Diminuir quantidade de ${item.nome}`}
                >
                  <Feather name="minus" size={16} color="#000" strokeWidth={3} />
                </TouchableOpacity>
                <Text style={styles.quantidadeText}>{item.quantidade}</Text>
                <TouchableOpacity
                  style={styles.quantidadeBtn}
                  onPress={(event) => {
                    event.stopPropagation();
                    alterarQuantidade(item.id, 1);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Aumentar quantidade de ${item.nome}`}
                >
                  <Feather name="plus" size={16} color="#000" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => abrirDetalhes(item)}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${item.nome}`}
            >
              <Ionicons name="chevron-forward" size={28} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

      </TouchableOpacity>
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
                <View style={[styles.resumoRow, styles.totalRow]}>
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
    marginTop: 54,
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
    paddingTop: 0,
    paddingBottom: 20,
  },
  checkoutSection: {
    paddingHorizontal: 14,
    paddingTop: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
  favoriteBtnBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: FAVORITE_WIDTH,
    backgroundColor: '#40B190',
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIconLayer: {
    position: 'absolute',
    width: FAVORITE_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 26,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#edf0ee',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  imagemContainer: {
    position: 'relative',
    width: 94,
    height: 94,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  produtoImagem: { width: 90, height: 90, borderRadius: 12 },
  produtoInfo: { flex: 1, marginLeft: 10 },
  produtoNome: {
    fontSize: 22,
    lineHeight: 27,
    color: '#1b6848',
    fontFamily: 'LuckiestGuy',
  },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  produtoPeso: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#40B190',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: 'LuckiestGuy',
  },
  precoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  produtoPreco: {
    fontSize: 21,
    lineHeight: 26,
    color: '#008f65',
    fontFamily: 'LuckiestGuy',
  },
  precoOriginal: {
    fontSize: 14,
    color: '#8b938f',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    fontFamily: 'LuckiestGuy',
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  cardActions: { alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  actionBtn: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    width: 40,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#40B190',
    borderRadius: 16,
    paddingHorizontal: 7,
    paddingVertical: 6,
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
    minWidth: 27,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'LuckiestGuy',
    marginHorizontal: 4,
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
    marginTop: 0,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalRow: {
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    paddingTop: 7,
    marginBottom: 1,
  },
  resumoLabel: { fontSize: 17, color: '#999', fontFamily: 'LuckiestGuy' },
  resumoValor: {
    fontSize: 17,
    color: '#999',
    fontFamily: 'LuckiestGuy',
  },
  totalLabel: {
    fontSize: 22,
    color: '#00a878',
    fontFamily: 'LuckiestGuy',
  },
  totalValor: {
    fontSize: 22,
    color: '#1a8e5f',
    fontFamily: 'LuckiestGuy',
  },
  finalizarBtn: {
    backgroundColor: '#00a878',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 7,
  },
  finalizarText: {
    color: '#fff',
    fontSize: 21,
    fontFamily: 'LuckiestGuy',
  },
  descontoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ff5a5f',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  descontoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'LuckiestGuy',
  },
});
