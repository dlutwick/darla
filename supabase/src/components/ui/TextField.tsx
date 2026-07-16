import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../constants/theme';

type TextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  error?: string;
  placeholder?: string;
  dense?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  error,
  placeholder,
  dense = false,
  multiline = false,
  numberOfLines,
  editable = true,
}: TextFieldProps) {
  const webNumeric = Platform.OS === 'web' && keyboardType === 'numeric';

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={webNumeric ? 'default' : keyboardType}
        inputMode={webNumeric ? 'decimal' : undefined}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedText}
        autoCorrect={false}
        autoCapitalize="none"
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, dense ? styles.inputDense : null, multiline ? styles.inputMultiline : null, !editable ? styles.inputDisabled : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 17,
  },
  inputDense: {
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 14,
  },
  inputDisabled: {
    backgroundColor: theme.colors.softSurface,
    color: theme.colors.mutedText,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
  },
});
