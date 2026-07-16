import type { FoodItem } from '../../../types/health';
import { masterCatalogFoodItems } from './master-catalog';
import { andrewPlanReferenceFoods } from './andrew-plan-reference';
import { breakfastFoods } from './breakfast';
import { commonFoods } from './common';
import { lunchFoods } from './lunch';
import { snackFoods } from './snack';
import { supperFoods } from './supper';

function dedupeFoods(foods: FoodItem[]) {
  const byId = new Map<string, FoodItem>();

  for (const food of foods) {
    if (byId.has(food.foodId)) {
      continue;
    }

    byId.set(food.foodId, food);
  }

  return Array.from(byId.values());
}

export const seededFoodItems: FoodItem[] = dedupeFoods([
  ...masterCatalogFoodItems,
  ...commonFoods,
  ...breakfastFoods,
  ...lunchFoods,
  ...supperFoods,
  ...snackFoods,
  ...andrewPlanReferenceFoods,
]);
