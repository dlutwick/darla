import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import { defaultUserProfile } from '../../data/seeds/default-user-profile';
import { searchFoods } from '../meals/search';
import { getLocalDay } from '../../lib/date';
import type {
  DailyLog,
  FoodCategory,
  FoodItem,
  ISODate,
  MealEntry,
  MealEntryItem,
  MealSlotKey,
  MealSlotTemplate,
  UserProfile,
} from '../../types/health';

export interface SelectedMealItem {
  foodId: string;
  quantityMultiplier: number;
  overrideServingNote?: string | null;
}

export interface TodayMealSnapshot {
  slotId: MealSlotKey;
  slotName: string;
  entry: MealEntry | null;
  items: Array<{
    food: FoodItem;
    quantityMultiplier: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fibreG: number;
    notes: string | null;
  }>;
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fibreG: number;
  };
  completed: boolean;
}

export interface TodaySnapshot {
  profile: UserProfile | null;
  log: DailyLog;
  meals: TodayMealSnapshot[];
  activeFoods: FoodItem[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fibreG: number;
  };
  burn: {
    walkMiles: number;
    walkCalories: number;
    netCalories: number;
  };
  remaining: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
}

export interface DailyHistorySummary {
  logDate: ISODate;
  mealsLogged: number;
  mealsCompleted: number;
  totalFoods: number;
  calories: number;
  walkCalories: number;
}

export interface FoodLogRow {
  logDate: ISODate;
  mealType: MealSlotKey;
  foodName: string;
  servingSize: number;
  servingUnit: string;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  notes: string | null;
}

export interface DailySummaryRow {
  logDate: ISODate;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFibreG: number;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  carbTargetG: number | null;
  fatTargetG: number | null;
  remainingCalories: number | null;
  remainingProteinG: number | null;
  remainingCarbsG: number | null;
  remainingFatG: number | null;
}

function todayDate(): ISODate {
  return getLocalDay();
}

function nowIso() {
  return new Date().toISOString();
}

