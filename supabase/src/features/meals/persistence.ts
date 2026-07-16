import { requireSupabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/session';
import { getLocalDay } from '../../lib/date';
import { DailyLogState, DailySummary, MealItem } from './types';

function todayDate() {
  return getLocalDay();
}

export async function ensureTodayLog() {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const loggedOn = todayDate();

  const { data: existing, error: existingError } = await supabase
    .from('daily_logs')
    .select('id, user_id, logged_on')
    .eq('user_id', userId)
    .eq('logged_on', loggedOn)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .insert({ user_id: userId, logged_on: loggedOn })
    .select('id, user_id, logged_on')
    .single();

  if (error) throw error;
  return data;
}

export async function persistMealEntry(dailyLogId: string, mealSlot: string, item: MealItem) {
  const supabase = requireSupabase();

  const { data: mealEntry, error: mealEntryError } = await supabase
    .from('meal_entries')
    .insert({ daily_log_id: dailyLogId, meal_slot: mealSlot, source: 'quick_add' })
    .select('id')
    .single();

  if (mealEntryError) throw mealEntryError;

  const { error: itemError } = await supabase.from('meal_entry_items').insert({
    meal_entry_id: mealEntry.id,
    food_source: 'foods',
    food_id: item.foodId,
    quantity: item.quantityMultiplier,
    unit: 'serving',
    sort_order: 0,
  });

  if (itemError) throw itemError;
}

export async function persistDailySummary(summary: DailySummary) {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const loggedOn = todayDate();

  const { error } = await supabase.from('daily_summaries').upsert(
    {
      user_id: userId,
      logged_on: loggedOn,
      calories: summary.calories,
      protein_g: summary.protein_g,
      carbs_g: summary.carbs_g,
      fat_g: summary.fat_g,
    },
    { onConflict: 'user_id,logged_on' }
  );

  if (error) throw error;
}

export function attachDailyLogMeta(
  log: DailyLogState,
  dailyLog: { id: string; user_id: string; logged_on: string }
) {
  return {
    ...log,
    id: dailyLog.id,
    userId: dailyLog.user_id,
    loggedOn: dailyLog.logged_on,
  };
}
