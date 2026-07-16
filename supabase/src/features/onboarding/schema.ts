import { z } from 'zod';

export const onboardingSchema = z.object({
  currentWeightKg: z.coerce.number().positive('Current weight is required'),
  goalWeightKg: z.coerce.number().positive('Goal weight is required'),
  calorieTarget: z.coerce.number().int().positive('Calorie target is required'),
  proteinTarget: z.coerce.number().int().positive('Protein target is required'),
  carbsTarget: z.coerce.number().int().positive('Carb target is required'),
  fatTarget: z.coerce.number().int().positive('Fat target is required'),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
