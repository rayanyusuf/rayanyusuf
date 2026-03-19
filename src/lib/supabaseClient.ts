import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** Browser Supabase client (cookie-backed session via `@supabase/ssr`). */
export const supabase = createBrowserSupabaseClient();

