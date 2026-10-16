export function getRoleByEmail(email) {
	const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

	if (normalizedEmail.endsWith('@admin.caleon.com')) return 'admin';
	if (normalizedEmail.endsWith('@equipe.caleon.com')) return 'employee';
	return 'client';
}
