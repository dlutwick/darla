import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { theme } from '../supabase/src/constants/theme';
import { loadOnboardingSnapshot } from '../supabase/src/features/onboarding/saveOnboarding';
import { loadWeightSnapshot } from '../supabase/src/features/weight/weight-log';
import { kgToLb } from '../supabase/src/lib/weight';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatSignedWeightChange(value: number | null) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value} lbs`;
}

export default function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<{
    startingWeightKg: number | null;
    latestWeightLb: number | null;
    latestWeightKg: number | null;
    goalWeightKg: number | null;
    poundsRemaining: number | null;
    poundsLost: number | null;
    totalEntries: number;
    recentChangeLb: number | null;
    weights: { logDate: string; weightLb: number }[];
  }>({
    startingWeightKg: null,
    latestWeightLb: null,
    latestWeightKg: null,
    goalWeightKg: null,
    poundsRemaining: null,
    poundsLost: null,
    totalEntries: 0,
    recentChangeLb: null,
    weights: [],
  });
  const [statusMessage, setStatusMessage] = useState('Loading your progress…');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [onboarding, weightSnapshot] = await Promise.all([
            loadOnboardingSnapshot(),
            loadWeightSnapshot(),
          ]);
          if (!active) return;

          const latestWeightLb = weightSnapshot.latestWeight?.weightLb ?? null;
          const latestWeightKg = latestWeightLb != null ? Number((latestWeightLb / 2.20462).toFixed(1)) : null;
          const goalWeightKg = onboarding?.goalWeightKg ?? null;
          const startingWeightKg = onboarding?.currentWeightKg ?? null;
          const startingWeightLb = startingWeightKg != null ? kgToLb(startingWeightKg) : null;
          const poundsRemaining = latestWeightLb != null && goalWeightKg != null
            ? Number((latestWeightLb - kgToLb(goalWeightKg)).toFixed(1))
            : null;
          const poundsLost = startingWeightLb != null && latestWeightLb != null
            ? Number((startingWeightLb - latestWeightLb).toFixed(1))
            : null;
          const previousWeight = weightSnapshot.allWeights.length > 1
            ? weightSnapshot.allWeights[weightSnapshot.allWeights.length - 2]
            : null;
          const recentChangeLb = previousWeight && latestWeightLb != null
            ? Number((latestWeightLb - previousWeight.weightLb).toFixed(1))
            : null;

          setSnapshot({
            startingWeightKg,
            latestWeightLb,
            latestWeightKg,
            goalWeightKg,
            poundsRemaining,
            poundsLost,
            totalEntries: weightSnapshot.allWeights.length,
            recentChangeLb,
            weights: weightSnapshot.allWeights.map((entry) => ({
              logDate: entry.logDate,
              weightLb: entry.weightLb,
            })),
          });
          setStatusMessage('Progress loaded from local MVP data.');
        } catch (error) {
          if (active) {
            setStatusMessage(
              error instanceof Error ? error.message : 'Could not load progress right now.'
            );
            setSnapshot({
              startingWeightKg: null,
              latestWeightLb: null,
              latestWeightKg: null,
              goalWeightKg: null,
              poundsRemaining: null,
              poundsLost: null,
              totalEntries: 0,
              recentChangeLb: null,
              weights: [],
            });
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [])
  );

  const startLb = snapshot.startingWeightKg != null ? kgToLb(snapshot.startingWeightKg) : null;
  const firstLoggedWeightLb = snapshot.weights.length ? snapshot.weights[0]?.weightLb ?? null : null;
  const progressBaselineLb = firstLoggedWeightLb ?? startLb;
  const goalLb = snapshot.goalWeightKg != null ? kgToLb(snapshot.goalWeightKg) : null;
  const progressToGoalPercent = progressBaselineLb != null && goalLb != null && snapshot.latestWeightLb != null && progressBaselineLb !== goalLb
    ? clampPercent(((progressBaselineLb - snapshot.latestWeightLb) / (progressBaselineLb - goalLb)) * 100)
    : null;
  const trendMessage = snapshot.recentChangeLb == null
    ? 'Log at least two weights to see your recent trend.'
    : snapshot.recentChangeLb < 0
      ? `Down ${Math.abs(snapshot.recentChangeLb)} lbs since the last entry.`
      : snapshot.recentChangeLb > 0
        ? `Up ${snapshot.recentChangeLb} lbs since the last entry.`
        : 'No change since the last entry.';

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Progress"
        title="Your trend"
        subtitle="See your real weight changes and recent entries — not just the target."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Snapshot" subtitle="Pulled from your saved targets and weight entries." />

        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroLabel}>Pounds lost</Text>
            <Text style={styles.heroValue}>{snapshot.poundsLost?.toString() ?? '—'}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroLabel}>Remaining</Text>
            <Text style={styles.heroValue}>{snapshot.poundsRemaining?.toString() ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Goal progress</Text>
            <Text style={styles.progressPercent}>{progressToGoalPercent != null ? `${Math.round(progressToGoalPercent)}%` : '—'}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: progressToGoalPercent != null ? `${progressToGoalPercent}%` : '0%' },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>Based on your first logged weight, current weight, and goal weight.</Text>
        </View>

        <View style={styles.trendCallout}>
          <Text style={styles.trendTitle}>Recent trend</Text>
          <Text style={styles.trendBody}>{trendMessage}</Text>
          <Text style={styles.trendNote}>Small day-to-day weight changes are normal, so watch the trend more than any single entry.</Text>
        </View>

        <StatRow label="Starting weight (lbs)" value={startLb?.toString() ?? '—'} />
        <StatRow label="Current weight (lbs)" value={snapshot.latestWeightLb?.toString() ?? '—'} />
        <StatRow label="Goal weight (lbs)" value={goalLb?.toString() ?? '—'} />
        <StatRow label="Weight entries logged" value={snapshot.totalEntries.toString()} />
        <StatRow label="Change since last entry" value={formatSignedWeightChange(snapshot.recentChangeLb)} />
      </Card>

      <Card>
        <SectionHeader title="Recent entries" subtitle="Newest first so the latest movement is easy to scan." />
        {snapshot.weights.length ? (
          snapshot.weights.slice(-5).reverse().map((entry) => (
            <StatRow key={entry.logDate} label={entry.logDate} value={`${entry.weightLb} lbs`} />
          ))
        ) : (
          <StatRow label="No entries yet" value="Log a weight to begin" />
        )}
      </Card>

      <Button label="Log today's weight" onPress={() => router.push('/weight-log')} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  heroStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.softSurface,
    gap: 4,
  },
  heroLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  progressBlock: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  progressPercent: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.softSurface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  progressHint: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  trendCallout: {
    gap: 4,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  trendTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  trendBody: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  trendNote: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
});
