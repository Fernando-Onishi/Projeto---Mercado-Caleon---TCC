import React, { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Alert, FlatList, Image, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import AdminHeaderActions from '../Componentes/AdminHeaderActions';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../Config/FireBaseConfig';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { formatProductUnit, getProductPrice, PRODUCTS } from '../Config/Produtos';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { useProductModal } from '../Componentes/ProductModalContext';
import { getStockSaleUnits, isExpiringSoon, isLowStock, isOutOfStock, mapAdminProduct } from './adminProdutoUtils';
import { TEST_NOTIFICATIONS } from './adminNotifications';

const C = ADMIN_THEME.colors;
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
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(120, (windowWidth - 36) / 2);
  const cardScale = cardWidth / 130;
  const [fontsLoaded] = useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });
  const { openProductModal } = useProductModal();
  const isStockFilterScreen = Boolean(route?.params?.stockFilter || route?.params?.lowStock);
  const stockFilterLabel = route?.params?.stockFilter || (route?.params?.lowStock ? 'Estoque baixo' : '');
  const stockFilterColor = stockFilterLabel === 'Estoque zerado' ? C.red : stockFilterLabel === 'Estoque baixo' ? '#FFC928' : '#FFA326';
  const [products, setProducts] = useState(localProducts);
  const [loadError, setLoadError] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

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
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <AdminNotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        navigation={navigation}
      />
      <AdminScreenLayout
        headerHeight={ADMIN_THEME.layout.topBandHeight}
        contentStyle={styles.catalogContentPanel}
        footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Catálogo" showAdd={userRole === 'admin'} />}
      >
      <View style={styles.screen}>
        {isStockFilterScreen ? (
          <View style={styles.stockHeader}>
            <AdminHeaderActions
              left={<CircularIconButton
                size={ADMIN_THEME.layout.headerActionSize}
                borderRadius={12}
                icon={<Feather name="chevron-left" size={27} color={C.white} />}
                onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ControleEstoque')}
                accessibilityLabel="Voltar ao controle de estoque"
              />}
              right={<CircularIconButton
                size={ADMIN_THEME.layout.headerActionSize}
                borderRadius={12}
                icon={<Feather name="bell" size={22} color={C.white} />}
                onPress={() => setNotificationsVisible(true)}
                accessibilityLabel="Ver alertas de estoque baixo"
              />}
            />
            <View style={styles.stockHeading}>
              <Text style={styles.stockTitle}>Controle de Estoque</Text>
              <Text style={[styles.stockFilterLabel, { color: stockFilterColor }]}>{stockFilterLabel}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.catalogHeader}>
            <AdminHeaderActions
              left={<CircularIconButton
                size={40}
                borderRadius={12}
                icon={<Feather name="chevron-left" size={27} color={C.white} />}
                onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminHome')}
                accessibilityLabel="Voltar"
              />}
              right={(
                <>
                  <CircularIconButton
                    size={40}
                    borderRadius={12}
                    icon={<Feather name="package" size={22} color={C.white} />}
                    onPress={() => navigation.navigate('ControleEstoque')}
                    accessibilityLabel="Controle de estoque"
                  />
                  <View style={styles.notificationButtonWrap}>
                    <CircularIconButton
                      size={40}
                      borderRadius={12}
                      icon={<Feather name="bell" size={22} color={C.white} />}
                      onPress={() => setNotificationsVisible(true)}
                      accessibilityLabel={`Abrir notificações, ${TEST_NOTIFICATIONS.length} disponíveis`}
                    />
                    {TEST_NOTIFICATIONS.length > 0 ? (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>{TEST_NOTIFICATIONS.length > 99 ? '99+' : TEST_NOTIFICATIONS.length}</Text>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
            />
            <Text style={styles.catalogTitle}>Editar Produtos</Text>
          </View>
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
              const stockStatus = isOutOfStock(item)
                ? { label: 'Zerado', borderColor: C.red, textColor: C.red, backgroundColor: '#FFF0F0' }
                : isExpiringSoon(item)
                  ? { label: 'Vence logo', borderColor: '#FFA326', textColor: '#A96E00', backgroundColor: '#FFF0D8' }
                  : isLowStock(item)
                    ? { label: 'Baixo', borderColor: '#FFC928', textColor: '#A96E00', backgroundColor: '#FFF6D8' }
                    : { label: 'Normal', borderColor: C.success, textColor: C.success, backgroundColor: '#E8F7EF' };
              return (
                <View style={[
                  styles.productCard,
                  { width: cardWidth, padding: cardWidth * 0.07, borderRadius: cardWidth * 0.1 },
                  isStockFilterScreen && styles.stockFilteredProductCard,
                  isStockFilterScreen && { borderColor: stockStatus.borderColor, borderWidth: 3 },
                ]}>
                  <TouchableOpacity style={styles.productMain} onPress={() => userRole === 'admin' && openProductModal({ productId: item.id, product: item.isSeedProduct ? item : undefined })} activeOpacity={0.8} disabled={userRole !== 'admin'}>
                      <View style={[styles.productArt, { height: cardWidth * 0.56, borderRadius: cardWidth * 0.06 }]}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <Feather name="package" size={42} color={C.mint} />}
                      {discount > 0 ? <Text style={[styles.discount, { fontSize: 9 * cardScale, paddingHorizontal: 5 * cardScale, paddingVertical: 2 * cardScale, borderRadius: 15 * cardScale }]}>{discount}% OFF</Text> : null}
                      {isStockFilterScreen ? <Text style={[styles.stockWarning, { color: stockStatus.textColor, backgroundColor: stockStatus.backgroundColor, fontSize: 9 * cardScale, paddingHorizontal: 5 * cardScale, paddingVertical: 3 * cardScale }]}>{stockStatus.label}</Text> : null}
                    </View>
                    <Text style={[styles.productName, { fontSize: 12 * cardScale, marginTop: 6 * cardScale }]} numberOfLines={1}>
                      {item.name} <Text style={[styles.productUnit, { fontSize: 8 * cardScale }]}>{unitLabel}</Text>
                    </Text>
                    {isStockFilterScreen ? <Text style={[styles.stockText, { fontSize: 10 * cardScale, marginTop: cardScale }]}>{stockLabel} {item.unit || 'unid.'} em estoque</Text> : null}
                    <View style={[styles.priceRow, { marginTop: cardScale }]}>
                      <Text style={[styles.price, { fontSize: 18 * cardScale }]}>{money(salePrice)}</Text>
                      {originalPrice ? <Text style={[styles.oldPrice, { fontSize: 8 * cardScale }, !isStockFilterScreen && styles.catalogOldPrice]}>{money(originalPrice)}</Text> : null}
                    </View>
                  </TouchableOpacity>
                  {userRole === 'admin' ? <View style={[styles.productActions, { marginTop: cardWidth * 0.02 }]}>
                    <TouchableOpacity style={[styles.editButton, { height: cardWidth * 0.16, borderRadius: cardWidth * 0.06 }]} onPress={() => openProductModal({ productId: item.id, product: item.isSeedProduct ? item : undefined })} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`}><Text style={[styles.actionText, { fontSize: 8.8 * cardScale }]}>Editar</Text><Feather name="edit-2" size={11 * cardScale} color="#FFFFFF" /></TouchableOpacity>
                    <TouchableOpacity style={[styles.deleteButton, { height: cardWidth * 0.16, borderRadius: cardWidth * 0.06 }]} onPress={() => deleteProduct(item)} accessibilityRole="button" accessibilityLabel={`Deletar ${item.name}`}><Text style={[styles.actionText, { fontSize: 8.8 * cardScale }]}>Deletar</Text><Feather name="trash-2" size={11 * cardScale} color="#FFFFFF" /></TouchableOpacity>
                  </View> : null}
                </View>
              );
            }}
          />
      </View>
      </AdminScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  stockHeader: { height: ADMIN_THEME.layout.panelHeaderHeight, paddingTop: 15, alignItems: 'center' },
  catalogHeader: { height: ADMIN_THEME.layout.panelHeaderHeight, backgroundColor: C.bg, paddingTop: 15, alignItems: 'center' },
  notificationButtonWrap: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: C.background, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  notificationBadgeText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  screen: { flex: 1, overflow: 'hidden' },
  catalogContentPanel: { paddingHorizontal: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 44 },
  stockHeading: { alignItems: 'center', marginTop: 14 },
  stockTitle: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 30, lineHeight: 36 },
  stockFilterLabel: { fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14, lineHeight: 20 },
  title: { color: '#111715', fontFamily: 'LilitaOne_400Regular', fontSize: 22 },
  catalogTitle: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 30, lineHeight: 36, textAlign: 'center', marginTop: 14 },
  count: { color: C.muted, fontSize: 10, fontWeight: '700' },
  searchBox: { height: 42, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, color: C.ink, fontSize: 12, paddingVertical: 8 },
  filters: { gap: 6, paddingBottom: 10 },
  filter: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5E1' },
  filterActive: { backgroundColor: C.green, borderColor: C.green },
  filterText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  grid: { paddingHorizontal: 13, paddingBottom: 20 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  productCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7ECE9', elevation: 3, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  stockFilteredProductCard: { borderWidth: 1, borderColor: '#E4E8E6', borderRadius: 22, padding: 5 },
  productMain: { flex: 1 },
  productArt: { backgroundColor: '#F1F3F5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  emoji: { fontSize: 57 },
  productImage: { width: '84%', height: '100%' },
  discount: { position: 'absolute', top: 4, left: 4, backgroundColor: '#FF3B30', color: '#FFFFFF', fontFamily: 'LilitaOne_400Regular', fontSize: 8, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, zIndex: 1 },
  stockWarning: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF0D8', color: '#A96E00', fontSize: 8, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, zIndex: 1 },
  productName: { color: C.green, fontFamily: 'Montserrat_700Bold' },
  productUnit: { color: '#7E8985', fontFamily: 'Montserrat_400Regular', fontSize: 10 },
  stockText: { color: C.muted, fontFamily: 'Montserrat_400Regular', fontSize: 9, marginTop: 1 },
  price: { color: '#00A878', fontFamily: 'LilitaOne_400Regular' },
  oldPrice: { color: '#9AA39F', fontFamily: 'Montserrat_400Regular', fontSize: 9, textDecorationLine: 'line-through' },
  catalogOldPrice: { fontSize: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productActions: { flexDirection: 'row', gap: 4 },
  editButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green, paddingHorizontal: 3 },
  deleteButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, paddingHorizontal: 3 },
  actionText: { color: '#FFFFFF', fontFamily: 'Montserrat_500Medium' },
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
