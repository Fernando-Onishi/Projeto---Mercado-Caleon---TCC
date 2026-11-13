import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNavigationState } from '@react-navigation/native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { db } from '../Config/FireBaseConfig';
import { isLowStock, mapAdminProduct } from './adminProdutoUtils';

const C = { green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF', ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C' };

function MetricCard({ title, value, trend, bars, yLabels }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricTitle}>{title}</Text>
        <View style={styles.trendWrap}>
          <Text style={styles.trend}>{trend}</Text>
          {trend !== '—' ? <Text style={styles.trendCaption}>vs ontem</Text> : null}
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {bars.length ? <View style={styles.chartArea}>
        <View style={styles.chartScale}>
          {yLabels.map((label) => <Text key={label} style={styles.chartLabel}>{label}</Text>)}
        </View>
        <View style={styles.chartContent}>
          <View style={styles.chart}>
            {bars.map((height, i) => <View key={i} style={[styles.bar, { height: `${height}%` }, i === bars.length - 1 && styles.lastBar]} />)}
          </View>
          <View style={styles.chartLabels}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <Text key={i} style={styles.chartLabel}>{d}</Text>)}
          </View>
        </View>
      </View> : <Text style={styles.chartEmpty}>Sem dados disponíveis</Text>}
    </View>
  );
}

