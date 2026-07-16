import { mealSlotTemplates } from '../meal-slots';
import { defaultUserProfile } from './default-user-profile';
import { seededFoodItems } from './foods';
import type { HealthSeedBundle } from '../repositories/health-repository';

export const devSeedBundle: HealthSeedBundle = {
  userProfile: defaultUserProfile,
  mealSlotTemplates,
  foodItems: seededFoodItems,
};
