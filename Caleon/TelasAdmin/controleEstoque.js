import React from 'react';
import {
	Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import SafeAreaScreen from '../Componentes/SafeAreaScreen';
import CircularIconButton from '../Componentes/CircularIconButton';
import Feather from '@expo/vector-icons/Feather';
import NavegacaoAdmin from '../Componentes/NavegacaoAdmin';

const C = {
	green: '#1B4B3D', mint: '#40B190', bg: '#F1F3F5', white: '#FFFFFF',
	ink: '#183F35', muted: '#7A8581', success: '#00AA6A', red: '#FF383C',
};

const indicators = [
	{ title: 'Total de Produtos', value: '0', detail: '0 novos este mês', icon: 'box', color: '#00AA6A' },
	{ title: 'Estoque Baixo', value: '0', detail: '0 itens', icon: 'alert-circle', color: '#FFC928' },
	{ title: 'Estoque Zerado', value: '0', detail: '0 itens', icon: 'alert-triangle', color: '#FF383C' },
	{ title: 'Vencimento Próximo', value: '0', detail: '0 itens', icon: 'clock', color: '#FFA326' },
];

function IndicatorCard({ title, value, detail, icon, color }) {
	return (
		<View style={[styles.card, { borderColor: color }]}>
			<View style={[styles.accent, { backgroundColor: color }]} />
			<View style={styles.cardCopy}>
				<Text style={[styles.cardTitle, { color }]}>{title}</Text>
				<View style={styles.valueRow}>
					<Text style={[styles.value, { color }]}>{value}</Text>
					{title !== 'Total de Produtos' ? <Text style={styles.detail}>{detail}</Text> : null}
				</View>
				{title === 'Total de Produtos' ? <Text style={styles.monthly}>{detail}</Text> : null}
			</View>
			<View style={[styles.iconBox, { backgroundColor: color }]}>
				<Feather name={icon} size={25} color={C.white} />
			</View>
		</View>
	);
}

export default function ControleEstoque({ navigation }) {
	return (
		<SafeAreaScreen style={styles.safe} edges={['top', 'bottom']}>
			<StatusBar barStyle="light-content" backgroundColor={C.green} />
			<View style={styles.topbar}>
				<View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View>
				<View style={styles.brandCopy}>
					<Text style={styles.kicker}>CAMELION • PAINEL OPERACIONAL</Text>
					<Text style={styles.greeting}>Olá, Administrador</Text>
				</View>
				<CircularIconButton
					icon={<Feather name="bell" size={20} color={C.white} />}
					onPress={() => Alert.alert('Notificações', 'Nenhum alerta de estoque no momento.')}
					accessibilityLabel="Notificações"
				/>
			</View>
			<ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={styles.title}>Controle de Estoque</Text>
				<View style={styles.cards}>
					{indicators.map((indicator) => <IndicatorCard key={indicator.title} {...indicator} />)}
				</View>
			</ScrollView>
			<NavegacaoAdmin navigation={navigation} activeTab="Estoque" />
		</SafeAreaScreen>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.green },
	topbar: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.green },
	brandMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
	brandLetter: { color: C.white, fontWeight: '900', fontSize: 22 },
	brandCopy: { flex: 1 },
	kicker: { fontSize: 9, color: '#7DE1C4', fontWeight: '800' },
	greeting: { color: C.white, fontWeight: '800', fontSize: 14, marginTop: 2 },
	screen: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
	content: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 24 },
	title: { color: '#111715', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 34 },
	cards: { gap: 24 },
	card: { minHeight: 82, borderWidth: 1, borderRadius: 11, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
	accent: { width: 11, alignSelf: 'stretch' },
	cardCopy: { flex: 1, paddingLeft: 11, paddingVertical: 10 },
	cardTitle: { fontSize: 12, fontWeight: '900' },
	valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 },
	value: { fontSize: 20, fontWeight: '900' },
	detail: { color: '#252A28', fontSize: 10, fontWeight: '700' },
	monthly: { color: C.success, fontSize: 9, fontWeight: '700', marginTop: 2 },
	iconBox: { width: 41, height: 41, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
});
