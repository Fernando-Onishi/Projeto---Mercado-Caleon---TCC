import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import CircularIconButton from './CircularIconButton';
import { ADMIN_THEME } from '../Config/AdminTheme';
import { auth } from '../Config/FireBaseConfig';
import {
	findUserByEmail,
	isAdminAccount,
	makeAdmin,
	normalizeEmail,
	removeAdmin,
	subscribeTeam,
} from '../Config/Equipe';
import { showGlobalNotification } from './NotificacaoGlobal';
import ModalSobe from './ModalSobe';
import { themedStyles, tc } from '../Config/Tema';

const C = ADMIN_THEME.colors;
const F = ADMIN_THEME.fonts;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function originLabel(admin) {
	if (admin.byDomain) return 'Admin pelo e-mail @admin.caleon.com';
	if (admin.pending) return 'Convidado • vira admin no próximo acesso';
	return 'Promovido pela equipe';
}

function friendlyError(error) {
	if (error?.code === 'permission-denied') {
		return 'O Firebase recusou. Atualize as regras do Firestore (versão com "adminRevocations") e tente de novo.';
	}
	return 'Não foi possível concluir agora. Confira sua conexão.';
}

/**
 * Equipe: lista todos os administradores que o app enxerga, promove por e-mail e remove.
 * Qualquer admin pode promover ou remover outro admin (inclusive a si mesmo), exceto o último.
 */
