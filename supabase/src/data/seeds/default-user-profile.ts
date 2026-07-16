import type { UserProfile } from '../../types/health';

const createdAt = '2026-03-28T00:00:00.000Z';

export const defaultUserProfile: UserProfile = {
  userId: 'darla',
  displayName: 'Darla',
  timezone: 'America/Moncton',
  targetMacroProteinPct: 35,
  targetMacroFatPct: 50,
  targetMacroCarbPct: 15,
  dailyCalorieTarget: 1200,
  proteinTargetG: 110,
  carbTargetG: 80,
  fatTargetG: 67,
  stepGoal: 8000,
  mileGoal: 3,
  goalWeightLb: null,
  preferredWeighInDay: 'Sunday',
  createdAt,
  updatedAt: createdAt,
};
