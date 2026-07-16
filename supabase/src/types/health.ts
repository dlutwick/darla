export type ISODate = string;
export type ISODateTime = string;

export type MealGroup = 'breakfast' | 'lunch' | 'supper' | 'snack' | 'any';
export type FoodCategory = 'protein' | 'carb' | 'fat' | 'veggie' | 'fruit' | 'condiment' | 'snack';
export type FoodSourceType = 'andrew_plan' | 'finch_estimate' | 'brand_label' | 'custom_user';
export type MealSlotKey = 'breakfast' | 'lunch' | 'supper' | 'snack';
export type Weekday =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface UserProfile {
  userId: string;
  displayName: string;
  timezone: string;
  targetMacroProteinPct: number;
  targetMacroFatPct: number;
  targetMacroCarbPct: number;
  dailyCalorieTarget: number | null;
  proteinTargetG: number | null;
  carbTargetG: number | null;
  fatTargetG: number | null;
  stepGoal: number | null;
  mileGoal: number | null;
  goalWeightLb: number | null;
  preferredWeighInDay: Weekday;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface FoodItem {
  foodId: string;
  mealGroup: MealGroup;
  mealGroups?: MealGroup[];
  foodCategory: FoodCategory;
  foodName: string;
  servingSize: number;
  servingUnit: string;
  servingWeightG: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number | null;
  easyDefault: boolean;
  sourceType: FoodSourceType;
  notes: string | null;
  isActive: boolean;
}

export interface MealSlotTemplate {
  slotId: MealSlotKey;
  slotName: string;
  displayOrder: number;
  requiredCategories: FoodCategory[];
  optionalCategories: FoodCategory[];
  notes: string | null;
}

export interface DailyLog {
  logId: string;
  userId: string;
  logDate: ISODate;
  weightLb: number | null;
  waterL: number | null;
  walkMiles: number | null;
  exerciseMinutes: number | null;
  steps: number | null;
  sleepHours: number | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface MealEntry {
  mealEntryId: string;
  logId: string;
  slotId: MealSlotKey;
  completed: boolean;
  entryNotes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface MealEntryItem {
  mealEntryItemId: string;
  mealEntryId: string;
  foodId: string;
  quantityMultiplier: number;
  overrideServingNote: string | null;
  createdAt: ISODateTime;
}

export interface WeightEntry {
  weightEntryId: string;
  userId: string;
  logDate: ISODate;
  weightLb: number;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
