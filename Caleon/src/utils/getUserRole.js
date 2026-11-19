import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../Config/FireBaseConfig';
import { getRoleByEmail } from './getRoleByEmail';

const roles = ['admin', 'employee', 'client'];

async function exists(collectionName, email) {
	const normalized = String(email || '').trim().toLowerCase();
	if (!normalized) return false;
	try {
		return (await getDoc(doc(db, collectionName, normalized))).exists();
	} catch {
		// Sem permissão para ler (regras antigas) ou sem conexão.
		return false;
	}
}

/**
 * Papel do usuário, na mesma ordem das regras do Firestore:
 * 1. E-mail na lista de removidos (adminRevocations) → cliente, mesmo com e-mail @admin.caleon.com.
 * 2. users/{uid}.role 'admin' ou 'employee' → esse papel.
 * 3. Convite de admin (adminInvites/{email}) → admin.
 * 4. users/{uid}.role 'client' → cliente; senão, o papel pelo domínio do e-mail.
 */
export async function getUserRole(user) {
	if (await exists('adminRevocations', user.email)) return 'client';
	try {
		const userDocument = await getDoc(doc(db, 'users', user.uid));
		const storedRole = userDocument.exists() ? userDocument.data().role : null;
		if (storedRole === 'admin' || storedRole === 'employee') return storedRole;
		if (await exists('adminInvites', user.email)) return 'admin';
		if (storedRole === 'client') return 'client';
		return getRoleByEmail(user.email);
	} catch (error) {
		console.error(
			`Não foi possível ler users/${user.uid} no Firestore; usando o papel derivado do e-mail.`,
			error,
		);
		if (await exists('adminInvites', user.email)) return 'admin';
		return getRoleByEmail(user.email);
	}
}

export function getHomeRouteByRole(role) {
	if (role === 'admin' || role === 'employee') return 'AdminHome';
	return 'TelaHome';
}
