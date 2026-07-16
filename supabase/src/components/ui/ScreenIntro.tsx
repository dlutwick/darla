import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type ScreenIntroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenIntro({ eyebrow, title, subtitle }: ScreenIntroProps) {
  return (
    <View style={styles.wrapper}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 10,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
});
