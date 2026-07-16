import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { exportHealthBackupState, getAppHealthRepository } from '../supabase/src/data/repositories/app-health-repository';
import { defaultUserProfile } from '../supabase/src/data/seeds/default-user-profile';
import { exportWorkoutBackupState } from '../supabase/src/features/workouts/workout-log';
import { loadWeightSnapshot } from '../supabase/src/features/weight/weight-log';
import { formatNumber, formatPercent, formatWithUnit } from '../supabase/src/lib/format';

function parseOptionalPositiveNumber(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be more than 0.`);
  }

  return parsed;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function ProfileScreen() {
  const [statusMessage, setStatusMessage] = useState('Loading your profile…');
  const [saving, setSaving] = useState(false);
  const [goalWeightLb, setGoalWeightLb] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [stepGoal, setStepGoal] = useState('');
  const [mileGoal, setMileGoal] = useState('');
  const [weightStats, setWeightStats] = useState({
    startingWeightLb: null as number | null,
    currentWeightLb: null as number | null,
    entries: [] as { logDate: string; weightLb: number }[],
    poundsLost: null as number | null,
    poundsRemaining: null as number | null,
    progressPercent: null as number | null,
  });

  const refresh = useCallback(async () => {
    try {
      const repository = await getAppHealthRepository();
      const [profile, weightSnapshot] = await Promise.all([
        repository.getUserProfile(),
        loadWeightSnapshot(),
      ]);

      const effectiveProfile = {
        ...defaultUserProfile,
        ...(profile ?? {}),
      };

      const entries = weightSnapshot.allWeights.map((entry) => ({ logDate: entry.logDate, weightLb: entry.weightLb }));
      const startingWeightLb = entries[0]?.weightLb ?? null;
      const currentWeightLb = entries[entries.length - 1]?.weightLb ?? null;
      const poundsLost = startingWeightLb != null && currentWeightLb != null
        ? Number((startingWeightLb - currentWeightLb).toFixed(1))
        : null;
      const poundsRemaining = currentWeightLb != null && effectiveProfile.goalWeightLb != null
        ? Number((currentWeightLb - effectiveProfile.goalWeightLb).toFixed(1))
        : null;
      const progressPercent = startingWeightLb != null && currentWeightLb != null && effectiveProfile.goalWeightLb != null && startingWeightLb !== effectiveProfile.goalWeightLb
        ? clampPercent(((startingWeightLb - currentWeightLb) / (startingWeightLb - effectiveProfile.goalWeightLb)) * 100)
        : null;

      setGoalWeightLb(effectiveProfile.goalWeightLb != null ? String(effectiveProfile.goalWeightLb) : '');
      setCalorieGoal(effectiveProfile.dailyCalorieTarget != null ? String(effectiveProfile.dailyCalorieTarget) : '');
      setProteinGoal(effectiveProfile.proteinTargetG != null ? String(effectiveProfile.proteinTargetG) : '');
      setCarbGoal(effectiveProfile.carbTargetG != null ? String(effectiveProfile.carbTargetG) : '');
      setFatGoal(effectiveProfile.fatTargetG != null ? String(effectiveProfile.fatTargetG) : '');
      setStepGoal(effectiveProfile.stepGoal != null ? String(effectiveProfile.stepGoal) : '');
      setMileGoal(effectiveProfile.mileGoal != null ? String(effectiveProfile.mileGoal) : '');
      setWeightStats({
        startingWeightLb,
        currentWeightLb,
        entries,
        poundsLost,
        poundsRemaining,
        progressPercent,
      });
      setStatusMessage('Profile goals and weight progress are ready to review.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load your profile.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function handleSaveProfile() {
    try {
      setSaving(true);
      const repository = await getAppHealthRepository();
      const currentProfile = (await repository.getUserProfile()) ?? defaultUserProfile;
      const timestamp = new Date().toISOString();

      await repository.saveUserProfile({
        ...currentProfile,
        goalWeightLb: parseOptionalPositiveNumber(goalWeightLb, 'Goal weight'),
        dailyCalorieTarget: parseOptionalPositiveNumber(calorieGoal, 'Calorie goal'),
        proteinTargetG: parseOptionalPositiveNumber(proteinGoal, 'Protein goal'),
        carbTargetG: parseOptionalPositiveNumber(carbGoal, 'Carb goal'),
        fatTargetG: parseOptionalPositiveNumber(fatGoal, 'Fat goal'),
        stepGoal: parseOptionalPositiveNumber(stepGoal, 'Step goal'),
        mileGoal: parseOptionalPositiveNumber(mileGoal, 'Mile goal'),
        updatedAt: timestamp,
      });

      await refresh();
      setStatusMessage('Profile saved. Dashboard and logs will use these updated goals.');
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Profile save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportBackup() {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Backup export works in the web app browser.');
      }

      const [healthState, workoutState] = await Promise.all([
        exportHealthBackupState(),
        Promise.resolve(exportWorkoutBackupState()),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: 1,
        healthState,
        workoutState,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeDate = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `darla-health-backup-${safeDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusMessage('Backup downloaded. Keep that file somewhere safe so your entries are easier to protect.');
    } catch (error) {
      Alert.alert('Could not export backup', error instanceof Error ? error.message : 'Backup export failed.');
    }
  }

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="My Profile"
        title="Goals, weight, and progress"
        subtitle="Your current weight, starting point, goals, and progress all live here now with cleaner rounded values."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Weight snapshot" subtitle="Current, starting, and goal weight with a clearer progress section." />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatWithUnit(weightStats.currentWeightLb, 'lbs')}</Text>
            <Text style={styles.summaryLabel}>Current weight</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatWithUnit(weightStats.startingWeightLb, 'lbs')}</Text>
            <Text style={styles.summaryLabel}>Starting weight</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{goalWeightLb ? `${formatNumber(Number(goalWeightLb), 1)} lbs` : '—'}</Text>
            <Text style={styles.summaryLabel}>Goal weight</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatPercent(weightStats.progressPercent, 0)}</Text>
            <Text style={styles.summaryLabel}>Goal reached</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Weight progress</Text>
            <Text style={styles.progressPercent}>{weightStats.progressPercent == null ? 'Not enough data' : `${formatPercent(weightStats.progressPercent, 0)} goal reached`}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${weightStats.progressPercent ?? 0}%` }]} />
          </View>
          <Text style={styles.progressMeta}>{formatWithUnit(weightStats.poundsLost, 'lbs')} lost • {formatWithUnit(weightStats.poundsRemaining, 'lbs')} remaining</Text>
        </View>

        <Button label="Log Weight" onPress={() => router.push('/weight-log')} />
      </Card>

      <Card>
        <SectionHeader title="Goals" subtitle="These goals feed the dashboard totals, remaining values, and activity targets." />
        <StatRow label="Calorie goal" value={calorieGoal ? formatNumber(Number(calorieGoal), 0) : 'Not set'} />
        <StatRow label="Protein goal" value={proteinGoal ? `${formatNumber(Number(proteinGoal), 1)} g` : 'Not set'} />
        <StatRow label="Carb goal" value={carbGoal ? `${formatNumber(Number(carbGoal), 1)} g` : 'Not set'} />
        <StatRow label="Fat goal" value={fatGoal ? `${formatNumber(Number(fatGoal), 1)} g` : 'Not set'} />
        <StatRow label="Step goal" value={stepGoal ? formatNumber(Number(stepGoal), 0) : 'Not set'} />
        <StatRow label="Mile goal" value={mileGoal ? `${formatNumber(Number(mileGoal), 1)} mi` : 'Not set'} />
      </Card>

      <Card>
        <SectionHeader title="Edit your goals" subtitle="Bigger fields, stronger contrast, and saved values that round cleanly across the app." />
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Goal weight (lbs)" value={goalWeightLb} onChangeText={setGoalWeightLb} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Calorie goal" value={calorieGoal} onChangeText={setCalorieGoal} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Protein goal (g)" value={proteinGoal} onChangeText={setProteinGoal} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Carb goal (g)" value={carbGoal} onChangeText={setCarbGoal} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Fat goal (g)" value={fatGoal} onChangeText={setFatGoal} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Step goal" value={stepGoal} onChangeText={setStepGoal} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <View style={styles.singleFieldRow}>
          <TextField label="Mile goal" value={mileGoal} onChangeText={setMileGoal} keyboardType="numeric" placeholder="0" />
        </View>
        <Button label={saving ? 'Saving…' : 'Save Profile'} onPress={() => { void handleSaveProfile(); }} disabled={saving} />
      </Card>

      <Card>
        <SectionHeader title="Recent weight check-ins" subtitle="Newest entries first so progress is easy to scan." />
        {weightStats.entries.length ? (
          <View style={styles.recentList}>
            {weightStats.entries.slice(-5).reverse().map((entry) => (
              <StatRow key={entry.logDate} label={entry.logDate} value={`${formatNumber(entry.weightLb, 1)} lbs`} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No weight entries saved yet.</Text>
        )}
      </Card>

      <Card>
        <SectionHeader title="Backup your data" subtitle="Download a copy of your meals, workouts, profile, and weight entries so what you entered is easier to keep safe." />
        <Button label="Download Backup" onPress={() => { void handleExportBackup(); }} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  summaryTile: {
    minWidth: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.softSurface,
    gap: 4,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  summaryLabel: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressBlock: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  progressPercent: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.softSurface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.full,
  },
  progressMeta: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  fieldCell: {
    flex: 1,
  },
  singleFieldRow: {
    maxWidth: 260,
  },
  recentList: {
    gap: 2,
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
});
