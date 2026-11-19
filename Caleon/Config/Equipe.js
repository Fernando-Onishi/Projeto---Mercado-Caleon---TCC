import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './FireBaseConfig';
import { toDate } from './Pedidos';

// Equipe do mercado (tela Equipe do admin).
// Uma conta é administradora quando qualquer um destes vale, e o e-mail não está na lista de removidos:
//   - e-mail termina em @admin.caleon.com
//   - users/{uid}.role == 'admin' (promovida na hora)
//   - convite em adminInvites/{email} (promovida antes de abrir o app)
// Qualquer admin pode promover ou remover outro admin. A pessoa continua com o mesmo e-mail e senha.

const DOMAIN_ADMIN = /@admin\.caleon\.com$/;

// Contas @admin.caleon.com que existem no Firebase Authentication. O app não consegue ler a lista de
// logins (isso exige servidor/plano pago), então elas ficam registradas aqui para aparecerem na Equipe
// mesmo antes de abrirem o app. Ao criar uma nova conta @admin.caleon.com, acrescente o e-mail aqui.
export const KNOWN_DOMAIN_ADMINS = [
	'jonas@admin.caleon.com',
	'fernando@admin.caleon.com',
	'nicolas@admin.caleon.com',
];

export function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

export function isDomainAdminEmail(email) {
	return DOMAIN_ADMIN.test(normalizeEmail(email));
}

/**
 * Registra a conta em users/{uid} sempre que alguém entra no app (e-mail e nome),
 * para o admin conseguir encontrá-la pelo e-mail. Não mexe no papel (role).
 */
export async function registerSignedInUser(user) {
	if (!user?.uid) return;
	try {
		await setDoc(doc(db, 'users', user.uid), {
			uid: user.uid,
			email: normalizeEmail(user.email),
			...(user.displayName ? { nome: user.displayName } : {}),
			lastLoginAt: serverTimestamp(),
		}, { merge: true });
	} catch (error) {
		console.warn('Não foi possível registrar a conta em users.', error?.code || error);
	}
}

export async function findUserByEmail(email) {
	const normalized = normalizeEmail(email);
	if (!normalized) return null;
	const snapshot = await getDocs(query(collection(db, 'users'), where('email', '==', normalized), limit(1)));
	const found = snapshot.docs[0];
	return found ? { id: found.id, ...found.data() } : null;
}

export function isAdminAccount(account, invitedEmails = [], revokedEmails = []) {
	const email = normalizeEmail(account?.email);
	if (revokedEmails.includes(email)) return false;
	return account?.role === 'admin' || isDomainAdminEmail(email) || invitedEmails.includes(email);
}

/**
 * Acompanha a equipe inteira: contas registradas, convites e removidos.
 * onChange({ admins, invitedEmails, revokedEmails }) — admins já sem os removidos.
 */
export function subscribeTeam(onChange, onError) {
	let users = [];
	let invites = [];
	let revocations = [];
	const emit = () => {
		const invitedEmails = invites.map((invite) => normalizeEmail(invite.email || invite.id));
		const revokedEmails = revocations.map((item) => normalizeEmail(item.email || item.id));
		const byEmail = new Map();
		users.forEach((user) => {
			const email = normalizeEmail(user.email);
			if (!email || !isAdminAccount(user, invitedEmails, revokedEmails)) return;
			byEmail.set(email, {
				email,
				nome: user.nome || null,
				userId: user.id,
				byRole: user.role === 'admin',
				byInvite: invitedEmails.includes(email),
				byDomain: isDomainAdminEmail(email),
				pending: false,
			});
		});
		invitedEmails.forEach((email) => {
			if (!email || byEmail.has(email) || revokedEmails.includes(email)) return;
			byEmail.set(email, { email, nome: null, userId: null, byRole: false, byInvite: true, byDomain: isDomainAdminEmail(email), pending: true });
		});
		// Admins pelo e-mail que ainda não abriram o app: aparecem mesmo assim (a menos que tenham sido removidos).
		KNOWN_DOMAIN_ADMINS.forEach((email) => {
			if (byEmail.has(email) || revokedEmails.includes(email)) return;
			byEmail.set(email, { email, nome: null, userId: null, byRole: false, byInvite: false, byDomain: true, pending: false });
		});
		const admins = [...byEmail.values()].sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email));
		onChange({ admins, invitedEmails, revokedEmails });
	};
	const stops = [
		onSnapshot(collection(db, 'users'), (snapshot) => { users = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); emit(); }, onError),
		onSnapshot(collection(db, 'adminInvites'), (snapshot) => { invites = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); emit(); }, () => { invites = []; emit(); }),
		onSnapshot(collection(db, 'adminRevocations'), (snapshot) => { revocations = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); emit(); }, () => { revocations = []; emit(); }),
	];
	return () => stops.forEach((stop) => stop());
}

