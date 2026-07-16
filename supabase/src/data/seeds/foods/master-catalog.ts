import foodsSeed from '../../../../seed/foods.seed.json';
import type { FoodCategory, FoodItem, MealGroup } from '../../../types/health';
import type { FoodSeed } from '../../../features/meals/types';

function mapFoodCategory(foodType: string): FoodCategory {
  switch (foodType) {
    case 'protein':
    case 'carb':
    case 'fat':
    case 'fruit':
    case 'condiment':
    case 'snack':
      return foodType;
    case 'veg':
      return 'veggie';
    default:
      return 'condiment';
  }
}

function mapMealGroup(mealSlots: string[]): MealGroup {
  if (mealSlots.length === 4) {
    return 'any';
  }

  const firstSlot = mealSlots[0];
  if (firstSlot === 'breakfast' || firstSlot === 'lunch' || firstSlot === 'supper' || firstSlot === 'snack') {
    return firstSlot;
  }

  return 'any';
}

function buildNotes(food: FoodSeed) {
  const notes = [] as string[];

  if (food.brand) {
    notes.push(`Brand: ${food.brand}`);
  }

  if (food.name.toLowerCase() === 'yogurt') {
    notes.push('Alias: yoghurt.');
  }

  if (food.is_verified) {
    notes.push('Verified seed item.');
  }

  return notes.join(' ') || null;
}

export const masterCatalogFoodItems: FoodItem[] = (foodsSeed.foods as FoodSeed[])
  .filter((food) => food.status === 'active')
  .map((food) => ({
    foodId: food.id,
    mealGroup: mapMealGroup(food.meal_slots),
    mealGroups: food.meal_slots.filter(
      (slot): slot is Exclude<MealGroup, 'any'> =>
        slot === 'breakfast' || slot === 'lunch' || slot === 'supper' || slot === 'snack'
    ),
    foodCategory: mapFoodCategory(food.food_type),
    foodName: food.name,
    servingSize: food.default_amount,
    servingUnit: food.default_unit,
    servingWeightG: food.serving_size_g,
    calories: food.calories,
    proteinG: food.protein_g,
    carbsG: food.carbs_g,
    fatG: food.fat_g,
    fibreG: food.fiber_g,
    easyDefault: food.quick_add,
    sourceType: food.is_verified ? 'andrew_plan' : 'finch_estimate',
    notes: buildNotes(food),
    isActive: true,
  }));
