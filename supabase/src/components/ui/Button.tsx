import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Button({ label, onPress, disabled = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, disabled ? styles.labelDisabled : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    backgroundColor: '#6e7872',
  },
  label: {
    color: theme.colors.primaryText,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelDisabled: {
    opacity: 0.92,
  },
});
