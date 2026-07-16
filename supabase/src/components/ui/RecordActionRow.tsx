import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type RecordActionRowProps = {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel?: string;
};

export function RecordActionRow({ onView, onEdit, onDelete, deleteLabel = 'Delete' }: RecordActionRowProps) {
  return (
    <View style={styles.row}>
      <ActionChip label="View" onPress={onView} />
      <ActionChip label="Edit" onPress={onEdit} />
      <ActionChip label={deleteLabel} onPress={onDelete} destructive />
    </View>
  );
}

function ActionChip({ label, onPress, destructive = false }: { label: string, onPress: () => void, destructive?: boolean }) {
  return (
    <Pressable style={[styles.chip, destructive ? styles.chipDanger : null]} onPress={onPress}>
      <Text style={[styles.chipLabel, destructive ? styles.chipLabelDanger : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipDanger: {
    borderColor: '#c46a62',
    backgroundColor: '#fff3f1',
  },
  chipLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  chipLabelDanger: {
    color: '#9b3b34',
  },
});
