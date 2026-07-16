import type { FoodItem } from '../../types/health';

const foodAliases: Record<string, string[]> = {
  tuna: ['tuna', 'canned tuna', 'tuna fish'],
  'common-protein-tuna-can-water': ['tuna', 'canned tuna', 'tuna fish'],
  'andrew-lunch-protein-canned-tuna-1-can': ['tuna', 'canned tuna', 'tuna fish'],
  'andrew-snack-protein-canned-tuna-1-can': ['tuna', 'canned tuna', 'tuna fish'],
  steak: ['steak', 'beef steak'],
  'common-protein-steak-4-oz': ['steak', 'beef steak'],
  yogurt: ['yogurt', 'yoghurt', 'greek yogurt', 'greek yoghurt', 'skyr'],
  greek_yogurt: ['yogurt', 'yoghurt', 'greek yogurt', 'greek yoghurt', 'skyr'],
  'common-protein-yogurt-three-quarter-cup': ['yogurt', 'yoghurt', 'greek yogurt', 'greek yoghurt', 'skyr'],
  egg: ['egg', 'eggs', 'whole egg', 'whole eggs'],
  egg_whites: ['egg white', 'egg whites', 'liquid egg whites'],
  butter: ['butter', 'salted butter', 'unsalted butter'],
  peanut_butter: ['peanut butter', 'pb'],
  'common-fat-butter-1-tbsp': ['butter', 'salted butter', 'unsalted butter'],
  coffee: ['coffee', 'black coffee', 'iced coffee'],
  stevia: ['stevia', 'sweetener'],
  cereal: ['cereal', 'vector', 'maple crunch', 'apple cinnamon crunch'],
  cream: ['cream', 'cereal cream', 'coffee cream', 'creamer'],
  sourdough: ['sourdough', 'sourdough bread', 'bread'],
};

export function normalizeFoodSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getAliasText(food: FoodItem) {
  return foodAliases[food.foodId]?.join(' ') ?? '';
}

export function buildFoodSearchText(food: FoodItem) {
  return normalizeFoodSearchText([food.foodName, getAliasText(food), food.notes ?? ''].filter(Boolean).join(' '));
}

function getFoodSearchScore(food: FoodItem, query: string) {
  const normalizedQuery = normalizeFoodSearchText(query);
  if (!normalizedQuery) return 0;

  const normalizedName = normalizeFoodSearchText(food.foodName);
  const aliasText = normalizeFoodSearchText(getAliasText(food));
  const searchableText = buildFoodSearchText(food);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const nameTokens = normalizedName.split(' ').filter(Boolean);

  if (normalizedName === normalizedQuery) return 120;
  if (queryTokens.length === 1 && nameTokens.includes(normalizedQuery)) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 90;
  if (queryTokens.length && queryTokens.every((token) => nameTokens.includes(token))) return 80;
  if (aliasText.includes(normalizedQuery)) return 65;
  if (queryTokens.length && queryTokens.every((token) => aliasText.includes(token))) return 55;
  if (searchableText.includes(normalizedQuery)) return 45;
  if (queryTokens.length && queryTokens.every((token) => searchableText.includes(token))) {
    return 35;
  }

  return -1;
}

export function searchFoods(foods: FoodItem[], query: string, limit?: number) {
  const normalizedQuery = normalizeFoodSearchText(query);
  const uniqueFoods = Array.from(new Map(foods.map((food) => [food.foodId, food])).values());

  if (!normalizedQuery) {
    return typeof limit === 'number' ? uniqueFoods.slice(0, limit) : uniqueFoods;
  }

  const matches = uniqueFoods
    .map((food) => ({ food, score: getFoodSearchScore(food, normalizedQuery) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.food.foodName.localeCompare(b.food.foodName);
    })
    .map((entry) => entry.food);

  return typeof limit === 'number' ? matches.slice(0, limit) : matches;
}
