import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { ADMIN_THEME } from '../Config/AdminTheme';

const KEY = '@camelion/admin-products-v1';
const C = ADMIN_THEME.colors;
const blank = { name: '', description: '', price: '', normal: '', discount: '0', category: 'Frutas', stock: '0', emoji: '🍎', imageUri: null };

export default function AdminEditarProduto({ navigation, route }) {
  const [fontsLoaded] = useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(route?.params?.productId || null);
  const [form, setForm] = useState(blank);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!active) return;
      const parsed = raw ? JSON.parse(raw) : [];
      setProducts(Array.isArray(parsed) ? parsed : []);
      const target = parsed.find((p) => p.id === (route?.params?.productId || selectedId));
      if (target) setForm({ ...target });
      setLoaded(true);
    }).catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function chooseImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!result.canceled) update('imageUri', result.assets[0].uri);
    } catch {
      Alert.alert('Imagem', 'Não foi possível abrir a galeria.');
    }
  }

  async function save() {
    if (!form.name.trim()) { Alert.alert('Produto', 'Informe o nome do produto.'); return; }
    if (form.price.trim() === '' || Number(form.price) < 0 || !Number.isFinite(Number(form.price))) { Alert.alert('Produto', 'Informe um preço válido.'); return; }
    const id = selectedId || String(Date.now());
    const nextProduct = { ...form, id, name: form.name.trim(), description: form.description.trim() };
    const next = selectedId ? products.map((p) => p.id === selectedId ? nextProduct : p) : [nextProduct, ...products];
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setProducts(next);
      setSelectedId(id);
      Alert.alert('Produto salvo', 'As informações foram salvas neste dispositivo.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
    }
  }

  function selectProduct(product) {
    setSelectedId(product.id);
    setForm({ ...product });
  }

  async function remove() {
    if (!selectedId) { setForm(blank); return; }
    Alert.alert('Excluir produto', `Deseja excluir "${form.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        const next = products.filter((p) => p.id !== selectedId);
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        setProducts(next); setSelectedId(null); setForm(blank);
        Alert.alert('Excluído', 'Produto removido.');
      } },
    ]);
  }

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <AdminScreenLayout
        headerHeight={72}
        contentStyle={styles.contentPanel}
        headerContent={<View style={styles.topbar}><View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View><View style={{ flex: 1 }}><Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text><Text style={styles.greeting}>Olá, Administrador</Text></View><CircularIconButton icon={<Feather name="help-circle" size={30} color="#FFFFFF" />} onPress={() => Alert.alert('Ajuda', 'Preencha os campos e toque em Salvar.')} accessibilityLabel="Ajuda" /></View>}
        footerContent={<NavegacaoAdmin navigation={navigation} activeTab="Adicionar" />}
      >
      <View style={styles.screen}>
        <View style={styles.titleRow}><CircularIconButton icon={<Feather name="chevron-left" size={30} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" /><Text style={styles.title}>Editar Produtos</Text></View>
        {products.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>{products.map((p) => <TouchableOpacity key={p.id} onPress={() => selectProduct(p)} style={[styles.productChip, selectedId === p.id && styles.productChipActive]}><Text style={[styles.productChipText, selectedId === p.id && styles.productChipTextActive]}>{p.name}</Text></TouchableOpacity>)}</ScrollView> : null}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Produto</Text><TextInput style={styles.input} value={form.name} onChangeText={(v) => update('name', v)} placeholder="Ex.: Morango" placeholderTextColor="#929B97" />
          <Text style={styles.label}>Descrição</Text><TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={(v) => update('description', v)} placeholder="Descrição do produto" multiline placeholderTextColor="#929B97" />
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>Preço de venda (R$)</Text><TextInput style={styles.input} value={form.price} onChangeText={(v) => update('price', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View><View style={{ flex: 1 }}><Text style={styles.label}>Preço normal (R$)</Text><TextInput style={styles.input} value={form.normal} onChangeText={(v) => update('normal', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View><View style={{ flex: 0.8 }}><Text style={styles.label}>Desconto %</Text><TextInput style={styles.input} value={form.discount} onChangeText={(v) => update('discount', v)} keyboardType="number-pad" placeholder="0" /></View></View>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>Categoria</Text><View style={styles.categoryRow}>{['Frutas', 'Verduras', 'Mercearia', 'Bebidas'].map((cat) => <TouchableOpacity key={cat} onPress={() => update('category', cat)} style={[styles.category, form.category === cat && styles.categoryActive]}><Text style={[styles.categoryText, form.category === cat && styles.categoryTextActive]}>{cat}</Text></TouchableOpacity>)}</View></View><View style={{ flex: 0.6 }}><Text style={styles.label}>Estoque</Text><TextInput style={styles.input} value={form.stock} onChangeText={(v) => update('stock', v)} keyboardType="number-pad" placeholder="0" /></View></View>
          <TouchableOpacity style={styles.imageButton} onPress={chooseImage}><Feather name="camera" size={28} color={C.green} /><Text style={styles.imageButtonText}>{form.imageUri ? 'Trocar imagem' : 'Adicionar foto do produto'}</Text></TouchableOpacity>
          {form.imageUri ? <Image source={{ uri: form.imageUri }} style={styles.preview} resizeMode="cover" /> : <View style={styles.previewPlaceholder}><Text style={{ fontSize: 40 }}>{form.emoji || '🛒'}</Text><Text style={styles.muted}>Prévia do produto</Text></View>}
          <View style={styles.buttons}><TouchableOpacity style={styles.saveButton} onPress={save}><Text style={styles.buttonText}>Salvar</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => { setForm(blank); setSelectedId(null); }}><Text style={styles.buttonText}>Limpar</Text></TouchableOpacity></View>
          <TouchableOpacity style={styles.deleteButton} onPress={remove}><Text style={styles.deleteText}>Excluir produto selecionado</Text></TouchableOpacity>
          {!loaded ? <Text style={styles.muted}>Carregando catálogo...</Text> : null}
        </ScrollView>
      </View>
      </AdminScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  topbar: { minHeight: 72, paddingHorizontal: ADMIN_THEME.layout.contentPadding, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: ADMIN_THEME.layout.headerActionSize, height: ADMIN_THEME.layout.headerActionSize, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: C.white, fontFamily: ADMIN_THEME.fonts.display, fontSize: 24 },
  kicker: { color: '#A8E8D1', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 10 },
  greeting: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 17, marginTop: 2 },
  contentPanel: { paddingHorizontal: 0 },
  screen: { flex: 1, paddingHorizontal: ADMIN_THEME.layout.headerSidePadding, paddingTop: ADMIN_THEME.layout.contentTopSpacing, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 23 },
  title: { color: '#111715', fontFamily: ADMIN_THEME.fonts.display, fontSize: 28 },
  productPicker: { gap: 7, paddingBottom: 8 },
  productChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: '#DDE5E1' },
  productChipActive: { backgroundColor: C.green, borderColor: C.green },
  productChipText: { color: C.muted, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 11 },
  productChipTextActive: { color: '#FFFFFF' },
  form: { paddingBottom: 25 },
  label: { color: '#111715', fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12, marginTop: 12, marginBottom: 5 },
  input: { minHeight: 48, backgroundColor: C.white, borderWidth: 1, borderColor: '#E0E6E2', borderRadius: 10, paddingHorizontal: 12, color: C.ink, fontFamily: ADMIN_THEME.fonts.body, fontSize: 14 },
  multiline: { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  category: { borderRadius: 16, backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#DDE5E1' },
  categoryActive: { backgroundColor: C.green, borderColor: C.green },
  categoryText: { color: C.muted, fontFamily: ADMIN_THEME.fonts.medium, fontSize: 10 },
  categoryTextActive: { color: '#FFFFFF' },
  imageButton: { minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF5EC', borderRadius: 12, paddingHorizontal: 14, marginTop: 16 },
  imageButtonText: { color: C.green, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 13 },
  preview: { width: 110, height: 110, borderRadius: 12, alignSelf: 'center', marginTop: 12 },
  previewPlaceholder: { minHeight: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderRadius: 12, marginTop: 12, gap: 4 },
  muted: { color: C.muted, fontFamily: ADMIN_THEME.fonts.body, fontSize: 12, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: C.success, borderRadius: 12 },
  cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: C.red, borderRadius: 12 },
  buttonText: { color: C.white, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 14 },
  deleteButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 12 },
  deleteText: { color: C.red, fontFamily: ADMIN_THEME.fonts.bold, fontSize: 12 },
});
