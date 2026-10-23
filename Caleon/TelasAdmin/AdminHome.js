import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { signOut } from 'firebase/auth';
import { auth } from '../Config/FireBaseConfig';

const C = { green: '#1B4B3D', mint: '#40B190', active: '#076653', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };

const adminTabs = [
  { label: 'Início', icon: 'home', route: 'AdminHome' },
  { label: 'QrCode', icon: 'maximize', route: 'AdminQrCode' },
  { label: 'Adicionar', icon: 'plus', route: 'AdminCriarProduto' },
  { label: 'Catálogo', icon: 'clipboard', route: 'AdminProdutos' },
  { label: 'Configurações', icon: 'settings', route: 'AdminConfiguracoes' },
];

const initialOrders = [
  { id: '897', name: 'Christian Godoi', time: '10:15', status: 'Pendente', total: 7.50 },
  { id: '898', name: 'Mariana Costa', time: '10:22', status: 'Atrasado', total: 18.90 },
];

function MetricCard({ title, value, trend, bars }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.trend}>{trend}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.chart}>
        {bars.map((height, i) => <View key={i} style={[styles.bar, { height: `${height}%` }, i === bars.length - 1 && styles.lastBar]} />)}
      </View>
      <View style={styles.chartLabels}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <Text key={i} style={styles.chartLabel}>{d}</Text>)}
      </View>
    </View>
  );
}

