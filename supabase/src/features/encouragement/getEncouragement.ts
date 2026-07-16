import { DailySummary } from '../meals/types';

export function getEncouragement(summary: DailySummary) {
  if (summary.calories === 0) {
    return 'A quiet start still counts. One kind choice gets the day moving.';
  }

  if (summary.protein_g >= 80) {
    return 'You are doing beautifully — protein is looking strong today.';
  }

  if (summary.calories > 0 && summary.calories < 400) {
    return 'That is a lovely start. Keep stacking simple wins.';
  }

  if (summary.calories >= 400 && summary.calories <= 1200) {
    return 'You are building a steady, workable day. Keep going.';
  }

  return 'One moment never ruins the day. Breathe, reset, and make the next choice a gentle one.';
}
