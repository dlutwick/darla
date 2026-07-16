import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { SubscreenHeader } from '../supabase/src/components/ui/SubscreenHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { loadWeightSnapshot, saveWeight } from '../supabase/src/features/weight/weight-log';

export default function WeightLogScreen() {
  const [weightLb, setWeightLb] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading saved weight…');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await loadWeightSnapshot();
        if (!active) return;

        if (snapshot.weightEntry) {
          setWeightLb(String(snapshot.weightEntry.weightLb));
          setStatusMessage('Loaded today’s saved weight. You can update it if needed.');
          return;
        }

        if (snapshot.latestWeight) {
          setWeightLb(String(snapshot.latestWeight.weightLb));
          setStatusMessage('No weight saved for today yet. Your latest weight is loaded for convenience.');
          return;
        }

        setStatusMessage('Weight logging is ready. Enter today’s weight in pounds.');
      } catch (error) {
        if (!active) return;
        setStatusMessage(error instanceof Error ? error.message : 'Could not load saved weight.');
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const parsed = Number(weightLb);
    if (!parsed || parsed <= 0) {
      Alert.alert('Enter a valid weight', 'Please enter a positive weight in pounds.');
      return;
    }

    setSaving(true);
    try {
      await saveWeight({ weightLb: parsed });
      Alert.alert('Weight saved', 'Your weight entry was saved.');
      router.replace('/today');
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save weight yet.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <SubscreenHeader
        title="Log weight"
        subtitle="Save today’s check-in, then jump back to the dashboard."
        backLabel="Dashboard"
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <TextField
          label="Weight (lbs)"
          value={weightLb}
          onChangeText={setWeightLb}
          keyboardType="numeric"
        />
        <Button label={saving ? 'Saving…' : 'Save Weight'} onPress={() => void handleSave()} disabled={saving} />
      </Card>
    </AppScreen>
  );
}