function makeDailyLog(userId: string, logDate: ISODate): DailyLog {
  const timestamp = nowIso();
  return {
    logId: `daily-${logDate}`,
    userId,
    logDate,
    weightLb: null,
    waterL: null,
    walkMiles: null,
    exerciseMinutes: null,
    steps: null,
    sleepHours: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function scaleValue(value: number, quantityMultiplier: number) {
  return Number((value * quantityMultiplier).toFixed(1));
}

function computeMealCompletion(slotTemplate: MealSlotTemplate, foods: FoodItem[]) {
  const categories = new Set(foods.map((food) => food.foodCategory));
  const requiredCategories = slotTemplate.requiredCategories.filter((category) => {
    if (category !== 'veggie') return true;
    return foods.some((food) => food.foodCategory === 'veggie');
  });

  return requiredCategories.every((category: FoodCategory) => categories.has(category));
}

function calculateTotals(items: Array<{ food: FoodItem; quantityMultiplier: number }>) {
  return items.reduce(
    (totals, item) => ({
      calories: totals.calories + scaleValue(item.food.calories, item.quantityMultiplier),
      proteinG: totals.proteinG + scaleValue(item.food.proteinG, item.quantityMultiplier),
      carbsG: totals.carbsG + scaleValue(item.food.carbsG, item.quantityMultiplier),
      fatG: totals.fatG + scaleValue(item.food.fatG, item.quantityMultiplier),
      fibreG: totals.fibreG + scaleValue(item.food.fibreG ?? 0, item.quantityMultiplier),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }
  );
}

function calculateWalkBurn(walkMiles: number | null | undefined) {
  const miles = walkMiles ?? 0;
  return {
    walkMiles: miles,
    walkCalories: Math.round(miles * 100),
  };
}

async function ensureDailyLog(logDate: ISODate, userId: string) {
  const repository = await getAppHealthRepository();
  const existing = await repository.getDailyLog(logDate);
  if (existing) return existing;

  const created = makeDailyLog(userId, logDate);
  await repository.upsertDailyLog(created);
  return created;
}

export async function loadTodaySnapshot(logDate: ISODate = todayDate()): Promise<TodaySnapshot> {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const effectiveProfile = profile
    ? {
        ...profile,
      dailyCalorieTarget: profile.dailyCalorieTarget ?? defaultUserProfile.dailyCalorieTarget,
      proteinTargetG: profile.proteinTargetG ?? defaultUserProfile.proteinTargetG,
      carbTargetG: profile.carbTargetG ?? defaultUserProfile.carbTargetG,
      fatTargetG: profile.fatTargetG ?? defaultUserProfile.fatTargetG,
      stepGoal: profile.stepGoal ?? defaultUserProfile.stepGoal,
      mileGoal: profile.mileGoal ?? defaultUserProfile.mileGoal,
    }
  : defaultUserProfile;
  const userId = effectiveProfile.userId ?? 'darla';
  const log = await ensureDailyLog(logDate, userId);
  const slotTemplates = await repository.listMealSlotTemplates();
  const mealEntries = await repository.listMealEntries(log.logId);
  const activeFoods = await repository.listActiveFoodItems();
  const foodIndex = new Map(activeFoods.map((food) => [food.foodId, food]));

  const meals: TodayMealSnapshot[] = [];

  for (const slotTemplate of slotTemplates) {
    const entry = mealEntries.find((mealEntry) => mealEntry.slotId === slotTemplate.slotId) ?? null;
    const rawItems = entry ? await repository.listMealEntryItems(entry.mealEntryId) : [];
    const joinedItems = rawItems
      .map((item) => {
        const food = foodIndex.get(item.foodId);
        if (!food) return null;

        return {
          food,
          quantityMultiplier: item.quantityMultiplier,
          calories: scaleValue(food.calories, item.quantityMultiplier),
          proteinG: scaleValue(food.proteinG, item.quantityMultiplier),
          carbsG: scaleValue(food.carbsG, item.quantityMultiplier),
          fatG: scaleValue(food.fatG, item.quantityMultiplier),
          fibreG: scaleValue(food.fibreG ?? 0, item.quantityMultiplier),
          notes: item.overrideServingNote ?? null,
        };
      })
      .filter(Boolean) as TodayMealSnapshot['items'];

    const completionFoods = joinedItems.map((item) => item.food);
    const totals = joinedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        proteinG: acc.proteinG + item.proteinG,
        carbsG: acc.carbsG + item.carbsG,
        fatG: acc.fatG + item.fatG,
        fibreG: acc.fibreG + item.fibreG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }
    );

    meals.push({
      slotId: slotTemplate.slotId,
      slotName: slotTemplate.slotName,
      entry,
      items: joinedItems,
      totals,
      completed: computeMealCompletion(slotTemplate, completionFoods),
    });
  }

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totals.calories,
      proteinG: acc.proteinG + meal.totals.proteinG,
      carbsG: acc.carbsG + meal.totals.carbsG,
      fatG: acc.fatG + meal.totals.fatG,
      fibreG: acc.fibreG + meal.totals.fibreG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }
  );

  const burn = calculateWalkBurn(log.walkMiles);
  const netCalories = totals.calories - burn.walkCalories;

  return {
    profile: effectiveProfile,
    log,
    meals,
    activeFoods,
    totals,
    burn: {
      ...burn,
      netCalories,
    },
    remaining: {
      calories: effectiveProfile.dailyCalorieTarget != null ? effectiveProfile.dailyCalorieTarget - totals.calories : null,
      proteinG: effectiveProfile.proteinTargetG != null ? Number((effectiveProfile.proteinTargetG - totals.proteinG).toFixed(1)) : null,
      carbsG: effectiveProfile.carbTargetG != null ? Number((effectiveProfile.carbTargetG - totals.carbsG).toFixed(1)) : null,
      fatG: effectiveProfile.fatTargetG != null ? Number((effectiveProfile.fatTargetG - totals.fatG).toFixed(1)) : null,
    },
  };
}

export async function listDailyHistory(limit = 14): Promise<DailyHistorySummary[]> {
  const repository = await getAppHealthRepository();
  const logs = await repository.listDailyLogs();
  const sortedLogs = [...logs].sort((a, b) => b.logDate.localeCompare(a.logDate));
  const history: DailyHistorySummary[] = [];

  for (const log of sortedLogs) {
    const snapshot = await loadTodaySnapshot(log.logDate);
    const mealsLogged = snapshot.meals.filter((meal) => meal.items.length > 0).length;
    const totalFoods = snapshot.meals.reduce((count, meal) => count + meal.items.length, 0);
    const hasMeaningfulData = mealsLogged > 0 || totalFoods > 0 || (snapshot.log.walkMiles ?? 0) > 0;

    if (!hasMeaningfulData) {
      continue;
    }

    history.push({
      logDate: log.logDate,
      mealsLogged,
      mealsCompleted: snapshot.meals.filter((meal) => meal.completed).length,
      totalFoods,
      calories: snapshot.totals.calories,
      walkCalories: snapshot.burn.walkCalories,
    });

    if (history.length >= limit) {
      break;
    }
  }

  return history;
}

