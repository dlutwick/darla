import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { ALL_MONTHS_KEY } from '../../features/business/reporting';

type Props = {
  selectedMonth: string;
  months: string[];
  onSelect: (month: string) => void;
};

export function MonthFilterBar({ selectedMonth, months, onSelect }: Props) {
  const options = [ALL_MONTHS_KEY, ...months];

  return (
    <View style={styles.wrap}>
      {options.map((month) => {
        const active = selectedMonth === month;
        return (
          <Pressable key={month} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => onSelect(month)}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{month === ALL_MONTHS_KEY ? 'All' : month}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.softSurface,
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  labelActive: {
    color: theme.colors.primaryText,
  },
});
