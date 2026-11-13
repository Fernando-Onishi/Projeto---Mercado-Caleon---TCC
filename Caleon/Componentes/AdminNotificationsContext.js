import React, { createContext, useContext, useState } from 'react';
import { TEST_NOTIFICATIONS } from '../TelasAdmin/adminNotifications';

const AdminNotificationsContext = createContext(null);

export function AdminNotificationsProvider({ children }) {
	const [notifications, setNotifications] = useState(TEST_NOTIFICATIONS);

	function removeNotification(title) {
		setNotifications((current) => current.filter((notification) => notification.title !== title));
	}

	function clearNotifications() {
		setNotifications([]);
	}

	return (
		<AdminNotificationsContext.Provider value={{ notifications, removeNotification, clearNotifications }}>
			{children}
		</AdminNotificationsContext.Provider>
	);
}

export function useAdminNotifications() {
	const context = useContext(AdminNotificationsContext);
	if (!context) throw new Error('useAdminNotifications deve ser usado dentro de AdminNotificationsProvider.');
	return context;
}