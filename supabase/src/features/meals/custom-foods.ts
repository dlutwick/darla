import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import type { FoodCategory, FoodItem, MealSlotKey } from '../../types/health';

export interface CreateCustomFoodInput {
  name: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealSlots?: MealSlotKey[];
  servingWeightG?: number | null;
  fibreG?: number | null;
  notes?: string | null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function ensurePositiveNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0.`);
  }
}

function ensureNonNegativeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be 0 or more.`);
  }
}

function resolveMealGroup(mealSlots: MealSlotKey[] | undefined): Pick<FoodItem, 'mealGroup' | 'mealGroups'> {
  const uniqueSlots = Array.from(new Set(mealSlots ?? []));
  if (!uniqueSlots.length || uniqueSlots.length === 4) {
    return {
      mealGroup: 'any',
      mealGroups: ['breakfast', 'lunch', 'supper', 'snack'],
    };
  }

  const [firstSlot] = uniqueSlots;
  return {
    mealGroup: firstSlot,
    mealGroups: uniqueSlots,
  };
}

export async function createCustomFood(input: CreateCustomFoodInput): Promise<FoodItem> {
  const trimmedName = input.name.trim();
  const trimmedUnit = input.servingUnit.trim();

  if (!trimmedName) {
    throw new Error('Food name is required.');
  }

  if (!trimmedUnit) {
    throw new Error('Serving unit is required.');
  }

  ensurePositiveNumber(input.servingSize, 'Serving size');
  ensureNonNegativeNumber(input.calories, 'Calories');
  ensureNonNegativeNumber(input.proteinG, 'Protein');
  ensureNonNegativeNumber(input.carbsG, 'Carbs');
  ensureNonNegativeNumber(input.fatG, 'Fat');

  if (input.servingWeightG != null) {
    ensurePositiveNumber(input.servingWeightG, 'Serving weight (g)');
  }

  if (input.fibreG != null) {
    ensureNonNegativeNumber(input.fibreG, 'Fibre');
  }

  const repository = await getAppHealthRepository();
  const idBase = slugify(trimmedName) || 'food';
  const foodId = `custom-${Date.now()}-${idBase}`;
  const mealGroup = resolveMealGroup(input.mealSlots);

  const food: FoodItem = {
    foodId,
    ...mealGroup,
    foodCategory: input.category,
    foodName: trimmedName,
    servingSize: Number(input.servingSize.toFixed(2)),
    servingUnit: trimmedUnit,
    servingWeightG: input.servingWeightG ?? null,
    calories: Number(input.calories.toFixed(1)),
    proteinG: Number(input.proteinG.toFixed(1)),
    carbsG: Number(input.carbsG.toFixed(1)),
    fatG: Number(input.fatG.toFixed(1)),
    fibreG: input.fibreG != null ? Number(input.fibreG.toFixed(1)) : null,
    easyDefault: false,
    sourceType: 'custom_user',
    notes: input.notes?.trim() || 'Custom food added by user.',
    isActive: true,
  };

  await repository.saveFoodItem(food);
  return food;
}
