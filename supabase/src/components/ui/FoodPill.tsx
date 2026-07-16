import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../constants/theme';

type FoodPillProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
};

export function FoodPill({ label, onPress, selected = false }: FoodPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : null,
        pressed ? styles.pillPressed : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, selected ? styles.textSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: theme.colors.softSurface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  textSelected: {
    color: theme.colors.primaryText,
  },
});
