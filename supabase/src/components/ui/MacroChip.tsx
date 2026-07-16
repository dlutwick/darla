import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type MacroChipProps = {
  label: string;
  value: string;
};

export function MacroChip({ label, value }: MacroChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.softSurface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.mutedText,
    fontSize: 14,
  },
  value: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
