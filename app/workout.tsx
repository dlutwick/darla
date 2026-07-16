import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { loadWorkoutSnapshot, saveWorkoutEntry } from '../supabase/src/features/workouts/workout-log';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatNumber } from '../supabase/src/lib/format';

function parsePositiveNumber(value: string, label: string, allowZero = false) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label} must be ${allowZero ? '0 or more' : 'more than 0'}.`);
  }
  return parsed;
}

export default function WorkoutLogScreen() {
  const [statusMessage, setStatusMessage] = useState('Loading today’s workout log…');
  const [date, setDate] = useState(getLocalDay());
  const [workoutType, setWorkoutType] = useState('Weight training');
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weightUsed, setWeightUsed] = useState('0');
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState('0');
  const [miles, setMiles] = useState('0');
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Array<{
    workoutEntryId: string;
    workoutType: string;
    exercise: string;
    sets: number;
    reps: number;
    weightUsed: number;
    notes: string | null;
  }>>([]);
  const [summary, setSummary] = useState({
    exerciseCount: 0,
    totalSets: 0,
    totalVolume: 0,
    latestExercise: null as string | null,
  });

  const refresh = useCallback(async (targetDate: string) => {
    try {
      const snapshot = await loadWorkoutSnapshot(targetDate);
      setEntries(snapshot.entries);
      setSummary(snapshot.summary);
      setSteps(String(snapshot.steps ?? 0));
      setMiles(String(snapshot.miles ?? 0));
      setStatusMessage(snapshot.entries.length ? 'Workout log loaded. Daily steps and miles are tied to this date.' : 'Workout log is ready. Save a workout row and your daily activity for this date.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load the workout log.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh(date);
    }, [date, refresh])
  );

  async function handleSave() {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        throw new Error('Date must use YYYY-MM-DD.');
      }
      if (!workoutType.trim()) {
        throw new Error('Workout type is required.');
      }
      if (!exercise.trim()) {
        throw new Error('Exercise is required.');
      }

      setSaving(true);
      await saveWorkoutEntry({
        logDate: date.trim(),
        workoutType: workoutType.trim(),
        exercise: exercise.trim(),
        sets: parsePositiveNumber(sets, 'Sets'),
        reps: parsePositiveNumber(reps, 'Reps'),
        weightUsed: parsePositiveNumber(weightUsed || '0', 'Weight used', true),
        notes,
        steps: parsePositiveNumber(steps || '0', 'Steps', true),
        miles: parsePositiveNumber(miles || '0', 'Miles', true),
      });

      setExercise('');
      setSets('3');
      setReps('10');
      setWeightUsed('0');
      setNotes('');
      await refresh(date.trim());
      setStatusMessage('Workout row saved and daily activity updated.');
    } catch (error) {
      Alert.alert('Could not save workout', error instanceof Error ? error.message : 'Workout save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Workout Log"
        title="Track lifting, steps, and miles"
        subtitle="Save each exercise row with sets, reps, weight used, plus the day’s steps and miles in one place."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Today’s workout summary" subtitle="A quick read on what is already saved for this date." />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatNumber(summary.exerciseCount, 0)}</Text>
            <Text style={styles.summaryLabel}>Exercises</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatNumber(summary.totalSets, 0)}</Text>
            <Text style={styles.summaryLabel}>Sets</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatNumber(Number(steps), 0)}</Text>
            <Text style={styles.summaryLabel}>Steps</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{formatNumber(Number(miles))}</Text>
            <Text style={styles.summaryLabel}>Miles</Text>
          </View>
        </View>
        <Text style={styles.summaryNote}>Latest exercise: {summary.latestExercise ?? 'Nothing logged yet'}</Text>
      </Card>

      <Card>
        <SectionHeader title="Add workout row" subtitle="Save one exercise row at a time, and use notes for floor work, circuits, or extra details." />
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" dense />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Workout type" value={workoutType} onChangeText={setWorkoutType} placeholder="Weight training" dense />
          </View>
        </View>
        <TextField label="Exercise" value={exercise} onChangeText={setExercise} placeholder="Example: Leg press" dense />
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Sets" value={sets} onChangeText={setSets} keyboardType="numeric" placeholder="3" dense />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Reps" value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="10" dense />
          </View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Weight used (lbs)" value={weightUsed} onChangeText={setWeightUsed} keyboardType="numeric" placeholder="0" dense />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Daily steps" value={steps} onChangeText={setSteps} keyboardType="numeric" placeholder="0" dense />
          </View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Daily miles" value={miles} onChangeText={setMiles} keyboardType="numeric" placeholder="0" dense />
          </View>
          <View style={styles.fieldCell} />
        </View>
        <TextField
          label="Notes / floor work"
          value={notes}
          onChangeText={setNotes}
          placeholder="Example: glute bridges, dead bugs, side planks, bands, or circuit details"
          multiline
          numberOfLines={4}
        />

        <Button label={saving ? 'Saving…' : 'Save Workout Row'} onPress={() => { void handleSave(); }} disabled={saving} />
      </Card>

      <Card>
        <SectionHeader title="Saved workout rows for this date" subtitle="Each row stores workout type, exercise, sets, reps, and weight used." />
        {entries.length ? (
          <View style={styles.entryList}>
            {entries.map((entry) => (
              <View key={entry.workoutEntryId} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderText}>
                    <Text style={styles.entryTitle}>{entry.exercise}</Text>
                    <Text style={styles.entrySubtitle}>{entry.workoutType}</Text>
                  </View>
                  <Text style={styles.entryWeight}>{formatNumber(entry.weightUsed)} lbs</Text>
                </View>
                <Text style={styles.entryMeta}>Sets {formatNumber(entry.sets, 0)} • Reps {formatNumber(entry.reps, 0)} • Weight used {formatNumber(entry.weightUsed)} lbs</Text>
                {entry.notes ? <Text style={styles.entryNote}>{entry.notes}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No workout rows saved for this date yet.</Text>
        )}
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
    fontWeight: '800',
  },
  summaryLabel: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryNote: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  fieldCell: {
    flex: 1,
  },
  entryList: {
    gap: theme.spacing.sm,
  },
  entryCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.softSurface,
    gap: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  entryHeaderText: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  entrySubtitle: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  entryWeight: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  entryMeta: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  entryNote: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
});
