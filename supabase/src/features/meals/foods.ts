import foodsSeed from '../../../seed/foods.seed.json';
import { searchFoods } from './search';
import { FoodSeed } from './types';
import type { FoodItem } from '../../types/health';

const activeFoods = (foodsSeed.foods as FoodSeed[]).filter((food) => food.status === 'active');

export const foods = Array.from(new Map(activeFoods.map((food) => [food.id, food])).values()).sort(
  (a, b) => a.quick_add_priority - b.quick_add_priority
);

function mapFoodCategory(foodType: string): FoodItem['foodCategory'] {
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

function asSearchFoodItems(): FoodItem[] {
  return foods.map((food) => ({
    foodId: food.id,
    mealGroup: 'any',
    mealGroups: ['breakfast', 'lunch', 'supper', 'snack'],
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
    notes: null,
    isActive: true,
  }));
}

export function getQuickAddFoodsForMeal(_mealSlot: string) {
  return foods.filter((food) => food.quick_add);
}

export function searchFoodCatalog(query: string, limit?: number) {
  return searchFoods(asSearchFoodItems(), query, limit);
}

export function getFoodById(foodId: string) {
  return foods.find((food) => food.id === foodId);
}