export async function listFoodLogRows(logDate?: ISODate): Promise<FoodLogRow[]> {
  const dates = logDate ? [logDate] : (await listDailyHistory(365)).map((entry) => entry.logDate);
  const rows: FoodLogRow[] = [];

  for (const date of dates) {
    const snapshot = await loadTodaySnapshot(date);
    for (const meal of snapshot.meals) {
      for (const item of meal.items) {
        rows.push({
          logDate: date,
          mealType: meal.slotId,
          foodName: item.food.foodName,
          servingSize: item.food.servingSize,
          servingUnit: item.food.servingUnit,
          servings: item.quantityMultiplier,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          fibreG: item.fibreG,
          notes: item.notes,
        });
      }
    }
  }

  return rows.sort((a, b) => `${b.logDate}-${b.mealType}`.localeCompare(`${a.logDate}-${a.mealType}`));
}

export async function listDailySummaryRows(limit = 30): Promise<DailySummaryRow[]> {
  const history = await listDailyHistory(limit);
  const rows: DailySummaryRow[] = [];

  for (const entry of history) {
    const snapshot = await loadTodaySnapshot(entry.logDate);
    rows.push({
      logDate: entry.logDate,
      totalCalories: snapshot.totals.calories,
      totalProteinG: snapshot.totals.proteinG,
      totalCarbsG: snapshot.totals.carbsG,
      totalFatG: snapshot.totals.fatG,
      totalFibreG: snapshot.totals.fibreG,
      calorieTarget: snapshot.profile?.dailyCalorieTarget ?? null,
      proteinTargetG: snapshot.profile?.proteinTargetG ?? null,
      carbTargetG: snapshot.profile?.carbTargetG ?? null,
      fatTargetG: snapshot.profile?.fatTargetG ?? null,
      remainingCalories: snapshot.remaining.calories,
      remainingProteinG: snapshot.remaining.proteinG,
      remainingCarbsG: snapshot.remaining.carbsG,
      remainingFatG: snapshot.remaining.fatG,
    });
  }

  return rows;
}

export async function findFoodSuggestions(query: string, limit = 12): Promise<FoodItem[]> {
  const repository = await getAppHealthRepository();
  const foods = await repository.listActiveFoodItems();
  return searchFoods(foods, query, limit);
}

export async function getFoodCatalog(): Promise<FoodItem[]> {
  const repository = await getAppHealthRepository();
  return repository.listActiveFoodItems();
}

export async function saveDailyActivity(params: {
  logDate?: ISODate;
  steps?: number | null;
  walkMiles?: number | null;
}) {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const userId = profile?.userId ?? 'darla';
  const logDate = params.logDate ?? todayDate();
  const existing = await ensureDailyLog(logDate, userId);

  await repository.upsertDailyLog({
    ...existing,
    steps: params.steps ?? existing.steps ?? null,
    walkMiles: params.walkMiles ?? existing.walkMiles ?? null,
    updatedAt: nowIso(),
  });

  return loadTodaySnapshot(logDate);
}

export async function saveMealSelection(params: {
  logDate?: ISODate;
  slotId: MealSlotKey;
  selectedItems: SelectedMealItem[];
  entryNotes?: string | null;
}) {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const userId = profile?.userId ?? 'darla';
  const logDate = params.logDate ?? todayDate();
  const log = await ensureDailyLog(logDate, userId);
  const slotTemplates = await repository.listMealSlotTemplates();
  const slotTemplate = slotTemplates.find((slot) => slot.slotId === params.slotId);
  if (!slotTemplate) {
    throw new Error(`Unknown meal slot: ${params.slotId}`);
  }

  const foods = await repository.listActiveFoodItems();
  const foodIndex = new Map(foods.map((food) => [food.foodId, food]));
  const normalizedSelectedItems = params.selectedItems.filter((item) => foodIndex.has(item.foodId));
  const selectedFoods = normalizedSelectedItems
    .map((item) => foodIndex.get(item.foodId))
    .filter(Boolean) as FoodItem[];

  const timestamp = nowIso();
  const existingEntries = await repository.listMealEntries(log.logId);
  const existingEntry = existingEntries.find((entry) => entry.slotId === params.slotId) ?? null;

  const entry: MealEntry = {
    mealEntryId: existingEntry?.mealEntryId ?? `meal-${logDate}-${params.slotId}`,
    logId: log.logId,
    slotId: params.slotId,
    completed: computeMealCompletion(slotTemplate, selectedFoods),
    entryNotes: params.entryNotes ?? null,
    createdAt: existingEntry?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const mealEntryItems: MealEntryItem[] = normalizedSelectedItems.map((item, index) => ({
    mealEntryItemId: `item-${entry.mealEntryId}-${index + 1}`,
    mealEntryId: entry.mealEntryId,
    foodId: item.foodId,
    quantityMultiplier: item.quantityMultiplier,
    overrideServingNote: item.overrideServingNote ?? null,
    createdAt: timestamp,
  }));

  await repository.upsertMealEntry(entry);
  await repository.replaceMealEntryItems(entry.mealEntryId, mealEntryItems);

  return loadTodaySnapshot(logDate);
}
