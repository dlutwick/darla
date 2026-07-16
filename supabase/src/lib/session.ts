import { requireSupabase } from './supabase';
import { env, getSupabaseConfigError } from './env';

type BootstrapResult =
  | { status: 'ready'; userId: string; sessionEmail: string | null }
  | { status: 'missing-config'; message: string }
  | { status: 'needs-auth'; message: string }
  | { status: 'error'; message: string };

export async function bootstrapSession(): Promise<BootstrapResult> {
  if (!env.supabaseConfigured) {
    return {
      status: 'missing-config',
      message: getSupabaseConfigError() ?? 'Supabase is not configured.',
    };
  }

  const supabase = requireSupabase();

  const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { status: 'error', message: sessionError.message };
  }

  const session = currentSession.session;

  if (!session) {
    return {
      status: 'needs-auth',
      message: 'No signed-in session was found. Connect a real Supabase auth flow before testing persistence.',
    };
  }

  const user = session.user;

  const { error: userError } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? `${user.id}@health-app.local`,
      name: (user.user_metadata?.name as string | undefined) ?? null,
      timezone: 'America/Moncton',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (userError) {
    return { status: 'error', message: userError.message };
  }

  return {
    status: 'ready',
    userId: user.id,
    sessionEmail: user.email ?? null,
  };
}

export async function getCurrentUserId() {
  const result = await bootstrapSession();

  if (result.status !== 'ready') {
    throw new Error(result.message);
  }

  return result.userId;
}
