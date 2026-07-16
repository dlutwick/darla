import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.mutedText,
    lineHeight: 22,
  },
});
