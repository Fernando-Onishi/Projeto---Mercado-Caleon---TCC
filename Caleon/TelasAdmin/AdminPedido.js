import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';

const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };
const initialItems = [
  { id: 'a', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 7.50 },
  { id: 'b', name: 'Maçã', detail: 'Bandeja selecionada', qty: '1,2 kg', price: 7.50 },
  { id: 'c', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 7.50 },
  { id: 'd', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 7.50 },
  { id: 'e', name: 'Pitaya', detail: '1 kg · Hortifruti', qty: '1,2 kg', price: 7.50 },
];

export default function AdminPedido({ navigation, route }) {
  const orderId = route?.params?.orderId || '897';
  const [checked, setChecked] = useState(['a', 'b', 'c']);
  const [items, setItems] = useState(initialItems);
  const [finished, setFinished] = useState(false);
  const checkedCount = checked.length;
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const currency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function toggleItem(id) {
    setChecked((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function cancelOrder() {
    Alert.alert('Cancelar compra', 'Deseja realmente cancelar este pedido?', [
      { text: 'Continuar pedido', style: 'cancel' },
      { text: 'Cancelar compra', style: 'destructive', onPress: () => { setFinished(true); Alert.alert('Pedido cancelado', `O pedido #${orderId} foi cancelado.`); navigation.navigate('AdminHome'); } },
    ]);
  }

  function finishOrder() {
    if (checkedCount < items.length) {
      Alert.alert('Conferência incompleta', 'Confira todos os itens antes de concluir a separação.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Concluir mesmo assim', onPress: () => complete() },
      ]);
      return;
    }
    complete();
  }

  function complete() {
    setFinished(true);
    Alert.alert('Separação concluída', `O pedido #${orderId} está pronto.`);
    navigation.navigate('AdminHome');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={styles.topbar}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text><Text style={styles.greeting}>Olá, Administrador</Text></View>
        <TouchableOpacity style={styles.bell} onPress={() => Alert.alert('Notificações', 'Você está visualizando o pedido atual.')}><Feather name="bell" size={19} color="#FFFFFF" /></TouchableOpacity>
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitleRow}><TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Feather name="chevron-left" size={22} color="#FFFFFF" /></TouchableOpacity><Text style={styles.pageTitle}>Detalhe do Pedido</Text></View>
        <View style={styles.customerCard}>
          <View style={styles.avatar}><Feather name="user" size={21} color="#A3AAA7" /></View>
          <View style={styles.customerInfo}><Text style={styles.customerName}>Christian Godoi</Text><Text style={styles.meta}>◷ Recebido às 14:32 (há 14 min)</Text></View>
          <Text style={styles.orderNumber}>#{orderId}</Text>
        </View>
        <View style={styles.itemsCard}>
          <View style={styles.itemsHeading}><Text style={styles.itemsTitle}><Text style={styles.countBadge}>15</Text> Itens do Pedido</Text><Text style={styles.counter}>{checkedCount}/{items.length} conferidos</Text></View>
          {items.map((item) => {
            const isChecked = checked.includes(item.id);
            return (
              <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id)} activeOpacity={0.75}>
                <View style={styles.productThumb}><Text style={{ fontSize: 22 }}>{item.name === 'Maçã' ? '🍎' : '🐉'}</Text></View>
                <View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.meta}>{item.detail}</Text></View>
                <View style={styles.priceColumn}><Text style={styles.qty}>{item.qty}</Text><Text style={styles.itemPrice}>{currency(item.price)}</Text></View>
                <View style={[styles.check, isChecked && styles.checked]}>{isChecked ? <Feather name="check" size={17} color="#FFFFFF" /> : null}</View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.totals}>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>{currency(subtotal)}</Text></View>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Taxa de serviço:</Text><Text style={styles.totalValue}>{currency(5)}</Text></View>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Forma de pagamento:</Text><Text style={styles.payment}>PIX aprovado</Text></View>
            <View style={styles.dashed} />
            <View style={styles.totalLine}><Text style={styles.grandTotal}>Total:</Text><Text style={styles.grandTotal}>{currency(subtotal + 5)}</Text></View>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelOrder}><Text style={styles.buttonText}>Cancelar compra</Text></TouchableOpacity>
          <TouchableOpacity style={styles.finishButton} onPress={finishOrder} disabled={finished}><Text style={styles.buttonText}>{finished ? 'Finalizado' : 'Concluir separação'}</Text></TouchableOpacity>
        </View>
      </ScrollView>
      <NavegacaoAdmin navigation={navigation} activeTab="Pedido" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  topbar: { minHeight: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  kicker: { color: '#7DE1C4', fontSize: 9, fontWeight: '800' },
  greeting: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
  bell: { width: 35, height: 35, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  content: { padding: 13, paddingBottom: 24 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13, marginTop: 3 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#111715', fontSize: 21, fontWeight: '900' },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 15, marginBottom: 12, elevation: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E3E1', alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1 },
  customerName: { color: C.ink, fontSize: 12, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 9, marginTop: 3 },
  orderNumber: { color: C.green, backgroundColor: '#D8F6E9', borderWidth: 1, borderColor: C.mint, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '900' },
  itemsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, elevation: 2 },
  itemsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemsTitle: { color: C.ink, fontSize: 13, fontWeight: '900' },
  countBadge: { color: '#FFFFFF', backgroundColor: C.mint, overflow: 'hidden', borderRadius: 7, paddingHorizontal: 5 },
  counter: { color: '#D08C18', fontSize: 9, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EEEB' },
  productThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F4F5F4', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 60 },
  itemName: { color: C.ink, fontSize: 11, fontWeight: '800' },
  priceColumn: { alignItems: 'flex-end' },
  qty: { color: C.ink, fontSize: 10, fontWeight: '700' },
  itemPrice: { color: C.success, fontSize: 12, fontWeight: '900', marginTop: 2 },
  check: { width: 25, height: 25, borderRadius: 7, borderWidth: 1, borderColor: C.success, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: C.success },
  totals: { paddingTop: 9, paddingHorizontal: 2 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 10 },
  totalLabel: { color: C.muted, fontSize: 10 },
  totalValue: { color: C.success, fontSize: 10, fontWeight: '800' },
  payment: { color: C.success, fontSize: 9, fontWeight: '800' },
  dashed: { borderTopWidth: 1, borderColor: '#D6DEDA', borderStyle: 'dashed', marginVertical: 5 },
  grandTotal: { color: C.success, fontSize: 15, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  cancelButton: { flex: 1, backgroundColor: C.red, borderRadius: 20, alignItems: 'center', paddingVertical: 12 },
  finishButton: { flex: 1, backgroundColor: C.success, borderRadius: 20, alignItems: 'center', paddingVertical: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