const byMe = () => normalizeEmail(auth.currentUser?.email);

/**
 * Torna a conta administradora. Com conta registrada, vale na hora (campo role);
 * sem conta registrada, fica o convite por e-mail. Também tira o e-mail da lista de removidos.
 */
export async function makeAdmin(email, account) {
	const normalized = normalizeEmail(email);
	try {
		await deleteDoc(doc(db, 'adminRevocations', normalized));
	} catch {
		// Não estava na lista de removidos (ou regras antigas): segue.
	}
	if (account?.id) {
		await updateDoc(doc(db, 'users', account.id), {
			role: 'admin',
			roleChange: { role: 'admin', byEmail: byMe(), at: serverTimestamp() },
			updatedAt: serverTimestamp(),
		});
		try {
			await setDoc(doc(db, 'adminInvites', normalized), { email: normalized, role: 'admin', byEmail: byMe(), at: serverTimestamp() });
		} catch {
			// Opcional para quem já foi promovido pelo campo role.
		}
		return 'now';
	}
	await setDoc(doc(db, 'adminInvites', normalized), { email: normalized, role: 'admin', byEmail: byMe(), at: serverTimestamp() });
	return 'invited';
}

/**
 * Remove o acesso de administrador, seja qual for a origem (role, convite ou e-mail @admin.caleon.com).
 * A conta continua existindo e passa a entrar como cliente.
 */
export async function removeAdmin(admin) {
	const email = normalizeEmail(admin.email);
	if (admin.byInvite || admin.pending) {
		await deleteDoc(doc(db, 'adminInvites', email));
	}
	if (admin.byDomain) {
		await setDoc(doc(db, 'adminRevocations', email), { email, byEmail: byMe(), at: serverTimestamp() });
	}
	if (admin.userId) {
		await updateDoc(doc(db, 'users', admin.userId), {
			role: 'client',
			roleChange: { role: 'client', byEmail: byMe(), at: serverTimestamp() },
			updatedAt: serverTimestamp(),
		});
	}
}

// O próprio usuário: para avisar quando ele vira ou deixa de ser admin.
export function subscribeOwnUser(uid, onChange) {
	if (!uid) return () => {};
	return onSnapshot(doc(db, 'users', uid), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null), () => onChange(null));
}

// O próprio convite do usuário.
export function subscribeOwnInvite(email, onChange) {
	const normalized = normalizeEmail(email);
	if (!normalized) return () => {};
	return onSnapshot(
		doc(db, 'adminInvites', normalized),
		(snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
		() => onChange(null),
	);
}

/**
 * Avisa quando o próprio usuário vira administrador (campo role ou convite).
 * Chama onChange(timestamp da promoção) ou onChange(null) se ele não for (ou não for mais) admin promovido.
 */
export function subscribePromotion(uid, email, onChange) {
	let roleAt = null;
	let inviteAt = null;
	const emit = () => {
		const moments = [roleAt, inviteAt].filter(Boolean);
		onChange(moments.length ? Math.min(...moments) : null);
	};
	const stopUser = subscribeOwnUser(uid, (data) => {
		roleAt = data?.roleChange?.role === 'admin' ? toDate(data.roleChange.at)?.getTime() || null : null;
		emit();
	});
	const stopInvite = subscribeOwnInvite(email, (data) => {
		inviteAt = data ? toDate(data.at)?.getTime() || null : null;
		emit();
	});
	return () => {
		stopUser();
		stopInvite();
	};
}

// Avisa quando o próprio usuário deixou de ser administrador: onChange(timestamp) ou onChange(null).
export function subscribeRemoval(uid, onChange) {
	return subscribeOwnUser(uid, (data) => {
		onChange(data?.roleChange?.role === 'client' ? toDate(data.roleChange.at)?.getTime() || null : null);
	});
}
