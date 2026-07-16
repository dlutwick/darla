import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { SubscreenHeader } from '../supabase/src/components/ui/SubscreenHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { kgToLb, lbToKg } from '../supabase/src/lib/weight';
import { onboardingSchema, OnboardingValues } from '../supabase/src/features/onboarding/schema';
import {
  loadOnboardingSnapshot,
  ONBOARDING_STARTER_DEFAULTS,
  saveOnboarding,
} from '../supabase/src/features/onboarding/saveOnboarding';

export default function OnboardingScreen() {
  const [statusMessage, setStatusMessage] = useState('Checking your saved setup…');
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: ONBOARDING_STARTER_DEFAULTS,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await loadOnboardingSnapshot();
        if (!active) return;

        if (snapshot) {
          reset({
            ...snapshot,
            currentWeightKg: kgToLb(snapshot.currentWeightKg),
            goalWeightKg: kgToLb(snapshot.goalWeightKg),
          });
          setStatusMessage('Loaded your saved local targets and starting weight.');
        } else {
          reset({
            ...ONBOARDING_STARTER_DEFAULTS,
            currentWeightKg: kgToLb(ONBOARDING_STARTER_DEFAULTS.currentWeightKg),
            goalWeightKg: kgToLb(ONBOARDING_STARTER_DEFAULTS.goalWeightKg),
          });
          setStatusMessage('No saved setup yet. Starter values are shown so you can test the app quickly.');
        }
      } catch (error) {
        if (!active) return;
        setStatusMessage(
          error instanceof Error ? error.message : 'Could not load saved onboarding values.'
        );
      } finally {
        if (active) setLoadingDefaults(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [reset]);

  const onSubmit = async (values: OnboardingValues) => {
    try {
      await saveOnboarding({
        ...values,
        currentWeightKg: lbToKg(values.currentWeightKg),
        goalWeightKg: lbToKg(values.goalWeightKg),
      });
      Alert.alert('Saved', 'Your targets and starting weight were saved locally for MVP testing.');
      router.replace('/today');
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save onboarding values yet.'
      );
    }
  };

  return (
    <AppScreen>
      <SubscreenHeader
        title="Set your targets"
        subtitle="Save your weight, calorie target, and macros so the rest of the app feels personal right away."
        backLabel="Settings"
      />

      <InlineStatus message={loadingDefaults ? 'Checking your saved profile…' : statusMessage} />

      <Card>
        <Controller
          control={control}
          name="currentWeightKg"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Current weight (lbs)"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.currentWeightKg?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="goalWeightKg"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Goal weight (lbs)"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.goalWeightKg?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="calorieTarget"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Daily calorie target"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.calorieTarget?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="proteinTarget"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Protein target (g)"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.proteinTarget?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="carbsTarget"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Carb target (g)"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.carbsTarget?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="fatTarget"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Fat target (g)"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="numeric"
              error={errors.fatTarget?.message}
            />
          )}
        />

        <Button
          label={isSubmitting ? 'Saving...' : 'Save targets'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
      </Card>
    </AppScreen>
  );
}
