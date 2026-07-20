import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { ADMIN_EMAIL } from './auth';

const AuthContext = createContext({ user: null, loading: true, isAdmin: false, signOut: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Initial session, then subscribe to changes (login, logout, token refresh).
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = !!user && typeof user.email === 'string' && user.email.trim().toLowerCase() === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
