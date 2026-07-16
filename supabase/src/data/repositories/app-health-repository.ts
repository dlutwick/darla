import { InMemoryHealthRepository } from './in-memory-health-repository';
import { devSeedBundle } from '../seeds/dev-seed-bundle';
import type { DailyLog, FoodItem, MealEntry, MealEntryItem, MealSlotTemplate, UserProfile, WeightEntry } from '../../types/health';

export type PersistedHealthState = {
  userProfile: UserProfile | null;
  mealSlotTemplates: MealSlotTemplate[];
  foodItems: FoodItem[];
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  mealEntryItems: MealEntryItem[];
  weightEntries: WeightEntry[];
};

const LOCAL_STORAGE_KEY = 'health-app.local-mvp.state.v1';
const repository = new InMemoryHealthRepository();
let bootstrapped = false;

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getSeedState(): PersistedHealthState {
  return {
    userProfile: devSeedBundle.userProfile,
    mealSlotTemplates: devSeedBundle.mealSlotTemplates,
    foodItems: devSeedBundle.foodItems,
    dailyLogs: [],
    mealEntries: [],
    mealEntryItems: [],
    weightEntries: [],
  };
}

function parseLegacyGoalWeightLb(weightEntries: WeightEntry[]) {
  const latestWeight = [...weightEntries].sort((a, b) => a.logDate.localeCompare(b.logDate)).at(-1) ?? null;
  const match = latestWeight?.notes?.match(/Goal weight: ([\d.]+) kg/);
  return match ? Number((Number(match[1]) * 2.20462).toFixed(1)) : null;
}

function mergeFoodItems(seedFoodItems: FoodItem[], persistedFoodItems: FoodItem[] | undefined) {
  if (!persistedFoodItems?.length) {
    return seedFoodItems;
  }

  const merged = new Map(seedFoodItems.map((food) => [food.foodId, food]));

  for (const food of persistedFoodItems) {
    if (!merged.has(food.foodId)) {
      merged.set(food.foodId, food);
    }
  }

  return Array.from(merged.values());
}

// Identity rule: persisted and seeded foods are merged by foodId only.
// Do not collapse foods by display name here; custom foods must survive reloads even when names are similar.

function dedupeMealEntries(mealEntries: MealEntry[]) {
  const byLogAndSlot = new Map<string, MealEntry>();

  for (const entry of mealEntries) {
    byLogAndSlot.set(`${entry.logId}::${entry.slotId}`, entry);
  }

  return Array.from(byLogAndSlot.values());
}

function normalizeState(input: Partial<PersistedHealthState> | null | undefined): PersistedHealthState {
  const seed = getSeedState();
  const weightEntries = input?.weightEntries ?? [];
  const userProfile = input?.userProfile
    ? {
        ...seed.userProfile,
        ...input.userProfile,
        goalWeightLb: input.userProfile.goalWeightLb ?? parseLegacyGoalWeightLb(weightEntries),
      }
    : seed.userProfile;
  const mealEntries = dedupeMealEntries(input?.mealEntries ?? []);
  const validMealEntryIds = new Set(mealEntries.map((entry) => entry.mealEntryId));

  return {
    userProfile,
    mealSlotTemplates: input?.mealSlotTemplates?.length ? input.mealSlotTemplates : seed.mealSlotTemplates,
    foodItems: mergeFoodItems(seed.foodItems, input?.foodItems),
    dailyLogs: input?.dailyLogs ?? [],
    mealEntries,
    mealEntryItems: (input?.mealEntryItems ?? []).filter((item) => validMealEntryIds.has(item.mealEntryId)),
    weightEntries,
  };
}

function loadPersistedState(): PersistedHealthState {
  if (!canUseLocalStorage()) {
    return getSeedState();
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return getSeedState();
    }

    return normalizeState(JSON.parse(raw) as Partial<PersistedHealthState>);
  } catch {
    return getSeedState();
  }
}

function attachPersistence() {
  const persist = async () => {
    if (!canUseLocalStorage()) return;

    const snapshot = normalizeState({
      userProfile: await repository.getUserProfile(),
      mealSlotTemplates: await repository.listMealSlotTemplates(),
      foodItems: await repository.listFoodItems(),
      dailyLogs: repository.debugDump().dailyLogs,
      mealEntries: repository.debugDump().mealEntries,
      mealEntryItems: repository.debugDump().mealEntryItems,
      weightEntries: await repository.listWeightEntries(),
    });

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
  };

  repository.setPersistenceHook(persist);
}

export async function exportHealthBackupState(): Promise<PersistedHealthState> {
  const activeRepository = await getAppHealthRepository();

  return normalizeState({
    userProfile: await activeRepository.getUserProfile(),
    mealSlotTemplates: await activeRepository.listMealSlotTemplates(),
    foodItems: await activeRepository.listFoodItems(),
    dailyLogs: activeRepository.debugDump().dailyLogs,
    mealEntries: activeRepository.debugDump().mealEntries,
    mealEntryItems: activeRepository.debugDump().mealEntryItems,
    weightEntries: await activeRepository.listWeightEntries(),
  });
}

export async function getAppHealthRepository() {
  if (!bootstrapped) {
    const initialState = loadPersistedState();
    await repository.seedDevelopmentData({
      userProfile: initialState.userProfile ?? devSeedBundle.userProfile,
      mealSlotTemplates: initialState.mealSlotTemplates,
      foodItems: initialState.foodItems,
    });
    repository.hydrateRuntimeState({
      dailyLogs: initialState.dailyLogs,
      mealEntries: initialState.mealEntries,
      mealEntryItems: initialState.mealEntryItems,
      weightEntries: initialState.weightEntries,
    });
    attachPersistence();
    bootstrapped = true;
  }

  return repository;
}
