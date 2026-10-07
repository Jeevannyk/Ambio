import { supabase } from './supabase';

/** Returns the stored value, null if none, undefined on error. */
export async function fetchPref(userId, key) {
  if (!supabase || !userId) return undefined;
  const { data, error } = await supabase
    .from('user_prefs')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error('[prefsApi] Error fetching pref:', key, error);
    return undefined;
  }
  return data ? data.value : null;
}

export async function savePref(userId, key, value) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('user_prefs')
    .upsert(
      { user_id: userId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    );
  if (error) console.error('[prefsApi] Error saving pref:', key, error);
}

export function subscribeToPref(userId, key, onChange) {
  if (!supabase || !userId) return () => {};
  const channel = supabase
    .channel(`user_pref_${userId}_${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_prefs', filter: `user_id=eq.${userId}` },
      (payload) => {
        if ((payload.new?.key ?? payload.old?.key) === key) onChange();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
