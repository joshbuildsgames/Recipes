/*
 * Supabase connection details.
 *
 * Leave these empty and the site works exactly as before: favorites and hidden
 * recipes live in this browser only. Fill them in and a "Sync" button appears,
 * letting you sign in so the same list follows you between devices.
 *
 * Both values are safe to commit. The anon key is designed to be public — it is
 * the row-level security policies in supabase/schema.sql that keep your rows
 * private, not the secrecy of this key. Never put the *service role* key here.
 *
 * Setup instructions: see SUPABASE.md
 */
window.RECIPEBOX_SUPABASE = {
  url: "",
  anonKey: "",
};
