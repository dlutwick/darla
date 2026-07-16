import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { loadActiveTargets } from '../supabase/src/features/onboarding/saveOnboarding';
import { formatLbFromKg } from '../supabase/src/lib/weight';

export default function SettingsScreen() {
  const [targets, setTargets] = useState<null | {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    currentWeightKg: number | null;
    goalWeightKg: number | null;
    savedLocally: boolean;
  }>(null);
  const [statusMessage, setStatusMessage] = useState('Loading your saved setup…');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const next = await loadActiveTargets();
          if (!active) return;
          setTargets(next);
          setStatusMessage(next
            ? next.savedLocally
              ? 'Saved values are loaded from this device.'
              : 'Starter values are showing until you save your own setup on this device.'
            : 'No targets available yet.');
        } catch (error) {
          if (!active) return;
          setStatusMessage(error instanceof Error ? error.message : 'Could not load saved setup.');
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Settings"
        title="Setup and preferences"
        subtitle="Update your targets and review the personal values driving the app."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader
          title="Target setup"
          subtitle="Open your local MVP setup to review or update calories, macros, and weights."
        />
        <StatRow label="Calories" value={targets ? `${targets.calories}` : 'Not saved yet'} />
        <StatRow label="Protein" value={targets ? `${targets.protein_g} g` : 'Not saved yet'} />
        <StatRow label="Carbs" value={targets ? `${targets.carbs_g} g` : 'Not saved yet'} />
        <StatRow label="Fat" value={targets ? `${targets.fat_g} g` : 'Not saved yet'} />
        <Button label="Edit targets" onPress={() => router.push('/onboarding')} />
      </Card>

      <Card>
        <SectionHeader
          title="Profile"
          subtitle="Saved weights are shown from this device."
        />
        <StatRow label="Current weight" value={formatLbFromKg(targets?.currentWeightKg)} />
        <StatRow label="Goal weight" value={formatLbFromKg(targets?.goalWeightKg)} />
        <StatRow label="Storage" value={targets?.savedLocally ? 'Saved locally' : 'Starter defaults showing'} />
      </Card>
    </AppScreen>
  );
}