export default function EquipeModal({ visible, onClose }) {
	const [email, setEmail] = useState('');
	const [target, setTarget] = useState(null); // { email, account|null }
	const [message, setMessage] = useState(null);
	const [busy, setBusy] = useState(false);
	const [team, setTeam] = useState({ admins: [], invitedEmails: [], revokedEmails: [] });
	const [removing, setRemoving] = useState(null);
	const myEmail = normalizeEmail(auth.currentUser?.email);

	useEffect(() => {
		if (!visible) return undefined;
		setEmail('');
		setTarget(null);
		setMessage(null);
		return subscribeTeam(setTeam, (error) => console.error('Não foi possível listar a equipe.', error));
	}, [visible]);

	const targetIsAdmin = target
		? isAdminAccount(target.account || { email: target.email }, team.invitedEmails, team.revokedEmails)
		: false;
	// Admin pelo e-mail (@admin.caleon.com) que ainda não abriu o app: é admin, mas ainda não aparece na lista.
	const targetListed = target ? team.admins.some((admin) => admin.email === target.email) : false;

	async function search() {
		const normalized = normalizeEmail(email);
		setTarget(null);
		if (!EMAIL_PATTERN.test(normalized)) {
			setMessage({ tone: 'error', text: 'Digite um e-mail válido.' });
			return;
		}
		setBusy(true);
		setMessage(null);
		try {
			const account = await findUserByEmail(normalized);
			setTarget({ email: normalized, account });
			if (isAdminAccount(account || { email: normalized }, team.invitedEmails, team.revokedEmails)) {
				setMessage({ tone: 'info', text: team.admins.some((admin) => admin.email === normalized)
					? 'Essa conta já é administradora.'
					: 'Essa conta já é administradora, mas ainda não abriu o app depois da atualização. Adicione à lista para poder gerenciá-la.' });
			} else if (!account) {
				setMessage({ tone: 'info', text: 'Essa conta ainda não abriu o app depois da atualização. Você pode convidar: ela vira admin na próxima vez que entrar.' });
			}
		} catch (error) {
			console.error('Não foi possível buscar a conta.', error);
			setMessage({ tone: 'error', text: 'Não foi possível buscar agora. Confira sua conexão.' });
		} finally {
			setBusy(false);
		}
	}

	async function promote() {
		if (!target || targetIsAdmin) return;
		setBusy(true);
		const label = target.account?.nome || target.email;
		try {
			const result = await makeAdmin(target.email, target.account);
			setMessage({
				tone: 'success',
				text: result === 'now'
					? `${label} agora é administrador. A pessoa foi avisada nas notificações e entra com o mesmo e-mail e senha.`
					: `${label} foi convidado. Na próxima vez que entrar no app, já entra como administrador e recebe o aviso.`,
			});
			showGlobalNotification(`${label} agora é administrador`);
		} catch (error) {
			console.error('Não foi possível tornar a conta administradora.', error);
			setMessage({ tone: 'error', text: friendlyError(error) });
		} finally {
			setBusy(false);
		}
	}

	// Coloca na lista um admin que ainda não abriu o app (registra o convite; o acesso continua igual).
	async function addToList() {
		if (!target) return;
		setBusy(true);
		try {
			await makeAdmin(target.email, null);
			setMessage({ tone: 'success', text: `${target.email} foi adicionado à lista da equipe.` });
		} catch (error) {
			console.error('Não foi possível adicionar à lista.', error);
			setMessage({ tone: 'error', text: friendlyError(error) });
		} finally {
			setBusy(false);
		}
	}

	function confirmRemove(admin) {
		if (team.admins.length <= 1) {
			showGlobalNotification('Não dá para remover o último administrador: a loja ficaria sem ninguém para gerenciar.');
			return;
		}
		const isMe = admin.email === myEmail;
		const label = admin.nome || admin.email;
		Alert.alert(
			'Remover administrador',
			isMe
				? 'Você vai remover o seu próprio acesso de administrador. Na próxima vez que entrar, você entra como cliente. Continuar?'
				: `${label} deixa de ser administrador e passa a entrar como cliente. Continuar?`,
			[
				{ text: 'Cancelar', style: 'cancel' },
				{ text: 'Remover', style: 'destructive', onPress: () => remove(admin) },
			],
		);
	}

	async function remove(admin) {
		setRemoving(admin.email);
		try {
			await removeAdmin(admin);
			showGlobalNotification(`${admin.nome || admin.email} não é mais administrador`);
		} catch (error) {
			console.error('Não foi possível remover o administrador.', error);
			showGlobalNotification(friendlyError(error));
		} finally {
			setRemoving(null);
		}
	}

	return (
		<ModalSobe visible={visible} onRequestClose={onClose} backdropColor="rgba(0, 0, 0, 0.4)">
			<View style={styles.overlay}>
				<TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Fechar equipe" />
				<View style={styles.dialog}>
					<View style={styles.header}>
						<CircularIconButton
							size={30}
							borderRadius={10}
							backgroundColor={C.red}
							icon={<Feather name="x" size={17} color={tc(C.white)} />}
							onPress={onClose}
							accessibilityLabel="Fechar equipe"
						/>
						<Text style={styles.title}>Equipe</Text>
						<View style={styles.headerSpacer} />
					</View>

					<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
						<Text style={styles.label}>Tornar administrador</Text>
						<Text style={styles.hint}>Digite o e-mail de uma conta cadastrada. A pessoa continua com o mesmo login.</Text>
						<View style={styles.searchRow}>
							<TextInput
								style={styles.input}
								value={email}
								onChangeText={(value) => { setEmail(value); setTarget(null); setMessage(null); }}
								placeholder="email@exemplo.com"
								placeholderTextColor={tc('#A3AAA7')}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								returnKeyType="search"
								onSubmitEditing={search}
								accessibilityLabel="E-mail da conta"
							/>
							<TouchableOpacity style={styles.searchButton} onPress={search} disabled={busy} accessibilityRole="button" accessibilityLabel="Buscar conta">
								{busy && !target ? <ActivityIndicator color={tc(C.white)} /> : <Feather name="search" size={20} color={tc(C.white)} />}
							</TouchableOpacity>
						</View>

						{target ? (
							<View style={styles.accountCard}>
								<View style={styles.avatar}><Feather name={target.account ? 'user' : 'mail'} size={20} color={tc(C.green)} /></View>
								<View style={styles.flex}>
									<Text style={styles.accountName} numberOfLines={1}>{target.account?.nome || (target.account ? 'Sem nome' : 'Convite por e-mail')}</Text>
									<Text style={styles.accountEmail} numberOfLines={1}>{target.email}</Text>
								</View>
								{targetIsAdmin ? (
									<View style={styles.adminTag}><Feather name="shield" size={12} color={tc(C.ink)} /><Text style={styles.adminTagText}>ADMIN</Text></View>
								) : null}
							</View>
						) : null}

						{message ? (
							<Text style={[styles.message, message.tone === 'error' && styles.messageError, message.tone === 'success' && styles.messageSuccess]}>
								{message.text}
							</Text>
						) : null}

						{target && targetIsAdmin && !targetListed ? (
							<TouchableOpacity style={styles.promoteButton} onPress={addToList} disabled={busy} accessibilityRole="button">
								{busy ? <ActivityIndicator color={tc(C.white)} /> : <Feather name="user-plus" size={18} color={tc(C.white)} />}
								<Text style={styles.promoteText}>Adicionar à lista da equipe</Text>
							</TouchableOpacity>
						) : null}

						{target && !targetIsAdmin ? (
							<TouchableOpacity style={styles.promoteButton} onPress={promote} disabled={busy} accessibilityRole="button">
								{busy ? <ActivityIndicator color={tc(C.white)} /> : <Feather name={target.account ? 'shield' : 'send'} size={18} color={tc(C.white)} />}
								<Text style={styles.promoteText}>{target.account ? 'Tornar admin' : 'Convidar como admin'}</Text>
							</TouchableOpacity>
						) : null}

						<Text style={[styles.label, styles.listLabel]}>Administradores ({team.admins.length})</Text>
						<Text style={styles.hint}>
							Aparecem as contas que já abriram o app depois da atualização e os convites. Qualquer administrador pode remover outro.
						</Text>
						{team.admins.length ? team.admins.map((admin) => {
							const isMe = admin.email === myEmail;
							return (
								<View key={admin.email} style={[styles.adminRow, isMe && styles.adminRowMe]}>
									<Feather name={admin.pending && !admin.byDomain ? 'clock' : 'shield'} size={16} color={tc(admin.pending && !admin.byDomain ? '#E7A51A' : C.green)} />
									<View style={styles.flex}>
										<Text style={styles.accountName} numberOfLines={1}>{admin.nome || admin.email}{isMe ? ' (você)' : ''}</Text>
										{admin.nome ? <Text style={styles.accountEmail} numberOfLines={1}>{admin.email}</Text> : null}
										<Text style={styles.origin} numberOfLines={1}>{originLabel(admin)}</Text>
									</View>
									<TouchableOpacity
										style={styles.removeButton}
										onPress={() => confirmRemove(admin)}
										disabled={removing === admin.email}
										accessibilityRole="button"
										accessibilityLabel={`Remover ${admin.nome || admin.email} da administração`}
									>
										{removing === admin.email
											? <ActivityIndicator size="small" color={tc(C.red)} />
											: <Feather name="user-x" size={17} color={tc(C.red)} />}
									</TouchableOpacity>
								</View>
							);
						}) : <Text style={styles.empty}>Nenhum administrador encontrado.</Text>}
					</ScrollView>
				</View>
			</View>
		</ModalSobe>
	);
}

