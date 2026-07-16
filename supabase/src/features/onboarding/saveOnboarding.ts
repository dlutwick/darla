import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import { getLocalDay } from '../../lib/date';
import type { UserProfile } from '../../types/health';
import { OnboardingValues } from './schema';

export const ONBOARDING_STARTER_DEFAULTS: OnboardingValues = {
  currentWeightKg: 84.7,
  goalWeightKg: 68,
  calorieTarget: 1200,
  proteinTarget: 110,
  carbsTarget: 80,
  fatTarget: 67,
};

function toLb(kg: number) {
  return Number((kg * 2.20462).toFixed(1));
}

function todayDate() {
  return getLocalDay();
}

export async function saveOnboarding(values: OnboardingValues) {
  const repository = await getAppHealthRepository();
  const existing = await repository.getUserProfile();
  const timestamp = new Date().toISOString();

  const profile: UserProfile = {
    userId: existing?.userId ?? 'darla',
    displayName: existing?.displayName ?? 'Darla',
    timezone: existing?.timezone ?? 'America/Moncton',
    targetMacroProteinPct: existing?.targetMacroProteinPct ?? 35,
    targetMacroFatPct: existing?.targetMacroFatPct ?? 50,
    targetMacroCarbPct: existing?.targetMacroCarbPct ?? 15,
    dailyCalorieTarget: values.calorieTarget,
    proteinTargetG: values.proteinTarget,
    carbTargetG: values.carbsTarget,
    fatTargetG: values.fatTarget,
    stepGoal: existing?.stepGoal ?? 8000,
    mileGoal: existing?.mileGoal ?? 3,
    goalWeightLb: toLb(values.goalWeightKg),
    preferredWeighInDay: existing?.preferredWeighInDay ?? 'Sunday',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await repository.saveUserProfile(profile);
  await repository.upsertWeightEntry({
    weightEntryId: `weight-${todayDate()}`,
    userId: profile.userId,
    logDate: todayDate(),
    weightLb: toLb(values.currentWeightKg),
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function parseLegacyGoalWeightKg(notes: string | null | undefined) {
  const match = notes?.match(/Goal weight: ([\d.]+) kg/);
  return match ? Number(match[1]) : null;
}

export async function loadOnboardingSnapshot() {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const weightEntries = await repository.listWeightEntries();
  const latestWeight = weightEntries[weightEntries.length - 1] ?? null;
  const goalWeightKg = profile?.goalWeightLb != null
    ? Number((profile.goalWeightLb / 2.20462).toFixed(1))
    : parseLegacyGoalWeightKg(latestWeight?.notes);

  if (!profile && !latestWeight) {
    return null;
  }

  return {
    currentWeightKg: latestWeight ? Number((latestWeight.weightLb / 2.20462).toFixed(1)) : ONBOARDING_STARTER_DEFAULTS.currentWeightKg,
    goalWeightKg: goalWeightKg ?? ONBOARDING_STARTER_DEFAULTS.goalWeightKg,
    calorieTarget: profile?.dailyCalorieTarget ?? ONBOARDING_STARTER_DEFAULTS.calorieTarget,
    proteinTarget: profile?.proteinTargetG ?? ONBOARDING_STARTER_DEFAULTS.proteinTarget,
    carbsTarget: profile?.carbTargetG ?? ONBOARDING_STARTER_DEFAULTS.carbsTarget,
    fatTarget: profile?.fatTargetG ?? ONBOARDING_STARTER_DEFAULTS.fatTarget,
  } satisfies OnboardingValues;
}

export async function loadActiveTargets() {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const weightEntries = await repository.listWeightEntries();
  const latestWeight = weightEntries[weightEntries.length - 1] ?? null;
  const goalWeightKg = profile?.goalWeightLb != null
    ? Number((profile.goalWeightLb / 2.20462).toFixed(1))
    : parseLegacyGoalWeightKg(latestWeight?.notes);

  const calories = profile?.dailyCalorieTarget ?? ONBOARDING_STARTER_DEFAULTS.calorieTarget;
  const protein_g = profile?.proteinTargetG ?? ONBOARDING_STARTER_DEFAULTS.proteinTarget;
  const carbs_g = profile?.carbTargetG ?? ONBOARDING_STARTER_DEFAULTS.carbsTarget;
  const fat_g = profile?.fatTargetG ?? ONBOARDING_STARTER_DEFAULTS.fatTarget;
  const currentWeightKg = latestWeight
    ? Number((latestWeight.weightLb / 2.20462).toFixed(1))
    : ONBOARDING_STARTER_DEFAULTS.currentWeightKg;

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    currentWeightKg,
    goalWeightKg: goalWeightKg ?? ONBOARDING_STARTER_DEFAULTS.goalWeightKg,
    savedLocally: Boolean(profile || latestWeight),
  };
}
