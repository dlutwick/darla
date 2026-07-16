import { DailyLogState, DailySummary, MealItem } from './types';
import { getFoodById } from './foods';
import { mealSlots } from '../../constants/meal-slots';
import { getLocalDay } from '../../lib/date';

export function createTodayLog(): DailyLogState {
  const loggedOn = getLocalDay();

  return {
    loggedOn,
    meals: Object.fromEntries(mealSlots.map((slot) => [slot.slotId, []])) as Record<string, MealItem[]>,
  };
}

export function addFoodToMeal(log: DailyLogState, mealSlot: string, foodId: string, quantityMultiplier = 1): DailyLogState {
  const food = getFoodById(foodId);

  if (!food) {
    return log;
  }

  const item: MealItem = {
    foodId: food.id,
    name: food.name,
    quantityMultiplier,
    calories: round(food.calories * quantityMultiplier),
    protein_g: round(food.protein_g * quantityMultiplier),
    carbs_g: round(food.carbs_g * quantityMultiplier),
    fat_g: round(food.fat_g * quantityMultiplier),
  };

  return {
    ...log,
    meals: {
      ...log.meals,
      [mealSlot]: [...(log.meals[mealSlot] ?? []), item],
    },
  };
}

export function computeDailySummary(log: DailyLogState): DailySummary {
  const allItems = Object.values(log.meals).flat();

  return allItems.reduce(
    (summary, item) => ({
      calories: round(summary.calories + item.calories),
      protein_g: round(summary.protein_g + item.protein_g),
      carbs_g: round(summary.carbs_g + item.carbs_g),
      fat_g: round(summary.fat_g + item.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
