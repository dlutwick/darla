import type {
  DailyLog,
  FoodItem,
  MealEntry,
  MealEntryItem,
  MealSlotTemplate,
  UserProfile,
  WeightEntry,
  ISODate,
} from '../../types/health';

export interface HealthSeedBundle {
  userProfile: UserProfile;
  mealSlotTemplates: MealSlotTemplate[];
  foodItems: FoodItem[];
}

export interface HealthRepository {
  getUserProfile(): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;

  listFoodItems(): Promise<FoodItem[]>;
  listActiveFoodItems(): Promise<FoodItem[]>;
  getFoodItem(foodId: string): Promise<FoodItem | null>;
  saveFoodItem(food: FoodItem): Promise<void>;

  listMealSlotTemplates(): Promise<MealSlotTemplate[]>;

  getDailyLog(logDate: ISODate): Promise<DailyLog | null>;
  listDailyLogs(): Promise<DailyLog[]>;
  upsertDailyLog(log: DailyLog): Promise<void>;

  listMealEntries(logId: string): Promise<MealEntry[]>;
  upsertMealEntry(entry: MealEntry): Promise<void>;

  listMealEntryItems(mealEntryId: string): Promise<MealEntryItem[]>;
  replaceMealEntryItems(mealEntryId: string, items: MealEntryItem[]): Promise<void>;

  listWeightEntries(): Promise<WeightEntry[]>;
  getWeightEntryByDate(logDate: ISODate): Promise<WeightEntry | null>;
  upsertWeightEntry(entry: WeightEntry): Promise<void>;
  saveWeightEntry(entry: WeightEntry): Promise<void>;

  seedDevelopmentData(input: HealthSeedBundle): Promise<void>;
}
