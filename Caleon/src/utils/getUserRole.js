import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../Config/FireBaseConfig';
import { getRoleByEmail } from './getRoleByEmail';

const roles = ['admin', 'employee', 'client'];

export async function getUserRole(user) {
	try {
		const userDocument = await getDoc(doc(db, 'users', user.uid));
		const storedRole = userDocument.exists() ? userDocument.data().role : null;

		return roles.includes(storedRole) ? storedRole : getRoleByEmail(user.email);
	} catch (error) {
		console.error(
			`Não foi possível ler users/${user.uid} no Firestore; usando o papel derivado do e-mail.`,
			error,
		);
		return getRoleByEmail(user.email);
	}
}

export function getHomeRouteByRole(role) {
	if (role === 'admin' || role === 'employee') return 'AdminHome';
	return 'TelaHome';
}