export default function AdminHome({ navigation, userRole }) {
  const activeRouteName = useNavigationState((state) => state.routes[state.index]?.name);
  const [period, setPeriod] = useState('Dia');
  const [purchasePeriod, setPurchasePeriod] = useState('Nesse Mês');
  const [lowStockCount, setLowStockCount] = useState(null);
  useEffect(() => onSnapshot(collection(db, 'products'), (snapshot) => {
    setLowStockCount(snapshot.docs.map(mapAdminProduct).filter(Boolean).filter(isLowStock).length);
  }, (error) => {
    console.error('Não foi possível carregar o resumo de estoque do painel.', error);
    setLowStockCount(null);
  }), []);
  const data = useMemo(() => ({
    Dia: { revenue: '—', orders: '—', purchases: '—', expenses: '—' },
    Semana: { revenue: '—', orders: '—', purchases: '—', expenses: '—' },
    Mês: { revenue: '—', orders: '—', purchases: '—', expenses: '—' },
    Ano: { revenue: '—', orders: '—', purchases: '—', expenses: '—' },
  }), []);
  const metrics = data[period];

  return (
    <SafeAreaScreen style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.brandMark}
          onPress={() => navigation.navigate('AdminConfiguracoes')}
          accessibilityRole="button"
          accessibilityLabel="Configurações da conta"
        >
             <Feather name="user" size={17} color={C.white} />
        </TouchableOpacity>
        <View style={styles.brandCopy}><Text style={styles.kicker}>Painel Operacional</Text><Text style={styles.greeting}>Olá, Administrador</Text></View>
        <View style={styles.notificationButton}>
          <CircularIconButton
             icon={<Feather name="bell" size={16} color={C.white} />}
            onPress={() => navigation.navigate('ControleEstoque')}
            accessibilityLabel="Notificações"
          />
          {lowStockCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{lowStockCount > 99 ? '99+' : lowStockCount}</Text></View> : null}
        </View>
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periods}>
          {['Dia', 'Semana', 'Mês', 'Ano'].map((p) => <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.periodButton, period === p && styles.periodSelected]}><Text style={[styles.periodText, period === p && styles.periodTextSelected]}>{p}</Text></TouchableOpacity>)}
        </View>
        <MetricCard title="Faturamento" value={metrics.revenue} trend="—" bars={[]} yLabels={[]} />
        <MetricCard title="Pedidos" value={metrics.orders} trend="—" bars={[]} yLabels={[]} />
        <View style={styles.purchaseFilters}>
          {['Nesse Mês', 'Último Mês', 'Há 2 meses', 'Há 3 meses'].map((item) => (
            <TouchableOpacity key={item} onPress={() => setPurchasePeriod(item)} style={[styles.purchaseFilter, purchasePeriod === item && styles.purchaseFilterActive]}>
              <Text style={[styles.purchaseFilterText, purchasePeriod === item && styles.purchaseFilterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <MetricCard title="Compras Realizadas" value={metrics.purchases} trend="—" bars={[]} yLabels={[]} />
        <MetricCard title="Gastos realizados" value={metrics.expenses} trend="—" bars={[]} yLabels={[]} />
        <MetricCard title="Tempo médio de separação" value="—" trend="—" bars={[]} yLabels={[]} />
        <View style={styles.statsRow}>
           <View style={styles.stat}><View style={[styles.statIcon, styles.pendingIcon]}><Feather name="clock" size={13} color="#E7A51A" /></View><Text style={[styles.statNumber, styles.pendingNumber]}>—</Text><Text style={styles.statLabel}>Pedidos Pendentes</Text></View>
           <View style={styles.stat}><View style={[styles.statIcon, styles.todayIcon]}><Feather name="check" size={13} color={C.mint} /></View><Text style={styles.statNumber}>—</Text><Text style={styles.statLabel}>Pedidos Hoje</Text></View>
           <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('ControleEstoque')}><View style={[styles.statIcon, styles.lowStockIcon]}><Feather name="alert-triangle" size={13} color={C.red} /></View><Text style={[styles.statNumber, styles.lowStockNumber]}>{lowStockCount === null ? '—' : lowStockCount}</Text><Text style={styles.statLabel}>Estoque Baixo</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Fila de Pedidos</Text>
        <Text style={styles.ordersEmpty}>A fila de pedidos ainda não está conectada a uma fonte de pedidos.</Text>
      </ScrollView>
      <NavegacaoAdmin navigation={navigation} activeTab={activeRouteName === 'AdminCriarProduto' ? 'Adicionar' : 'Início'} showAdd={userRole === 'admin'} />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.green },
  topbar: { minHeight: 52, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.green },
  brandMark: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1 },
  kicker: { fontSize: 9, color: '#7DE1C4', fontWeight: '800' },
  kicker: { fontSize: 7, color: '#7DE1C4', fontWeight: '800' },
  greeting: { color: '#FFFFFF', fontWeight: '800', fontSize: 11, marginTop: 1 },
  notificationButton: { position: 'relative' },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: C.red, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  content: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 18 },
  periods: { flexDirection: 'row', padding: 4, backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 10 },
  periodButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20 },
  periodSelected: { backgroundColor: C.mint },
  periodText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  periodTextSelected: { color: '#FFFFFF' },
  metric: { backgroundColor: '#FFFFFF', borderRadius: 13, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 5, marginBottom: 7, elevation: 2, shadowColor: '#173B32', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTitle: { fontSize: 11, color: C.ink, fontWeight: '800' },
    metricTitle: { fontSize: 9, color: C.ink, fontWeight: '800' },
  trendWrap: { alignItems: 'flex-end' },
  trend: { color: C.white, fontSize: 8, fontWeight: '800', backgroundColor: C.success, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  trend: { color: C.white, fontSize: 6, fontWeight: '800', backgroundColor: C.success, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  trendCaption: { color: C.muted, fontSize: 5, marginTop: 1 },
  metricValue: { color: C.success, fontSize: 14, lineHeight: 17, fontWeight: '900', marginTop: 0 },
  chartArea: { height: 39, flexDirection: 'row', marginTop: 2 },
  chartScale: { width: 23, justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 9 },
  chartContent: { flex: 1 },
  chart: { height: 29, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E1E8E4' },
  bar: { width: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: C.green },
  lastBar: { backgroundColor: C.success },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 2 },
  chartLabel: { fontSize: 6, lineHeight: 7, color: '#9BA5A1' },
  chartEmpty: { color: C.muted, fontSize: 9, paddingVertical: 11 },
  purchaseFilters: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: -1, marginBottom: 6 },
  purchaseFilter: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12 },
  purchaseFilterActive: { backgroundColor: C.mint },
  purchaseFilterText: { color: C.muted, fontSize: 8, fontWeight: '700' },
  purchaseFilterTextActive: { color: C.white },
  statsRow: { flexDirection: 'row', gap: 7, marginTop: 1, marginBottom: 15 },
  stat: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 2, paddingVertical: 7, elevation: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E1E8E4' },
  statIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pendingIcon: { borderColor: '#F6D475' },
  todayIcon: { borderColor: '#B9EBDD' },
  lowStockIcon: { borderColor: '#FFC2C3' },
  pendingNumber: { color: '#E7A51A' },
  lowStockNumber: { color: C.red },
  statIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 12, color: C.success, fontWeight: '900' },
  statLabel: { fontSize: 6, color: C.muted, textAlign: 'center' },
  sectionTitle: { color: C.ink, fontSize: 14, fontWeight: '900', marginBottom: 7 },
  ordersEmpty: { color: C.muted, fontSize: 10, paddingVertical: 10 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, marginBottom: 8, elevation: 2, shadowColor: '#173B32', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  orderDetails: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: { width: 34, height: 34, borderRadius: 18, backgroundColor: '#D9DCDA', alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1, minWidth: 0 },
  orderName: { fontSize: 11, color: C.ink, fontWeight: '900' },
  customerName: { fontSize: 9, color: C.ink, fontWeight: '700' },
  orderMeta: { color: C.muted, fontSize: 7, marginTop: 2 },
  orderSummary: { alignItems: 'flex-end', minWidth: 56 },
  orderStatus: { color: '#D99A14', fontSize: 8, fontWeight: '800', borderWidth: 1, borderColor: '#F6D475', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2 },
  late: { color: C.red },
  orderPrice: { color: C.mint, fontSize: 16, fontWeight: '900', marginTop: 2 },
  orderActions: { flexDirection: 'row', gap: 6, marginTop: 6, paddingHorizontal: 3 },
  rejectButton: { flex: 1, backgroundColor: C.red, borderRadius: 14, alignItems: 'center', paddingVertical: 5 },
  acceptButton: { flex: 1, backgroundColor: C.success, borderRadius: 14, alignItems: 'center', paddingVertical: 5 },
  actionText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
