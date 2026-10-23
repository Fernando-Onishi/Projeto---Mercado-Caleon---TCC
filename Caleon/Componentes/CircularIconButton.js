import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

const DEFAULT_MINT = '#40B190';

export default function CircularIconButton({
	icon,
	onPress,
	accessibilityLabel,
	accessibilityState,
	disabled = false,
	size = 40,
	backgroundColor = DEFAULT_MINT,
	borderRadius = size / 2,
	style,
}) {
	return (
		<TouchableOpacity
			style={[
				styles.button,
				{ width: size, height: size, borderRadius, backgroundColor },
				style,
			]}
			onPress={onPress}
			activeOpacity={0.7}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ ...accessibilityState, disabled }}
		>
			{icon}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});
