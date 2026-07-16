import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { TextField } from '../supabase/src/components/ui/TextField';
import { loadWeightSnapshot, saveWeight } from '../supabase/src/features/weight/weight-log';

export default function WeightScreen() {
  const [currentWeight, setCurrentWeight] = useState('');
  const [statusMessage, setStatusMessage] = useState('Loading weight...');
  const [logDate, setLogDate] = useState('');
  const [latestWeight, setLatestWeight] = useState<string>('Not logged yet');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      const snapshot = await loadWeightSnapshot();
      setLogDate(snapshot.logDate);
      setCurrentWeight(snapshot.weightEntry ? String(snapshot.weightEntry.weightLb) : '');
      setLatestWeight(snapshot.latestWeight ? `${snapshot.latestWeight.weightLb} lbs` : 'Not logged yet');
      setStatusMessage('Your daily weight log is ready.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load weight log.');
    }
  }

  async function handleSave() {
    const parsed = Number(currentWeight);
    if (!parsed || parsed <= 0) {
      Alert.alert('Enter a valid weight', 'Please enter a positive weight in pounds.');
      return;
    }

    setSaving(true);
    try {
      const snapshot = await saveWeight({ weightLb: parsed });
      setLogDate(snapshot.logDate);
      setCurrentWeight(snapshot.weightEntry ? String(snapshot.weightEntry.weightLb) : '');
      setLatestWeight(snapshot.latestWeight ? `${snapshot.latestWeight.weightLb} lbs` : 'Not logged yet');
      setStatusMessage('Today\'s weight was saved.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save weight.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Weight"
        title="Daily check-in"
        subtitle="Save one weight entry for today and keep your trend up to date."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Latest entry" subtitle="One saved weight per day." />
        <StatRow label="Log date" value={logDate || 'Loading'} />
        <StatRow label="Latest saved" value={latestWeight} />
      </Card>

      <Card>
        <SectionHeader title="Today's weight" subtitle="Enter your weight in pounds." />
        <TextField
          label="Weight (lbs)"
          value={currentWeight}
          onChangeText={setCurrentWeight}
          keyboardType="numeric"
          placeholder="Enter weight in lbs"
        />
        <Button label={saving ? 'Saving...' : 'Save weight'} onPress={() => { void handleSave(); }} disabled={saving} />
      </Card>
    </AppScreen>
  );
}
