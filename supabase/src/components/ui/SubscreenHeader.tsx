import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../../constants/theme';

type SubscreenHeaderProps = {
  title: string;
  subtitle?: string;
  backLabel?: string;
};

export function SubscreenHeader({ title, subtitle, backLabel = 'Back' }: SubscreenHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← {backLabel}</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
});
