import type { MealSlotTemplate } from '../types/health';

export const mealSlotTemplates: MealSlotTemplate[] = [
  {
    slotId: 'breakfast',
    slotName: 'Breakfast',
    displayOrder: 1,
    requiredCategories: ['protein', 'carb', 'fat'],
    optionalCategories: ['fruit', 'condiment'],
    notes: 'Breakfast follows the Andrew-plan protein + carb + fat structure.',
  },
  {
    slotId: 'lunch',
    slotName: 'Lunch',
    displayOrder: 2,
    requiredCategories: ['protein', 'carb', 'fat', 'veggie'],
    optionalCategories: ['condiment'],
    notes: 'Lunch adds veggies to the core protein + carb + fat structure.',
  },
  {
    slotId: 'supper',
    slotName: 'Supper',
    displayOrder: 3,
    requiredCategories: ['protein', 'carb', 'fat', 'veggie'],
    optionalCategories: ['condiment'],
    notes: 'Supper mirrors lunch with the same required categories.',
  },
  {
    slotId: 'snack',
    slotName: 'Snack',
    displayOrder: 4,
    requiredCategories: ['protein', 'fat'],
    optionalCategories: ['condiment'],
    notes: 'Snack is intentionally lighter and simpler than the main meals.',
  },
];
