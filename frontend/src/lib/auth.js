// The one account with admin powers (room create/delete, etc.).
// Admin status is derived from the live Supabase session — see AuthContext.
export const ADMIN_EMAIL = 'jeevangknayak@gmail.com';

// The sign-in/sign-up takeover routes — no app chrome, no floating panels.
export const isAuthRoute = (p) => p === '/login' || p === '/signup';
