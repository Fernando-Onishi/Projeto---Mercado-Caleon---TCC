import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';

const KEY = '@camelion/admin-products-v1';
const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };
const blank = { name: '', description: '', price: '', normal: '', discount: '0', category: 'Frutas', stock: '0', emoji: '🍎', imageUri: null };

export default function AdminEditarProduto({ navigation, route }) {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={styles.topbar}><View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View><View style={{ flex: 1 }}><Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text><Text style={styles.greeting}>Olá, Administrador</Text></View><TouchableOpacity style={styles.bell} onPress={() => Alert.alert('Ajuda', 'Preencha os campos e toque em Salvar.')}><Feather name="help-circle" size={20} color="#FFFFFF" /></TouchableOpacity></View>
      <View style={styles.screen}>
        <View style={styles.titleRow}><TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Feather name="chevron-left" size={22} color="#FFFFFF" /></TouchableOpacity><Text style={styles.title}>Editar Produtos</Text></View>
        {products.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>{products.map((p) => <TouchableOpacity key={p.id} onPress={() => selectProduct(p)} style={[styles.productChip, selectedId === p.id && styles.productChipActive]}><Text style={[styles.productChipText, selectedId === p.id && styles.productChipTextActive]}>{p.name}</Text></TouchableOpacity>)}</ScrollView> : null}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Produto</Text><TextInput style={styles.input} value={form.name} onChangeText={(v) => update('name', v)} placeholder="Ex.: Morango" placeholderTextColor="#929B97" />
          <Text style={styles.label}>Descrição</Text><TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={(v) => update('description', v)} placeholder="Descrição do produto" multiline placeholderTextColor="#929B97" />
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>Preço de venda (R$)</Text><TextInput style={styles.input} value={form.price} onChangeText={(v) => update('price', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View><View style={{ flex: 1 }}><Text style={styles.label}>Preço normal (R$)</Text><TextInput style={styles.input} value={form.normal} onChangeText={(v) => update('normal', v.replace(',', '.'))} keyboardType="decimal-pad" placeholder="0,00" /></View><View style={{ flex: 0.8 }}><Text style={styles.label}>Desconto %</Text><TextInput style={styles.input} value={form.discount} onChangeText={(v) => update('discount', v)} keyboardType="number-pad" placeholder="0" /></View></View>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>Categoria</Text><View style={styles.categoryRow}>{['Frutas', 'Verduras', 'Mercearia', 'Bebidas'].map((cat) => <TouchableOpacity key={cat} onPress={() => update('category', cat)} style={[styles.category, form.category === cat && styles.categoryActive]}><Text style={[styles.categoryText, form.category === cat && styles.categoryTextActive]}>{cat}</Text></TouchableOpacity>)}</View></View><View style={{ flex: 0.6 }}><Text style={styles.label}>Estoque</Text><TextInput style={styles.input} value={form.stock} onChangeText={(v) => update('stock', v)} keyboardType="number-pad" placeholder="0" /></View></View>
          <TouchableOpacity style={styles.imageButton} onPress={chooseImage}><Feather name="camera" size={18} color={C.green} /><Text style={styles.imageButtonText}>{form.imageUri ? 'Trocar imagem' : 'Adicionar foto do produto'}</Text></TouchableOpacity>
          {form.imageUri ? <Image source={{ uri: form.imageUri }} style={styles.preview} resizeMode="cover" /> : <View style={styles.previewPlaceholder}><Text style={{ fontSize: 40 }}>{form.emoji || '🛒'}</Text><Text style={styles.muted}>Prévia do produto</Text></View>}
          <View style={styles.buttons}><TouchableOpacity style={styles.saveButton} onPress={save}><Text style={styles.buttonText}>Salvar</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => { setForm(blank); setSelectedId(null); }}><Text style={styles.buttonText}>Limpar</Text></TouchableOpacity></View>
          <TouchableOpacity style={styles.deleteButton} onPress={remove}><Text style={styles.deleteText}>Excluir produto selecionado</Text></TouchableOpacity>
          {!loaded ? <Text style={styles.muted}>Carregando catálogo...</Text> : null}
        </ScrollView>
      </View>
      <NavegacaoAdmin navigation={navigation} activeTab="Editar" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  topbar: { minHeight: 70, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  kicker: { color: '#7DE1C4', fontSize: 9, fontWeight: '800' },
  greeting: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
  bell: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 14, paddingTop: 13, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#111715', fontSize: 22, fontWeight: '900' },
  productPicker: { gap: 7, paddingBottom: 8 },
  productChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 1, borderColor: '#DDE5E1' },
  productChipActive: { backgroundColor: C.green, borderColor: C.green },
  productChipText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  productChipTextActive: { color: '#FFFFFF' },
  form: { paddingBottom: 25 },
  label: { color: '#111715', fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { minHeight: 43, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6E2', borderRadius: 8, paddingHorizontal: 10, color: C.ink, fontSize: 12 },
  multiline: { minHeight: 58, textAlignVertical: 'top', paddingTop: 10 },
  row: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  category: { borderRadius: 15, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 7, borderWidth: 1, borderColor: '#DDE5E1' },
  categoryActive: { backgroundColor: C.green, borderColor: C.green },
  categoryText: { color: C.muted, fontSize: 9, fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF' },
  imageButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDF5EC', borderRadius: 10, padding: 12, marginTop: 15 },
  imageButtonText: { color: C.green, fontSize: 11, fontWeight: '800' },
  preview: { width: 90, height: 90, borderRadius: 10, alignSelf: 'center', marginTop: 10 },
  previewPlaceholder: { minHeight: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, marginTop: 10, gap: 3 },
  muted: { color: C.muted, fontSize: 10, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 15 },
  saveButton: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: C.success, borderRadius: 18 },
  cancelButton: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: C.red, borderRadius: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  deleteButton: { alignItems: 'center', padding: 12 },
  deleteText: { color: C.red, fontSize: 11, fontWeight: '800' },
});
