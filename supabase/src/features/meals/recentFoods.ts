import { MealItem } from './types';

export function getRecentFoods(meals: Record<string, MealItem[]>) {
  const seen = new Set<string>();
  const items = Object.values(meals)
    .flat()
    .slice()
    .reverse()
    .filter((item) => {
      if (seen.has(item.foodId)) return false;
      seen.add(item.foodId);
      return true;
    });

  return items.slice(0, 4);
}
