import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { fetchPref, savePref, subscribeToPref } from '../lib/prefsApi';

/**
 * Mirrors a localStorage-backed state value to Supabase while logged in.
 * `value` must be JSON-serialisable; `apply(remote)` sets the state. On login
 * the remote copy wins (or `merge(local, remote)` if given); with no remote
 * copy yet, the local one is uploaded. Logged out, this does nothing.
 */
export function useCloudPref(key, value, apply, merge) {
  const { user } = useAuth();
  const uid = user?.id;
  const ready = useRef(false);
  const lastJson = useRef(null);
  const valueRef = useRef(value);
  const applyRef = useRef(apply);
  const mergeRef = useRef(merge);
  valueRef.current = value;
  applyRef.current = apply;
  mergeRef.current = merge;

  useEffect(() => {
    if (!uid) {
      ready.current = false;
      return;
    }
    let active = true;
    ready.current = false;

    const pull = async (initial) => {
      const remote = await fetchPref(uid, key);
      if (!active || remote === undefined) return;
      const local = valueRef.current;
      const localJson = JSON.stringify(local);
      // A local edit is waiting to be saved — don't clobber it with older data.
      if (!initial && localJson !== lastJson.current) return;

      if (remote === null) {
        if (initial) {
          lastJson.current = localJson;
          await savePref(uid, key, local);
        }
      } else {
        const next = mergeRef.current ? mergeRef.current(local, remote) : remote;
        const nextJson = JSON.stringify(next);
        lastJson.current = nextJson;
        if (nextJson !== localJson) applyRef.current(next);
        if (nextJson !== JSON.stringify(remote)) await savePref(uid, key, next);
      }
      if (initial && active) ready.current = true;
    };

    pull(true);
    const unsubscribe = subscribeToPref(uid, key, () => pull(false));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, key]);

  useEffect(() => {
    if (!uid || !ready.current) return;
    const json = JSON.stringify(value);
    if (json === lastJson.current) return;
    const t = setTimeout(() => {
      lastJson.current = json;
      savePref(uid, key, value);
    }, 600);
    return () => clearTimeout(t);
  }, [value, uid, key]);
}
