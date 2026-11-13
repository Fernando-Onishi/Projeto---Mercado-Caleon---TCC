import React, { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import AdminScreenLayout from '../Componentes/AdminScreenLayout';
import AdminNotificationsModal from '../Componentes/AdminNotificationsModal';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';
import { db } from '../Config/FireBaseConfig';
import { ADMIN_THEME } from '../Config/AdminTheme';
import AdminOrderBottomSheet from './AdminOrderBottomSheet';
import { isLowStock, mapAdminProduct } from './adminProdutoUtils';

const C = ADMIN_THEME.colors;
const CHART_PLOT_HEIGHT = 92;
const CHART_AXIS_HEIGHT = 20;

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J'];

function getPeriodLabels(period) {
  if (period === 'Dia') return ['00', '04', '08', '12', '16', '20', '24'];
  if (period === 'Semana') return WEEK_LABELS;
  if (period === 'Ano') return ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return MONTH_LABELS;
}

function formatScaleValue(value) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function getChartScale(data, fallbackLabels) {
  if (data.length === 0) {
    const values = fallbackLabels.map((label) => Number.parseFloat(String(label).replace('+', '').replace(',', '.')) || 0);
    return { values, labels: fallbackLabels };
  }

  const maximum = Math.max(0, ...data.map((point) => point.value));
  const targetStep = maximum > 0 ? maximum / 3 : 1 / 3;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalizedStep = targetStep / magnitude;
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude;

  const values = [step * 3, step * 2, step, 0];
  return { values, labels: values.map(formatScaleValue) };
}

function formatMetricValue(value, unit) {
  if (unit === 'R$') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const formattedValue = formatScaleValue(value);
  return unit ? `${formattedValue} ${unit}` : formattedValue;
}

const sampleOrders = [
  {
    id: 897,
    customer: 'Christian Godoi',
    status: 'Pendente',
    total: 'R$ 7,50',
    date: '15 de Agosto de 2026',
    time: 'Hora: 10:15',
    accent: 'pending',
  },
  {
    id: 897,
    customer: 'Christian Godoi',
    status: 'Atrasado',
    total: 'R$ 7,50',
    date: '15 de Agosto de 2026',
    time: 'Hora: 10:15',
    accent: 'late',
  },
];

function MetricChart({
  title,
  unit,
  period,
  yLabels,
  xLabels,
  data = [],
  lineColor = C.mint,
  formatValue = (value) => formatMetricValue(value, unit),
  onSelectPoint,
}) {
  const [chartSize, setChartSize] = useState({ width: 0, height: CHART_PLOT_HEIGHT });
  const [selectedIndex, setSelectedIndex] = useState(null);
  const chartData = Array.isArray(data)
    ? data.filter((point) => Number.isFinite(point?.value))
    : [];
  const { values: scaleValues, labels: scaleLabels } = getChartScale(chartData, yLabels);
  const maximum = scaleValues[0] || 1;
  const dataPoints = chartData.map((point, index) => ({
    ...point,
    x: chartData.length > 1 ? (index / (chartData.length - 1)) * chartSize.width : chartSize.width / 2,
    y: chartSize.height - ((Math.max(0, Math.min(maximum, point.value)) / maximum) * chartSize.height),
  }));
  const selectedPoint = selectedIndex === null ? null : chartData[selectedIndex];
  const selectedPosition = selectedIndex === null ? null : dataPoints[selectedIndex];

  useEffect(() => {
    setSelectedIndex(null);
  }, [data, period]);

  return (
    <View
      style={styles.chartArea}
      accessibilityLabel={`${title}${unit ? `, ${unit}` : ''}, período ${period}`}
    >
      <View style={styles.chartBody}>
        <View
          style={styles.gridLines}
          onLayout={({ nativeEvent }) => {
            const { width, height } = nativeEvent.layout;
            setChartSize((current) => (
              current.width === width && current.height === height ? current : { width, height }
            ));
          }}
        >
          {scaleLabels.map((label, index) => (
            <View
              key={`${label}-${index}`}
              style={[
                styles.gridLine,
                index === 0 && styles.gridLineDashed,
                { top: `${(index / Math.max(yLabels.length - 1, 1)) * 100}%` },
              ]}
            />
          ))}

          {dataPoints.slice(1).map((point, index) => {
            const previous = dataPoints[index];
            const deltaX = point.x - previous.x;
            const deltaY = point.y - previous.y;
            const length = Math.sqrt((deltaX ** 2) + (deltaY ** 2));
            const angle = Math.atan2(deltaY, deltaX);

            return (
              <View
                key={`series-${index}`}
                style={[
                  styles.dataSegment,
                  { backgroundColor: lineColor },
                  {
                    width: length,
                    left: ((previous.x + point.x) / 2) - (length / 2),
                    top: ((previous.y + point.y) / 2) - 1,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}

          {dataPoints.map((point, index) => (
            <TouchableOpacity
              key={`point-${index}`}
              style={[styles.chartPointTarget, { left: point.x - 14, top: point.y - 14 }]}
              onPress={() => {
                setSelectedIndex((current) => current === index ? null : index);
                onSelectPoint?.(chartData[index]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${chartData[index].label || xLabels[index] || `Ponto ${index + 1}`}: ${formatValue(chartData[index].value)}`}
            >
              <View style={[styles.chartPoint, { backgroundColor: lineColor }]} />
            </TouchableOpacity>
          ))}

          {selectedPoint && selectedPosition ? (
            <View
              pointerEvents="none"
              style={[
                styles.chartTooltip,
                {
                  left: Math.max(0, Math.min(chartSize.width - 140, selectedPosition.x - 70)),
                  top: Math.max(0, selectedPosition.y - 38),
                },
              ]}
            >
              <Text style={styles.chartTooltipLabel} numberOfLines={1}>
                {selectedPoint.label || xLabels[selectedIndex] || `Ponto ${selectedIndex + 1}`}
              </Text>
              <Text style={styles.chartTooltipValue} numberOfLines={1}>
                {formatValue(selectedPoint.value)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.xAxis}>
          {xLabels.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.axisLabel} numberOfLines={1}>
              {label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.chartScale}>
        {scaleLabels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[styles.chartLabel, { top: `${(index / Math.max(yLabels.length - 1, 1)) * 100}%` }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function MetricCard({
  title,
  value,
  trend,
  trendType = 'positive',
  yLabels,
  xLabels,
  period,
  unit = '',
  data,
  lineColor = C.mint,
  formatValue,
  onSelectPoint,
  indicatorLabel = 'vs ontem',
  valueColor = C.success,
}) {
  const trendTone = trendType === 'negative' ? styles.trendNegative : styles.trendPositive;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {trend !== '—' ? (
          <View style={styles.trendWrap}>
            <View style={[styles.trendPill, trendTone]}>
              <Text style={styles.trendArrow}>{trendType === 'negative' ? '↓' : '↑'}</Text>
              <Text style={styles.trendText}>{trend}</Text>
            </View>
            <Text style={styles.trendCaption}>{indicatorLabel}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.metricValue, { color: valueColor }]}>
        {typeof value === 'string' && value.includes('min') ? (
          <>
            {value.replace('min', '')}
            <Text style={styles.metricSuffix}>min</Text>
          </>
        ) : (
          value
        )}
      </Text>

      <MetricChart
        title={title}
        unit={unit}
        period={period}
        yLabels={yLabels}
        xLabels={xLabels}
        data={data}
        lineColor={lineColor}
        formatValue={formatValue}
        onSelectPoint={onSelectPoint}
      />
    </View>
  );
}

export default function AdminHome({ navigation, userRole }) {
  const [fontsLoaded] = useFonts({
    LilitaOne_400Regular: require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'),
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });

  const [period, setPeriod] = useState('Dia');
  const [purchasePeriod, setPurchasePeriod] = useState('Nesse Mês');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(3);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const nextCount = snapshot.docs
          .map(mapAdminProduct)
          .filter(Boolean)
          .filter(isLowStock).length;
        setLowStockCount(nextCount);
      },
      (error) => {
        console.error('Não foi possível carregar o resumo de estoque do painel.', error);
        setLowStockCount(3);
      },
    );

    return unsubscribe;
  }, []);

  const metrics = useMemo(
    () => ({
      Dia: {
        revenue: 'R$0,00',
        orders: '00',
        purchases: 'R$0,00',
        expenses: '00',
        avgTime: '00 min',
      },
      Semana: {
        revenue: 'R$0,00',
        orders: '00',
        purchases: 'R$0,00',
        expenses: '00',
        avgTime: '00 min',
      },
      Mês: {
        revenue: 'R$0,00',
        orders: '00',
        purchases: 'R$0,00',
        expenses: '00',
        avgTime: '00 min',
      },
      Ano: {
        revenue: 'R$0,00',
        orders: '00',
        purchases: 'R$0,00',
        expenses: '00',
        avgTime: '00 min',
      },
    }),
    [],
  );

  const currentMetrics = metrics[period];

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
        headerHeight={82}
        headerContent={(
          <View style={styles.topbar}>
            <TouchableOpacity
              style={styles.brandMark}
              onPress={() => navigation.navigate('AdminConfiguracoes')}
              accessibilityRole="button"
              accessibilityLabel="Configurações da conta"
            >
              <Feather name="user" size={20} color={C.white} />
            </TouchableOpacity>

            <View style={styles.brandCopy}>
              <Text style={styles.kicker}>Painel Operacional</Text>
              <Text style={styles.greeting}>Olá, Administrador</Text>
            </View>

            <View style={styles.notificationButton}>
              <CircularIconButton
                icon={<Feather name="bell" size={20} color={C.white} />}
                onPress={() => setNotificationsVisible(true)}
                accessibilityLabel="Notificações"
              />
              {lowStockCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{lowStockCount > 99 ? '99+' : lowStockCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
        footerContent={(
          <NavegacaoAdmin
            navigation={navigation}
            activeTab="Início"
            showAdd={userRole === 'admin'}
          />
        )}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.periods}>
            {['Dia', 'Semana', 'Mês', 'Ano'].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setPeriod(item)}
                style={[styles.periodButton, period === item && styles.periodSelected]}
              >
                <Text style={[styles.periodText, period === item && styles.periodTextSelected]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <MetricCard
            title="Faturamento"
            value={currentMetrics.revenue}
            trend="00%"
            trendType="positive"
            yLabels={['5000+', '3000', '1000', '0']}
            xLabels={getPeriodLabels(period)}
            period={period}
            unit="R$"
            indicatorLabel="vs ontem"
          />

          <MetricCard
            title="Pedidos"
            value={currentMetrics.orders}
            trend="0%"
            trendType="negative"
            yLabels={['100', '50', '10', '0']}
            xLabels={getPeriodLabels(period)}
            period={period}
            unit="pedidos"
            indicatorLabel="vs ontem"
            valueColor={C.success}
          />

          <View style={styles.purchaseFilters}>
            {['Nesse Mês', 'Último Mês', 'Há 2 meses', 'Há 3 meses'].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setPurchasePeriod(item)}
                style={[styles.purchaseFilter, purchasePeriod === item && styles.purchaseFilterActive]}
              >
                <Text style={[styles.purchaseFilterText, purchasePeriod === item && styles.purchaseFilterTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <MetricCard
            title="Compras Realizadas"
            value={currentMetrics.purchases}
            trend="0%"
            trendType="negative"
            yLabels={['100', '50', '10', '0']}
            xLabels={MONTH_LABELS}
            period={purchasePeriod}
            unit="R$"
            indicatorLabel="vs último mês"
          />

          <MetricCard
            title="Gastos Realizados"
            value={currentMetrics.expenses}
            trend="0%"
            trendType="positive"
            yLabels={['100', '50', '10', '0']}
            xLabels={MONTH_LABELS}
            period={purchasePeriod}
            unit="R$"
            indicatorLabel="vs último mês"
          />

          <MetricCard
            title="Tempo médio de separação"
            value={currentMetrics.avgTime}
            trend="0%"
            trendType="positive"
            yLabels={['100', '50', '10', '0']}
            xLabels={MONTH_LABELS}
            period={purchasePeriod}
            unit="min"
            indicatorLabel="vs último mês"
            valueColor={C.success}
          />

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.pendingIcon]}>
                <Feather name="clock" size={15} color="#E7A51A" />
              </View>
              <Text style={[styles.statNumber, styles.pendingNumber]}>7</Text>
              <Text style={styles.statLabel}>Pedidos Pendentes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.todayIcon]}>
                <Feather name="package" size={15} color={C.mint} />
              </View>
              <Text style={styles.statNumber}>48</Text>
              <Text style={styles.statLabel}>Pedidos Hoje</Text>
            </View>

            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('ControleEstoque')}>
              <View style={[styles.statIcon, styles.lowStockIcon]}>
                <Feather name="alert-triangle" size={15} color={C.red} />
              </View>
              <Text style={[styles.statNumber, styles.lowStockNumber]}>{lowStockCount}</Text>
              <Text style={styles.statLabel}>Estoque Baixo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Fila de Pedidos</Text>

          {sampleOrders.map((order) => (
            <View key={`${order.id}-${order.status}-${order.customer}`} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.avatar}>
                  <Feather name="user" size={18} color="#8B9291" />
                </View>

                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <Text style={styles.customerName}>{order.customer}</Text>
                  <Text style={styles.orderMeta}>Data: {order.date}</Text>
                  <Text style={styles.orderMeta}>Hora: {order.time}</Text>
                </View>

                <View style={styles.orderSummary}>
                  <View
                    style={[
                      styles.statusBadge,
                      order.accent === 'late' ? styles.statusLate : styles.statusPending,
                    ]}
                  >
                    {order.accent === 'late' ? (
                      <Feather name="alert-triangle" size={12} color={C.red} />
                    ) : (
                      <Feather name="clock" size={12} color="#D99A14" />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        order.accent === 'late' ? styles.statusTextLate : styles.statusTextPending,
                      ]}
                    >
                      {order.status}
                    </Text>
                  </View>

                  <Text style={styles.orderPrice}>{order.total}</Text>
                </View>
              </View>

              <View style={styles.orderActions}>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
                  <Text style={styles.actionText}>Recusar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => setSelectedOrder(order)}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir pedido ${order.id} para conferência`}
                >
                  <Text style={styles.actionText}>Aceitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </AdminScreenLayout>
      <AdminOrderBottomSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onComplete={() => Alert.alert(
          'Pedido não atualizado',
          'A conferência foi concluída, mas o aplicativo ainda não possui uma fonte de pedidos conectada. Nenhuma alteração foi salva.',
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 82,
    paddingHorizontal: ADMIN_THEME.layout.contentPadding,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.green,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7CCAB5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 10,
    color: '#BFECD8',
    marginBottom: 2,
  },
  greeting: {
    color: C.white,
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  notificationButton: {
    position: 'relative',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FF3F4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: ADMIN_THEME.fonts.bold,
  },
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 22,
  },
  periods: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: 8,
    borderRadius: 12,
  },
  periodSelected: {
    backgroundColor: '#40B190',
  },
  periodText: {
    color: '#7A8581',
    fontSize: 11,
    fontFamily: ADMIN_THEME.fonts.bold,
  },
  periodTextSelected: {
    color: '#FFFFFF',
  },
  metricCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 11,
    marginBottom: 16,
    shadowColor: '#102E2B',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricTitle: {
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
    color: C.ink,
    fontSize: 17,
    fontFamily: ADMIN_THEME.fonts.display,
    lineHeight: 22,
  },
  trendWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 22,
  },
  trendPositive: {
    backgroundColor: '#14B570',
  },
  trendNegative: {
    backgroundColor: '#FF4F54',
  },
  trendArrow: {
    color: '#FFFFFF',
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 10,
    marginRight: 3,
  },
  trendText: {
    color: '#FFFFFF',
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 10,
  },
  trendCaption: {
    color: '#8A9090',
    fontFamily: ADMIN_THEME.fonts.body,
    fontSize: 9,
    marginTop: 2,
    lineHeight: 11,
  },
  metricValue: {
    fontFamily: ADMIN_THEME.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 6,
  },
  metricSuffix: {
    fontSize: 17,
    fontFamily: ADMIN_THEME.fonts.display,
    color: C.success,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: CHART_PLOT_HEIGHT + CHART_AXIS_HEIGHT,
  },
  chartScale: {
    width: 48,
    height: CHART_PLOT_HEIGHT,
    marginLeft: 8,
    position: 'relative',
  },
  chartLabel: {
    position: 'absolute',
    right: 0,
    color: '#A8ADAB',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: ADMIN_THEME.fonts.body,
    textAlign: 'right',
    transform: [{ translateY: -7 }],
  },
  chartBody: {
    flex: 1,
    minWidth: 0,
    height: CHART_PLOT_HEIGHT + CHART_AXIS_HEIGHT,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: CHART_AXIS_HEIGHT,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#D9DCDB',
  },
  gridLineDashed: {
    borderStyle: 'dashed',
  },
  dataSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: C.mint,
  },
  chartPointTarget: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  chartPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.white,
  },
  chartTooltip: {
    position: 'absolute',
    width: 140,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: C.green,
    zIndex: 3,
    shadowColor: '#102E2B',
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chartTooltipLabel: {
    color: '#D8F4EB',
    fontFamily: ADMIN_THEME.fonts.body,
    fontSize: 9,
  },
  chartTooltipValue: {
    color: C.white,
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 11,
    marginTop: 2,
  },
  xAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: CHART_AXIS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  axisLabel: {
    flex: 1,
    color: '#A8ADAB',
    fontSize: 10,
    fontFamily: ADMIN_THEME.fonts.body,
    lineHeight: 13,
    textAlign: 'center',
  },
  purchaseFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 14,
    gap: 6,
  },
  purchaseFilter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    borderRadius: 16,
    paddingVertical: 8,
  },
  purchaseFilterActive: {
    backgroundColor: '#40B190',
  },
  purchaseFilterText: {
    color: '#5E6963',
    fontSize: 10,
    fontFamily: ADMIN_THEME.fonts.bold,
    textAlign: 'center',
  },
  purchaseFilterTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#102E2B',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pendingIcon: {
    borderColor: '#F6D475',
    backgroundColor: '#FFF9E8',
  },
  todayIcon: {
    borderColor: '#BCEAD8',
    backgroundColor: '#EEFDF6',
  },
  lowStockIcon: {
    borderColor: '#F7C2C5',
    backgroundColor: '#FFF0F0',
  },
  statNumber: {
    fontFamily: ADMIN_THEME.fonts.display,
    fontSize: 26,
    color: C.success,
    lineHeight: 30,
  },
  pendingNumber: {
    color: '#E7A51A',
  },
  lowStockNumber: {
    color: C.red,
  },
  statLabel: {
    marginTop: 2,
    color: '#5E6963',
    fontSize: 10,
    fontFamily: ADMIN_THEME.fonts.bold,
    textAlign: 'center',
  },
  sectionTitle: {
    color: C.ink,
    fontFamily: ADMIN_THEME.fonts.display,
    fontSize: 24,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
    shadowColor: '#102E2B',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCE0DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  orderInfo: {
    flex: 1,
    minWidth: 0,
  },
  orderId: {
    color: C.ink,
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  customerName: {
    color: C.ink,
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 16,
    marginBottom: 4,
  },
  orderMeta: {
    color: '#6F7D78',
    fontFamily: ADMIN_THEME.fonts.body,
    fontSize: 10,
  },
  orderSummary: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 90,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPending: {
    backgroundColor: '#FFF9E8',
    borderColor: '#F5D16C',
  },
  statusLate: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF8A8D',
  },
  statusText: {
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  statusTextPending: {
    color: '#D99A14',
  },
  statusTextLate: {
    color: C.red,
  },
  orderPrice: {
    color: C.success,
    fontFamily: ADMIN_THEME.fonts.display,
    fontSize: 22,
    marginTop: 6,
  },
  orderActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
  },
  rejectButton: {
    backgroundColor: '#FF3F4D',
  },
  acceptButton: {
    backgroundColor: '#1CB77E',
  },
  actionText: {
    color: '#FFFFFF',
    fontFamily: ADMIN_THEME.fonts.bold,
    fontSize: 13,
  },
});
