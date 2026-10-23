import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafeAreaScreen({ children, edges = ['top', 'bottom'], ...props }) {
	return (
		<SafeAreaView {...props} edges={edges}>
			{children}
		</SafeAreaView>
	);
}
