import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type InlineStatusProps = {
  label?: string;
  message: string;
};

export function InlineStatus({ label = 'Status', message }: InlineStatusProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: 4,
  },
  label: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  message: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
});
