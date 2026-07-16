export type FoodSeed = {
  id: string;
  name: string;
  brand: string | null;
  meal_slots: string[];
  food_type: string;
  serving_label: string;
  default_amount: number;
  default_unit: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  quick_add: boolean;
  quick_add_priority: number;
  quick_add_multipliers: number[];
  is_verified: boolean;
  status: string;
};

export type MealItem = {
  foodId: string;
  name: string;
  quantityMultiplier: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type DailyLogState = {
  id?: string;
  userId?: string;
  loggedOn: string;
  meals: Record<string, MealItem[]>;
};

export type DailySummary = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
