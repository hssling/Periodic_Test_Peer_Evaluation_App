import type { Database } from "@/types/supabase";
import { createBrowserClient } from "@supabase/ssr";

// Get environment variables with validation
function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  // Validate URL format
  if (supabaseUrl && !supabaseUrl.startsWith("http")) {
    console.error(
      `[Supabase] Invalid NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl.substring(0, 30)}..."\n` +
        "Expected a URL starting with https://, got a token or invalid value.\n" +
        "Please check your environment variables.",
    );
    return { url: "", key: "" };
  }

  return { url: supabaseUrl, key: supabaseAnonKey };
}

const config = getSupabaseConfig();

export function createClient() {
  if (!config.url || !config.key) {
    // Return a mock client that throws on use, but doesn't crash build
    console.error(
      "[Supabase] Missing or invalid environment variables.\n" +
        "NEXT_PUBLIC_SUPABASE_URL should be like: https://yourproject.supabase.co\n" +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY should be the anon key from Supabase dashboard.",
    );
    // Create a minimal client with placeholder to prevent build crash
    // This will fail at runtime but allow build to complete
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  }

  return createBrowserClient<Database>(config.url, config.key);
}

// Singleton instance for client-side use
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

export { getSupabaseClient as supabase };
