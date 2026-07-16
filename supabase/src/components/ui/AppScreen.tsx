import { PropsWithChildren, RefObject } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../constants/theme';

type AppScreenProps = PropsWithChildren<{
  scrollRef?: RefObject<ScrollView | null>;
}>;

export function AppScreen({ children, scrollRef }: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.backgroundShell}>
          <View style={styles.inner}>{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 3,
  },
  backgroundShell: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    position: 'relative',
  },
  inner: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    gap: theme.spacing.md,
    zIndex: 1,
  },
});
