export function getProfileStorageKey(uid) {
	return `caleon-profile-${uid || 'anonymous'}`;
}
