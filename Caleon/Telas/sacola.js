import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

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

export default function TelaSacola({ navigation }) {
  const [itens, setItens] = useState(itensIniciais);

  const alterarQuantidade = (id, delta) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantidade: Math.max(1, item.quantidade + delta) }
          : item
      )
    );
  };

  const removerItem = (id) => {
    setItens((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleFavorito = (id) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, favorito: !item.favorito } : item
      )
    );
  };

  const subtotal = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const taxaServico = 5.0;
  const total = subtotal + taxaServico;

  const renderItem = (item) => (
    <View key={item.id} style={styles.card}>
      {item.desconto && (
        <View style={styles.descontoBadge}>
          <Text style={styles.descontoText}>{item.desconto}</Text>
        </View>
      )}

      <View style={styles.cardRow}>
        <Image source={item.imagem} style={styles.produtoImagem} resizeMode="contain" />

        <View style={styles.produtoInfo}>
          <Text style={styles.produtoNome}>{item.nome}</Text>
          <View style={styles.precoRow}>
            <Text style={styles.produtoPreco}>
              R$ {item.preco.toFixed(2).replace('.', ',')}
              <Text style={styles.produtoUnidade}>{item.unidade}</Text>
            </Text>
            {item.precoOriginal && (
              <Text style={styles.precoOriginal}>
                R${item.precoOriginal.toFixed(2).replace('.', ',')}/u
              </Text>
            )}
          </View>
          {item.peso && <Text style={styles.produtoPeso}>{item.peso}</Text>}
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
              style={styles.deletarBtn}
              onPress={() => removerItem(item.id)}
            >
              <Ionicons name="trash-outline" size={22} color="#e74c3c" />
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltarBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Sacola</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.lista} contentContainerStyle={{ paddingBottom: 20 }}>
        {itens.map(renderItem)}

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
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('TelaHome')}>
          <Ionicons name="home-outline" size={22} color="#888" />
          <Text style={styles.tabLabel}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('TelaFavorito')}>
          <Ionicons name="heart-outline" size={22} color="#888" />
          <Text style={styles.tabLabel}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItemAtivo}>
          <Ionicons name="bag-handle" size={22} color="#1a8e5f" />
          <Text style={[styles.tabLabel, { color: '#1a8e5f' }]}>Sacola</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="grid-outline" size={22} color="#888" />
          <Text style={styles.tabLabel}>Catálogo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person-outline" size={22} color="#888" />
          <Text style={styles.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f7',
  },
  header: {
    backgroundColor: '#1a8e5f',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  voltarBtn: {
    padding: 4,
  },
  headerTitulo: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  lista: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  produtoImagem: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  produtoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  precoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  produtoPreco: {
    fontSize: 14,
    color: '#1a8e5f',
    fontWeight: 'bold',
  },
  produtoUnidade: {
    fontSize: 12,
    color: '#1a8e5f',
    fontWeight: 'normal',
  },
  precoOriginal: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  produtoPeso: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletarBtn: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 10,
  },
  favoritoBtnAtivo: {
    backgroundColor: '#1a8e5f',
    borderRadius: 10,
    padding: 10,
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  quantidadeBtn: {
    padding: 6,
  },
  quantidadeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#222',
  },
  resumo: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resumoLabel: {
    fontSize: 14,
    color: '#666',
  },
  resumoValor: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  totalValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  finalizarBtn: {
    backgroundColor: '#1a8e5f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  finalizarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  descontoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  descontoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemAtivo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});