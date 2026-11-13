import React, { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Alert, FlatList, Image, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useNavigationState } from '@react-navigation/native';
import { db } from '../Config/FireBaseConfig';
import { formatProductUnit, getProductPrice, PRODUCTS } from '../Config/Produtos';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { getStockSaleUnits, isExpiringSoon, isLowStock, isOutOfStock, mapAdminProduct } from './adminProdutoUtils';

const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const localProducts = PRODUCTS.map((product) => ({
  ...product,
  active: true,
  isSeedProduct: true,
  imageUrls: product.imageUrl ? [product.imageUrl] : [],
  stockCurrent: 0,
  stockMinimum: 0,
  stockCritical: 0,
}));

export default function AdminProdutos({ navigation, route, userRole }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(120, (windowWidth - 56) / 2);
  const [fontsLoaded] = useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });
  const activeRouteName = useNavigationState((state) => state.routes[state.index]?.name);
  const isStockFilterScreen = Boolean(route?.params?.stockFilter || route?.params?.lowStock);
  const stockFilterLabel = route?.params?.stockFilter || (route?.params?.lowStock ? 'Estoque baixo' : '');
  const stockFilterColor = stockFilterLabel === 'Estoque zerado' ? C.red : stockFilterLabel === 'Estoque baixo' ? '#FFC928' : '#FFA326';
  const [products, setProducts] = useState(localProducts);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      const mergedProducts = new Map(localProducts.map((product) => [product.id, product]));
      snapshot.docs.forEach((productDocument) => {
        const data = productDocument.data();
        if (data.active === false) {
          mergedProducts.delete(productDocument.id);
          return;
        }
        const product = mapAdminProduct(productDocument);
        if (product) mergedProducts.set(product.id, { ...product, isSeedProduct: false });
      });
      setProducts([...mergedProducts.values()]);
    }, (error) => {
      console.error('Não foi possível carregar o catálogo administrativo.', error);
      setLoadError(true);
    });
  }, []);

  const filter = stockFilterLabel || 'Todos';
  const shownProducts = useMemo(() => products.filter((p) => {
    const matchesFilter = filter === 'Todos'
      || (filter === 'Estoque baixo' ? isLowStock(p)
        : filter === 'Estoque zerado' ? isOutOfStock(p)
          : filter === 'Vencimento próximo' ? isExpiringSoon(p)
            : p.category === filter);
    return matchesFilter;
  }), [products, filter]);

  function deleteProduct(product) {
    Alert.alert('Excluir produto', `Deseja excluir "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await setDoc(doc(db, 'products', product.id), { active: false, updatedAt: serverTimestamp() }, { merge: true });
          } catch (error) {
            console.error('Não foi possível excluir o produto.', error);
            Alert.alert('Erro', 'Não foi possível excluir o produto. Confira sua conexão e suas permissões.');
          }
        },
      },
    ]);
  }

  if (!fontsLoaded) return null;

  return (
    <SafeAreaScreen style={styles.safe} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      {isStockFilterScreen ? (
        <View style={[styles.stockTopbar, { paddingTop: insets.top }]}>
          <CircularIconButton
            size={24}
            icon={<Feather name="chevron-left" size={17} color={C.white} />}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ControleEstoque')}
            accessibilityLabel="Voltar ao controle de estoque"
          />
          <View style={styles.stockHeaderSpacer} />
          <CircularIconButton
            size={24}
            borderRadius={7}
            icon={<Feather name="bell" size={15} color={C.white} />}
            onPress={() => navigation.navigate('AdminProdutos', { stockFilter: 'Estoque baixo' })}
            accessibilityLabel="Ver alertas de estoque baixo"
          />
        </View>
      ) : (
        <View style={[styles.catalogTopbar, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <CircularIconButton
            size={40}
            borderRadius={12}
            icon={<Feather name="chevron-left" size={27} color={C.white} />}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminHome')}
            accessibilityLabel="Voltar"
          />
          <View style={styles.catalogHeaderSpacer} />
          <CircularIconButton
            size={40}
            borderRadius={12}
            icon={<Feather name="package" size={22} color={C.white} />}
            onPress={() => navigation.navigate('ControleEstoque')}
            accessibilityLabel="Controle de estoque"
          />
        </View>
      )}
      <View style={[styles.screen, !isStockFilterScreen && styles.catalogScreen]}>
        {isStockFilterScreen ? (
          <View style={styles.stockHeading}>
            <Text style={styles.stockTitle}>Controle de Estoque</Text>
            <Text style={[styles.stockFilterLabel, { color: stockFilterColor }]}>{stockFilterLabel}</Text>
          </View>
        ) : (
          <View style={styles.headerRow}><Text style={[styles.title, styles.catalogTitle]}>Editar Produtos</Text></View>
        )}
          <FlatList
            data={shownProducts}
            numColumns={2}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.empty}>{loadError ? 'Não foi possível carregar o catálogo.' : 'Nenhum produto encontrado.'}</Text>}
            renderItem={({ item }) => {
              const stockUnits = getStockSaleUnits(item);
              const stockLabel = Number.isInteger(stockUnits) ? String(stockUnits) : stockUnits.toFixed(1).replace('.', ',');
              const discount = item.originalPricePerKg
                ? Math.round((1 - item.pricePerKg / item.originalPricePerKg) * 100)
                : 0;
              const unitLabel = formatProductUnit(item, item.defaultWeightGrams);
              const salePrice = Number(item.priceCents) > 0
                ? Number(item.priceCents) / 100
                : getProductPrice(item, item.defaultWeightGrams);
              const originalPrice = Number(item.normalPriceCents) > 0
                ? Number(item.normalPriceCents) / 100
                : item.originalPricePerKg ? getProductPrice({ ...item, pricePerKg: item.originalPricePerKg }, item.defaultWeightGrams) : null;
              return (
                <View style={[styles.productCard, { width: cardWidth }, isStockFilterScreen && styles.stockFilteredProductCard]}>
                  <TouchableOpacity style={styles.productMain} onPress={() => userRole === 'admin' && navigation.navigate('AdminCriarProduto', { productId: item.id, product: item.isSeedProduct ? item : undefined })} activeOpacity={0.8} disabled={userRole !== 'admin'}>
                    <View style={[styles.productArt, { height: cardWidth * 0.56 }, isStockFilterScreen && styles.stockFilteredProductArt]}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode={isStockFilterScreen ? 'cover' : 'contain'} /> : <Feather name="package" size={42} color={C.mint} />}
                      {discount > 0 ? <Text style={styles.discount}>{discount}% OFF</Text> : null}
                      {isStockFilterScreen && (isLowStock(item) || isOutOfStock(item)) ? <Text style={styles.stockWarning}>{isOutOfStock(item) ? 'Zerado' : 'Baixo'}</Text> : null}
                    </View>
                    <Text style={[styles.productName, isStockFilterScreen && styles.stockFilteredProductName]} numberOfLines={1}>
                      {item.name} <Text style={styles.productUnit}>{unitLabel}</Text>
                    </Text>
                    {isStockFilterScreen ? <Text style={styles.stockText}>{stockLabel} {item.unit || 'unid.'} em estoque</Text> : null}
                    <View style={styles.priceRow}>
                      <Text style={[styles.price, isStockFilterScreen && styles.stockFilteredPrice]}>{money(salePrice)}</Text>
                      {originalPrice ? <Text style={[styles.oldPrice, !isStockFilterScreen && styles.catalogOldPrice]}>{money(originalPrice)}</Text> : null}
                    </View>
                  </TouchableOpacity>
                  {userRole === 'admin' ? <View style={styles.productActions}>
                    <TouchableOpacity style={[styles.editButton, !isStockFilterScreen && styles.catalogActionButton]} onPress={() => navigation.navigate('AdminCriarProduto', { productId: item.id, product: item.isSeedProduct ? item : undefined })} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`}><Feather name="edit-2" size={12} color="#FFFFFF" /><Text style={styles.actionText}>Editar</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.deleteButton, !isStockFilterScreen && styles.catalogActionButton]} onPress={() => deleteProduct(item)} accessibilityRole="button" accessibilityLabel={`Deletar ${item.name}`}><Feather name="trash-2" size={12} color="#FFFFFF" /><Text style={styles.actionText}>Deletar</Text></TouchableOpacity>
                  </View> : null}
                </View>
              );
            }}
          />
      </View>
      <NavegacaoAdmin navigation={navigation} activeTab={activeRouteName === 'AdminCriarProduto' ? 'Adicionar' : 'Catálogo'} showAdd={userRole === 'admin'} />
      <View style={[styles.safeAreaBottom, { height: insets.bottom }]} />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  safeAreaBottom: { backgroundColor: '#F1F3F5' },
  stockTopbar: { minHeight: 50, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.green },
  stockHeaderSpacer: { flex: 1 },
  catalogTopbar: { minHeight: 40, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: C.green },
  catalogHeaderSpacer: { flex: 1 },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 18, overflow: 'hidden' },
  catalogScreen: { paddingHorizontal: 12, paddingTop: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stockHeading: { alignItems: 'center', marginBottom: 5 },
  stockTitle: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 20, lineHeight: 25 },
  stockFilterLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 11, lineHeight: 16 },
  title: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 22 },
  catalogTitle: { flex: 1, textAlign: 'center', fontSize: 30, marginBottom: 0 },
  count: { color: C.muted, fontSize: 10, fontWeight: '700' },
  searchBox: { height: 42, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, color: C.ink, fontSize: 12, paddingVertical: 8 },
  filters: { gap: 6, paddingBottom: 10 },
  filter: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5E1' },
  filterActive: { backgroundColor: C.green, borderColor: C.green },
  filterText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  grid: { paddingBottom: 16, gap: 9 },
  gridRow: { justifyContent: 'space-between', gap: 9 },
  productCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, marginBottom: 1, borderWidth: 1, borderColor: '#E7ECE9', elevation: 2, shadowColor: '#1B4B3D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
  stockFilteredProductCard: { borderWidth: 1, borderColor: '#E4E8E6', borderRadius: 9, padding: 5 },
  productMain: { flex: 1 },
  productArt: { borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  stockFilteredProductArt: { height: 72, borderRadius: 7 },
  emoji: { fontSize: 57 },
  productImage: { width: '100%', height: '100%' },
  discount: { position: 'absolute', top: 4, left: 4, backgroundColor: '#FF3B30', color: '#FFFFFF', fontFamily: 'LilitaOne_400Regular', fontSize: 8, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, zIndex: 1 },
  stockWarning: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF0D8', color: '#A96E00', fontSize: 8, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, zIndex: 1 },
  productName: { color: C.green, fontFamily: 'Montserrat_700Bold', fontSize: 15, marginTop: 5 },
  stockFilteredProductName: { fontSize: 11, marginTop: 3 },
  productUnit: { color: '#7E8985', fontFamily: 'Montserrat_400Regular', fontSize: 10 },
  stockText: { color: C.muted, fontFamily: 'Montserrat_400Regular', fontSize: 9, marginTop: 1 },
  price: { color: C.green, fontFamily: 'LilitaOne_400Regular', fontSize: 16, marginTop: 2 },
  stockFilteredPrice: { fontSize: 9, marginTop: 1 },
  oldPrice: { color: '#9AA39F', fontFamily: 'Montserrat_400Regular', fontSize: 9, textDecorationLine: 'line-through' },
  catalogOldPrice: { fontSize: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productActions: { flexDirection: 'row', gap: 5, marginTop: 7 },
  editButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green, paddingVertical: 7, borderRadius: 14 },
  deleteButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, paddingVertical: 7, borderRadius: 14 },
  actionText: { color: '#FFFFFF', fontFamily: 'Montserrat_500Medium', fontSize: 10 },
  empty: { textAlign: 'center', padding: 25, color: C.muted, fontFamily: 'Montserrat_400Regular', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: C.bg, borderTopLeftRadius: 23, borderTopRightRadius: 23, paddingHorizontal: 15, paddingTop: 9, paddingBottom: 18 },
  handle: { width: 52, height: 4, borderRadius: 3, backgroundColor: '#909895', alignSelf: 'center', marginBottom: 12 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { color: '#111715', fontSize: 18, fontWeight: '900' },
  label: { color: '#171B19', fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { minHeight: 42, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E6E3', paddingHorizontal: 10, color: C.ink, fontSize: 12 },
  multiline: { minHeight: 58, textAlignVertical: 'top', paddingTop: 10 },
  formRow: { flexDirection: 'row', gap: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  categoryChip: { borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5E1', paddingHorizontal: 12, paddingVertical: 8 },
  categorySelected: { backgroundColor: C.green, borderColor: C.green },
  categoryText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  categoryTextSelected: { color: '#FFFFFF' },
  imageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#DDF5EC', borderRadius: 10, marginTop: 13 },
  imageButtonText: { color: C.green, fontSize: 11, fontWeight: '800' },
  preview: { width: 80, height: 80, borderRadius: 10, alignSelf: 'center', marginTop: 8 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 15 },
  cancelButton: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: C.red },
  saveButton: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: C.success },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  deleteFull: { alignItems: 'center', padding: 10, marginTop: 4 },
  deleteFullText: { color: C.red, fontWeight: '800', fontSize: 11 },
});