export default function AdminHome({ navigation }) {
  const [period, setPeriod] = useState('Dia');
  const [orders, setOrders] = useState(initialOrders);
  const [accepted, setAccepted] = useState([]);
  const [activeTab, setActiveTab] = useState('Início');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const data = useMemo(() => ({
    Dia: { revenue: 'R$ 5.420,00', orders: '48', purchases: '36', expenses: 'R$ 2.180,00' },
    Semana: { revenue: 'R$ 32.680,00', orders: '286', purchases: '241', expenses: 'R$ 14.280,00' },
    Mês: { revenue: 'R$ 98.420,00', orders: '1.248', purchases: '1.105', expenses: 'R$ 52.420,00' },
    Ano: { revenue: 'R$ 842.500,00', orders: '12.480', purchases: '11.930', expenses: 'R$ 421.300,00' },
  }), []);
  const metrics = data[period];

  function updateOrder(id, action) {
    if (action === 'Aceitar') {
      setAccepted((prev) => [...prev, id]);
      Alert.alert('Pedido aceito', `O pedido #${id} foi aceito para separação.`);
      navigation.navigate('AdminPedido', { orderId: id });
    } else {
      Alert.alert('Recusar pedido', `Deseja recusar o pedido #${id}?`, [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Recusar', style: 'destructive', onPress: () => setOrders((prev) => prev.filter((order) => order.id !== id)) },
      ]);
    }
  }

  function handleTabPress(route, label) {
    const routeNames = navigation.getState()?.routeNames || [];
    if (!routeNames.includes(route)) {
      Alert.alert(label, 'Esta tela ainda não está disponível no aplicativo.');
      return;
    }

    setActiveTab(label);
    if (route !== 'AdminHome') navigation.navigate(route);
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'TelaLogin' }] });
    } catch (error) {
      console.error('Não foi possível sair da conta administrativa.', error);
      Alert.alert('Sair da conta', 'Não foi possível encerrar sua sessão. Tente novamente.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={styles.topbar}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View>
        <View style={styles.brandCopy}><Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text><Text style={styles.greeting}>Olá, Administrador</Text></View>
        <TouchableOpacity style={styles.bell} onPress={() => Alert.alert('Notificações', 'Você tem 3 produtos com estoque baixo e pedidos aguardando.')}><Feather name="bell" size={20} color="#FFFFFF" /><View style={styles.badge}><Text style={styles.badgeText}>1</Text></View></TouchableOpacity>
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.disabledButton]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          {isLoggingOut
            ? <ActivityIndicator size="small" color={C.white} />
            : <Feather name="log-out" size={18} color={C.white} />}
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periods}>
          {['Dia', 'Semana', 'Mês', 'Ano'].map((p) => <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.periodButton, period === p && styles.periodSelected]}><Text style={[styles.periodText, period === p && styles.periodTextSelected]}>{p}</Text></TouchableOpacity>)}
        </View>
        <MetricCard title="Faturamento" value={metrics.revenue} trend="↗ 14%" bars={[42, 50, 34, 58, 65, 76, 94]} />
        <MetricCard title="Pedidos" value={metrics.orders} trend="↗ 5%" bars={[45, 55, 35, 62, 76, 96, 78]} />
        <View style={styles.segment}><Text style={styles.segmentActive}>Neste período</Text><Text style={styles.segmentMuted}>Comparar com período anterior</Text></View>
        <MetricCard title="Compras realizadas" value={metrics.purchases} trend="↗ 5%" bars={[40, 48, 32, 57, 67, 88, 75]} />
        <MetricCard title="Gastos realizados" value={metrics.expenses} trend="↘ 5%" bars={[45, 52, 39, 62, 71, 89, 74]} />
        <View style={styles.statsRow}>
          <View style={styles.stat}><Feather name="clock" size={18} color="#E7A51A" /><Text style={styles.statNumber}>7</Text><Text style={styles.statLabel}>Pendentes</Text></View>
          <View style={styles.stat}><Feather name="check-circle" size={18} color={C.success} /><Text style={styles.statNumber}>48</Text><Text style={styles.statLabel}>Pedidos hoje</Text></View>
          <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('ControleEstoque')}><Feather name="alert-triangle" size={18} color={C.red} /><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Estoque baixo</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Fila de pedidos</Text>
        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.avatar}><Feather name="user" size={19} color="#A3AAA7" /></View>
            <View style={styles.orderInfo}><Text style={styles.orderName}>#{order.id} · {order.name}</Text><Text style={styles.orderMeta}>Hoje às {order.time}</Text><Text style={[styles.orderStatus, order.status === 'Atrasado' && styles.late]}>{accepted.includes(order.id) ? 'Aceito para separação' : order.status}</Text></View>
            <Text style={styles.orderPrice}>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={() => updateOrder(order.id, 'Recusar')}><Text style={styles.actionText}>Recusar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={() => updateOrder(order.id, 'Aceitar')}><Text style={styles.actionText}>Aceitar</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        {adminTabs.map((tab) => {
          const selected = tab.label === activeTab;
          const addTab = tab.label === 'Adicionar';
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.tab}
              onPress={() => handleTabPress(tab.route, tab.label)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.iconBox, addTab && styles.addIconBox]}>
                <Feather name={tab.icon} size={addTab ? 23 : 20} color={addTab ? C.white : selected ? C.active : C.muted} />
              </View>
              <Text style={[styles.tabLabel, selected && styles.selectedLabel, addTab && styles.addLabel]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  topbar: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.green },
  brandMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#FFFFFF', fontWeight: '900', fontSize: 22 },
  brandCopy: { flex: 1 },
  kicker: { fontSize: 9, color: '#7DE1C4', fontWeight: '800' },
  greeting: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginTop: 2 },
  bell: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  logoutButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.65 },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: C.red, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  content: { padding: 12, paddingBottom: 22 },
  periods: { flexDirection: 'row', padding: 4, backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 10 },
  periodButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20 },
  periodSelected: { backgroundColor: C.mint },
  periodText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  periodTextSelected: { color: '#FFFFFF' },
  metric: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 11, marginBottom: 10, elevation: 2 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTitle: { fontSize: 12, color: C.ink, fontWeight: '800' },
  trend: { color: C.success, fontSize: 9, fontWeight: '800', backgroundColor: '#E3F7EE', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  metricValue: { color: C.success, fontSize: 20, fontWeight: '900', marginTop: 1 },
  chart: { height: 49, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E1E8E4' },
  bar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: C.green },
  lastBar: { backgroundColor: C.success },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 3 },
  chartLabel: { fontSize: 8, color: '#9BA5A1' },
  segment: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 3 },
  segmentActive: { fontSize: 10, color: C.green, fontWeight: '800' },
  segmentMuted: { fontSize: 9, color: C.muted },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 18 },
  stat: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 11, elevation: 2 },
  statNumber: { fontSize: 19, color: C.success, fontWeight: '900' },
  statLabel: { fontSize: 9, color: C.muted, textAlign: 'center' },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: '900', marginBottom: 9 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginBottom: 9, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, elevation: 2 },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#E1E4E2', alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1, minWidth: 110 },
  orderName: { fontSize: 11, color: C.ink, fontWeight: '800' },
  orderMeta: { color: C.muted, fontSize: 9, marginTop: 3 },
  orderStatus: { color: '#D99A14', fontSize: 9, marginTop: 3, fontWeight: '800' },
  late: { color: C.red },
  orderPrice: { color: C.mint, fontSize: 17, fontWeight: '900' },
  orderActions: { width: '100%', flexDirection: 'row', gap: 8, paddingLeft: 42 },
  rejectButton: { flex: 1, backgroundColor: C.red, borderRadius: 18, alignItems: 'center', paddingVertical: 8 },
  acceptButton: { flex: 1, backgroundColor: C.success, borderRadius: 18, alignItems: 'center', paddingVertical: 8 },
  actionText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  footer: { minHeight: 80, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: C.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5D9DB' },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addIconBox: { borderRadius: 8, backgroundColor: '#076653' },
  tabLabel: { color: C.muted, fontFamily: 'LilitaOne_400Regular', fontSize: 10 },
  selectedLabel: { color: '#076653' },
  addLabel: { color: '#076653' },
});
