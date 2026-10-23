import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';

const STORAGE_KEY = '@camelion/admin-products-v1';
const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };
const defaults = [
  { id: '1', name: 'Pitaya', description: 'Pitaya fresca', price: '8.99', normal: '9.99', discount: '10', category: 'Frutas', stock: '18', emoji: '🐉', imageUri: null },
  { id: '2', name: 'Maçã', description: 'Maçã nacional selecionada', price: '3.99', normal: '3.99', discount: '0', category: 'Frutas', stock: '42', emoji: '🍎', imageUri: null },
  { id: '3', name: 'Morango', description: 'Morango fresco', price: '8.99', normal: '12.99', discount: '30', category: 'Frutas', stock: '7', emoji: '🍓', imageUri: null },
  { id: '4', name: 'Banana', description: 'Banana-prata', price: '4.50', normal: '4.50', discount: '0', category: 'Frutas', stock: '25', emoji: '🍌', imageUri: null },
  { id: '5', name: 'Alface', description: 'Alface crespa', price: '2.99', normal: '2.99', discount: '0', category: 'Verduras', stock: '3', emoji: '🥬', imageUri: null },
  { id: '6', name: 'Cenoura', description: 'Cenoura selecionada', price: '3.49', normal: '3.99', discount: '12', category: 'Verduras', stock: '12', emoji: '🥕', imageUri: null },
];
const emptyForm = { name: '', description: '', price: '', normal: '', discount: '0', category: 'Frutas', stock: '0', emoji: '🛒', imageUri: null };
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminProdutos({ navigation, route }) {
  const [products, setProducts] = useState(defaults);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(route?.params?.lowStock ? 'Estoque baixo' : 'Todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      if (saved) {
        try { setProducts(JSON.parse(saved)); } catch { setProducts(defaults); }
      }
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (route?.params?.lowStock) setFilter('Estoque baixo');
  }, [route?.params?.lowStock]);

  async function persist(next) {
    setProducts(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { Alert.alert('Armazenamento', 'Não foi possível salvar os produtos neste dispositivo.'); }
  }

  const shownProducts = useMemo(() => products.filter((p) => {
    const matchesSearch = `${p.name} ${p.description} ${p.category}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
    const matchesFilter = filter === 'Todos' || (filter === 'Estoque baixo' ? Number(p.stock) <= 8 : p.category === filter);
    return matchesSearch && matchesFilter;
  }), [products, search, filter]);

  function startAdd() {
    setEditingId(null); setForm({ ...emptyForm }); setModalVisible(true);
  }
  function startEdit(product) {
    setEditingId(product.id); setForm({ ...product }); setModalVisible(true);
  }
  function updateField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function chooseImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!result.canceled) updateField('imageUri', result.assets[0].uri);
    } catch {
      Alert.alert('Imagem', 'Não foi possível abrir a galeria. Confira se o expo-image-picker está instalado.');
    }
  }

  async function saveProduct() {
    if (!form.name.trim()) { Alert.alert('Produto', 'Informe o nome do produto.'); return; }
    if (form.price.trim() === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) { Alert.alert('Produto', 'Informe um preço de venda válido.'); return; }
    if (Number(form.stock) < 0 || form.stock.trim() === '') { Alert.alert('Produto', 'Informe um estoque válido.'); return; }
    const product = { ...form, name: form.name.trim(), description: form.description.trim(), id: editingId || String(Date.now()) };
    const next = editingId ? products.map((p) => p.id === editingId ? product : p) : [product, ...products];
    await persist(next);
    setModalVisible(false);
    Alert.alert('Sucesso', editingId ? 'Produto atualizado.' : 'Produto cadastrado.');
  }

  function deleteProduct(product) {
    Alert.alert('Excluir produto', `Deseja excluir "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await persist(products.filter((p) => p.id !== product.id));
        if (editingId === product.id) setModalVisible(false);
      } },
    ]);
  }

  const filters = ['Todos', 'Frutas', 'Verduras', 'Estoque baixo'];

  return (
    <SafeAreaScreen style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={styles.topbar}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text><Text style={styles.greeting}>Olá, Administrador</Text></View>
        <CircularIconButton icon={<Feather name="plus" size={22} color={C.white} />} onPress={startAdd} accessibilityLabel="Adicionar produto" />
      </View>
      <View style={styles.screen}>
        <View style={styles.headerRow}><Text style={styles.title}>Editar Produtos</Text><Text style={styles.count}>{products.length} produtos</Text></View>
        <View style={styles.searchBox}><Feather name="search" size={18} color={C.muted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Buscar produto..." placeholderTextColor="#9AA39F" /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((f) => <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterActive]}><Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text></TouchableOpacity>)}
        </ScrollView>
        {loading ? <Text style={styles.empty}>Carregando produtos...</Text> : (
          <FlatList
            data={shownProducts}
            numColumns={2}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum produto encontrado.</Text>}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <TouchableOpacity style={styles.productMain} onPress={() => startEdit(item)} activeOpacity={0.8}>
                  <View style={styles.productArt}>
                    {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.productImage} resizeMode="cover" /> : <Text style={styles.emoji}>{item.emoji || '🛒'}</Text>}
                    {Number(item.discount) > 0 ? <Text style={styles.discount}>{item.discount}% OFF</Text> : null}
                    {Number(item.stock) <= 8 ? <Text style={styles.stockWarning}>Baixo</Text> : null}
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.stockText}>{item.stock} un. em estoque</Text>
                  <Text style={styles.price}>{money(item.price)}</Text>
                  {Number(item.discount) > 0 ? <Text style={styles.oldPrice}>{money(item.normal)}</Text> : null}
                </TouchableOpacity>
                <View style={styles.productActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}><Feather name="edit-2" size={12} color="#FFFFFF" /><Text style={styles.actionText}>Editar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteProduct(item)}><Feather name="trash-2" size={12} color="#FFFFFF" /><Text style={styles.actionText}>Excluir</Text></TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
      <NavegacaoAdmin navigation={navigation} activeTab="Catálogo" />
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetTitleRow}><CircularIconButton icon={<Feather name="x" size={21} color="#FFFFFF" />} onPress={() => setModalVisible(false)} accessibilityLabel="Fechar formulário" /><Text style={styles.sheetTitle}>{editingId ? 'Editar Produto' : 'Adicionar Produto'}</Text><View style={{ width: 40 }} /></View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Produto</Text><TextInput style={styles.input} value={form.name} onChangeText={(v) => updateField('name', v)} placeholder="Ex.: Morango" placeholderTextColor="#929B97" />
              <Text style={styles.label}>Descrição</Text><TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={(v) => updateField('description', v)} placeholder="Descrição do produto" multiline placeholderTextColor="#929B97" />
              <View style={styles.formRow}><View style={{ flex: 1 }}><Text style={styles.label}>Preço de venda (R$)</Text><TextInput style={styles.input} value={form.price} onChangeText={(v) => updateField('price', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View><View style={{ flex: 1 }}><Text style={styles.label}>Preço normal (R$)</Text><TextInput style={styles.input} value={form.normal} onChangeText={(v) => updateField('normal', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View></View>
              <View style={styles.formRow}><View style={{ flex: 1 }}><Text style={styles.label}>Desconto (%)</Text><TextInput style={styles.input} value={form.discount} onChangeText={(v) => updateField('discount', v)} keyboardType="number-pad" placeholder="0" /></View><View style={{ flex: 1 }}><Text style={styles.label}>Estoque (un.)</Text><TextInput style={styles.input} value={form.stock} onChangeText={(v) => updateField('stock', v)} keyboardType="number-pad" placeholder="0" /></View></View>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryRow}>{['Frutas', 'Verduras', 'Mercearia', 'Bebidas'].map((cat) => <TouchableOpacity key={cat} onPress={() => updateField('category', cat)} style={[styles.categoryChip, form.category === cat && styles.categorySelected]}><Text style={[styles.categoryText, form.category === cat && styles.categoryTextSelected]}>{cat}</Text></TouchableOpacity>)}</View>
              <TouchableOpacity style={styles.imageButton} onPress={chooseImage}><Feather name="camera" size={17} color={C.green} /><Text style={styles.imageButtonText}>{form.imageUri ? 'Trocar imagem' : 'Selecionar imagem do produto'}</Text></TouchableOpacity>
              {form.imageUri ? <Image source={{ uri: form.imageUri }} style={styles.preview} resizeMode="cover" /> : null}
              <View style={styles.sheetActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={styles.saveButton} onPress={saveProduct}><Text style={styles.buttonText}>Salvar</Text></TouchableOpacity></View>
              {editingId ? <TouchableOpacity style={styles.deleteFull} onPress={() => { const p = products.find((x) => x.id === editingId); if (p) deleteProduct(p); }}><Text style={styles.deleteFullText}>Excluir produto</Text></TouchableOpacity> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  topbar: { minHeight: 70, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  kicker: { color: '#7DE1C4', fontSize: 9, fontWeight: '800' },
  greeting: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 13, paddingTop: 15, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#111715', fontSize: 23, fontWeight: '900' },
  count: { color: C.muted, fontSize: 10, fontWeight: '700' },
  searchBox: { height: 42, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, color: C.ink, fontSize: 12, paddingVertical: 8 },
  filters: { gap: 6, paddingBottom: 10 },
  filter: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5E1' },
  filterActive: { backgroundColor: C.green, borderColor: C.green },
  filterText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  grid: { paddingBottom: 20, gap: 10 },
  gridRow: { justifyContent: 'space-between', gap: 10 },
  productCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8, marginBottom: 2, elevation: 2 },
  productMain: { flex: 1 },
  productArt: { height: 105, borderRadius: 12, backgroundColor: '#F6F7F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  emoji: { fontSize: 57 },
  productImage: { width: '100%', height: '100%' },
  discount: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FF0000', color: '#FFFFFF', fontSize: 11, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, zIndex: 1 },
  stockWarning: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF0D8', color: '#A96E00', fontSize: 8, fontWeight: '900', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, zIndex: 1 },
  productName: { color: '#226842', fontSize: 16, fontWeight: '900', marginTop: 6 },
  stockText: { color: C.muted, fontSize: 9, marginTop: 1 },
  price: { color: C.success, fontSize: 14, fontWeight: '900', marginTop: 2 },
  oldPrice: { color: '#A3AAA7', fontSize: 9, textDecorationLine: 'line-through' },
  productActions: { flexDirection: 'row', gap: 5, marginTop: 8 },
  editButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green, paddingVertical: 7, borderRadius: 17 },
  deleteButton: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, paddingVertical: 7, borderRadius: 17 },
  actionText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  empty: { textAlign: 'center', padding: 25, color: C.muted, fontSize: 12 },
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
