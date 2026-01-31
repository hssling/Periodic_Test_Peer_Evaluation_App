import type { Database } from "@/types/supabase";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth check
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith("https://")) {
    console.error("[Middleware] Supabase not configured properly:", {
      urlSet: !!supabaseUrl,
      urlValid: supabaseUrl?.startsWith("https://"),
      keySet: !!supabaseAnonKey,
    });
    // Return response with no user - will be treated as unauthenticated
    return { response, user: null, supabase: null };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  try {
    // Refresh session if expired
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, user, supabase };
  } catch (error) {
    console.error("[Middleware] Error getting user:", error);
    return { response, user: null, supabase };
  }
}
