import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const EXPO_SECURE_STORE_KEY_PREFIX = 'health-app.supabase.';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(`${EXPO_SECURE_STORE_KEY_PREFIX}${key}`),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(`${EXPO_SECURE_STORE_KEY_PREFIX}${key}`, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(`${EXPO_SECURE_STORE_KEY_PREFIX}${key}`),
};

export const supabase = env.supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: secureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a local .env file.'
    );
  }

  return supabase;
}
