import { requireSupabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/session';
import { getLocalDay } from '../../lib/date';

export async function saveWeight(weightKg: number) {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const loggedOn = getLocalDay();

  const { error } = await supabase.from('weights').upsert(
    {
      user_id: userId,
      logged_on: loggedOn,
      weight_kg: weightKg,
      source: 'manual',
    },
    { onConflict: 'user_id,logged_on' }
  );

  if (error) throw error;
}

export async function loadProgressSnapshot() {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('start_weight_kg, goal_weight_kg')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const { data: weights, error: weightError } = await supabase
    .from('weights')
    .select('logged_on, weight_kg')
    .eq('user_id', userId)
    .order('logged_on', { ascending: true });

  if (weightError) {
    throw weightError;
  }

  const latestWeight = weights?.length ? Number(weights[weights.length - 1].weight_kg) : null;
  const goalWeight = profile?.goal_weight_kg != null ? Number(profile.goal_weight_kg) : null;
  const startingWeight = profile?.start_weight_kg != null ? Number(profile.start_weight_kg) : null;

  return {
    startingWeight,
    latestWeight,
    goalWeight,
    poundsRemaining:
      latestWeight != null && goalWeight != null
        ? Math.round((latestWeight - goalWeight) * 2.20462 * 10) / 10
        : null,
    weights: (weights ?? []).map((entry) => ({
      logged_on: entry.logged_on,
      weight_kg: Number(entry.weight_kg),
    })),
  };
}
