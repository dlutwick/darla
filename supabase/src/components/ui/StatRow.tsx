import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type StatRowProps = {
  label: string;
  value: string;
};

export function StatRow({ label, value }: StatRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.mutedText,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'right',
  },
});
