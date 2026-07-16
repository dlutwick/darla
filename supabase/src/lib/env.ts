const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const rawAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function isPlaceholder(value: string) {
  return (
    !value ||
    value.includes('your-project') ||
    value.includes('example.supabase.co') ||
    value.includes('your-anon-key') ||
    value.includes('public-anon-key-placeholder')
  );
}

export const env = {
  supabaseUrl: rawUrl,
  supabaseAnonKey: rawAnonKey,
  supabaseConfigured: !isPlaceholder(rawUrl) && !isPlaceholder(rawAnonKey),
};

export function getSupabaseConfigError() {
  if (env.supabaseConfigured) {
    return null;
  }

  return 'Supabase environment variables are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a local .env file.';
}