const styles = themedStyles(StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
	dialog: { width: '100%', maxWidth: 440, maxHeight: '86%', padding: 18, borderRadius: 18, backgroundColor: C.white, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerSpacer: { width: 30 },
	title: { color: '#111715', fontFamily: F.display, fontSize: 24 },
	content: { paddingTop: 16, paddingBottom: 4 },
	label: { color: C.ink, fontFamily: F.bold, fontSize: 15 },
	listLabel: { marginTop: 24 },
	hint: { marginTop: 4, color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
	searchRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
	input: { flex: 1, height: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDE5E1', backgroundColor: C.background, color: C.ink, fontFamily: F.medium, fontSize: 15 },
	searchButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
	accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: C.background },
	avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D8F6E9', alignItems: 'center', justifyContent: 'center' },
	accountName: { color: C.ink, fontFamily: F.bold, fontSize: 14 },
	accountEmail: { color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 2 },
	origin: { color: C.muted, fontFamily: F.body, fontSize: 11, marginTop: 2 },
	adminTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#FFC928' },
	adminTagText: { color: C.ink, fontFamily: F.bold, fontSize: 10 },
	message: { marginTop: 10, color: C.ink, fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
	messageError: { color: C.red },
	messageSuccess: { color: C.success },
	promoteButton: { minHeight: 50, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: C.green },
	promoteText: { color: C.white, fontFamily: F.bold, fontSize: 15 },
	adminRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDE5E1' },
	adminRowMe: { backgroundColor: '#F2FBF7', borderColor: C.mint },
	removeButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
	empty: { marginTop: 10, color: C.muted, fontFamily: F.body, fontSize: 13 },
}));
