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
import type { HealthRepository, HealthSeedBundle } from './health-repository';

interface InMemoryState {
  userProfile: UserProfile | null;
  mealSlotTemplates: MealSlotTemplate[];
  foodItems: FoodItem[];
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  mealEntryItems: MealEntryItem[];
  weightEntries: WeightEntry[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function dedupeMealEntries(mealEntries: MealEntry[]): MealEntry[] {
  const byLogAndSlot = new Map<string, MealEntry>();

  for (const entry of mealEntries) {
    byLogAndSlot.set(`${entry.logId}::${entry.slotId}`, clone(entry));
  }

  return Array.from(byLogAndSlot.values());
}

export class InMemoryHealthRepository implements HealthRepository {
  private state: InMemoryState = {
    userProfile: null,
    mealSlotTemplates: [],
    foodItems: [],
    dailyLogs: [],
    mealEntries: [],
    mealEntryItems: [],
    weightEntries: [],
  };

  private persistenceHook: null | (() => Promise<void>) = null;

  setPersistenceHook(hook: () => Promise<void>) {
    this.persistenceHook = hook;
  }

  hydrateRuntimeState(input: Pick<InMemoryState, 'dailyLogs' | 'mealEntries' | 'mealEntryItems' | 'weightEntries'>) {
    const mealEntries = dedupeMealEntries(input.mealEntries);
    const validMealEntryIds = new Set(mealEntries.map((entry) => entry.mealEntryId));

    this.state.dailyLogs = clone(input.dailyLogs);
    this.state.mealEntries = mealEntries;
    this.state.mealEntryItems = clone(input.mealEntryItems).filter((item) => validMealEntryIds.has(item.mealEntryId));
    this.state.weightEntries = clone(input.weightEntries);
  }

  debugDump(): InMemoryState {
    return clone(this.state);
  }

  private async afterWrite() {
    if (this.persistenceHook) {
      await this.persistenceHook();
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    return clone(this.state.userProfile);
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.state.userProfile = clone(profile);
    await this.afterWrite();
  }

  async listFoodItems(): Promise<FoodItem[]> {
    return clone(this.state.foodItems);
  }

  async listActiveFoodItems(): Promise<FoodItem[]> {
    return clone(this.state.foodItems.filter((item) => item.isActive));
  }

  async getFoodItem(foodId: string): Promise<FoodItem | null> {
    const item = this.state.foodItems.find((food) => food.foodId === foodId) ?? null;
    return clone(item);
  }

  async saveFoodItem(food: FoodItem): Promise<void> {
    const index = this.state.foodItems.findIndex((item) => item.foodId === food.foodId);
    if (index >= 0) {
      this.state.foodItems[index] = clone(food);
      await this.afterWrite();
      return;
    }

    this.state.foodItems.push(clone(food));
    await this.afterWrite();
  }

  async listMealSlotTemplates(): Promise<MealSlotTemplate[]> {
    return clone(this.state.mealSlotTemplates);
  }

  async getDailyLog(logDate: ISODate): Promise<DailyLog | null> {
    const log = this.state.dailyLogs.find((entry) => entry.logDate === logDate) ?? null;
    return clone(log);
  }

  async listDailyLogs(): Promise<DailyLog[]> {
    return clone([...this.state.dailyLogs].sort((a, b) => a.logDate.localeCompare(b.logDate)));
  }

  async upsertDailyLog(log: DailyLog): Promise<void> {
    const index = this.state.dailyLogs.findIndex((entry) => entry.logId === log.logId);
    if (index >= 0) {
      this.state.dailyLogs[index] = clone(log);
      await this.afterWrite();
      return;
    }

    this.state.dailyLogs.push(clone(log));
    await this.afterWrite();
  }

  async listMealEntries(logId: string): Promise<MealEntry[]> {
    return clone(this.state.mealEntries.filter((entry) => entry.logId === logId));
  }

  async upsertMealEntry(entry: MealEntry): Promise<void> {
    const nextEntry = clone(entry);
    const index = this.state.mealEntries.findIndex(
      (item) => item.mealEntryId === nextEntry.mealEntryId || (item.logId === nextEntry.logId && item.slotId === nextEntry.slotId)
    );

    if (index >= 0) {
      const previousEntryId = this.state.mealEntries[index].mealEntryId;
      this.state.mealEntries[index] = nextEntry;

      if (previousEntryId !== nextEntry.mealEntryId) {
        this.state.mealEntryItems = this.state.mealEntryItems.map((item) =>
          item.mealEntryId === previousEntryId ? { ...item, mealEntryId: nextEntry.mealEntryId } : item
        );
      }

      await this.afterWrite();
      return;
    }

    this.state.mealEntries.push(nextEntry);
    await this.afterWrite();
  }

  async listMealEntryItems(mealEntryId: string): Promise<MealEntryItem[]> {
    return clone(this.state.mealEntryItems.filter((item) => item.mealEntryId === mealEntryId));
  }

  async replaceMealEntryItems(mealEntryId: string, items: MealEntryItem[]): Promise<void> {
    this.state.mealEntryItems = this.state.mealEntryItems.filter((item) => item.mealEntryId !== mealEntryId);
    this.state.mealEntryItems.push(...clone(items));
    await this.afterWrite();
  }

  async listWeightEntries(): Promise<WeightEntry[]> {
    return clone([...this.state.weightEntries].sort((a, b) => a.logDate.localeCompare(b.logDate)));
  }

  async getWeightEntryByDate(logDate: ISODate): Promise<WeightEntry | null> {
    const entry = this.state.weightEntries.find((item) => item.logDate === logDate) ?? null;
    return clone(entry);
  }

  async upsertWeightEntry(entry: WeightEntry): Promise<void> {
    const index = this.state.weightEntries.findIndex((item) => item.logDate === entry.logDate);
    if (index >= 0) {
      this.state.weightEntries[index] = clone(entry);
      await this.afterWrite();
      return;
    }

    this.state.weightEntries.push(clone(entry));
    await this.afterWrite();
  }

  async saveWeightEntry(entry: WeightEntry): Promise<void> {
    await this.upsertWeightEntry(entry);
  }

  async seedDevelopmentData(input: HealthSeedBundle): Promise<void> {
    this.state.userProfile = clone(input.userProfile);
    this.state.mealSlotTemplates = clone(input.mealSlotTemplates);
    this.state.foodItems = clone(input.foodItems);
  }
}
