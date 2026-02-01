import type { Database } from "@/types/supabase";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Get environment variables with validation
function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  // Validate URL format - must start with http
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

export async function createClient() {
  // Use placeholder if config is invalid to prevent build crash
  const url = config.url || "https://placeholder.supabase.co";
  const key = config.key || "placeholder-key";

  if (!config.url || !config.key) {
    console.error(
      "[Supabase Server] Missing or invalid environment variables.\n" +
        "NEXT_PUBLIC_SUPABASE_URL should be like: https://yourproject.supabase.co\n" +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY should be the anon key from Supabase dashboard.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
        }
      },
    },
  });
}
