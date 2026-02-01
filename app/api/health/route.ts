import { NextResponse } from "next/server";

// Health check endpoint to diagnose configuration issues
export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: {
        set: !!supabaseUrl,
        valid: supabaseUrl?.startsWith("https://"),
        preview: supabaseUrl ? supabaseUrl.substring(0, 40) + "..." : "not set",
        source: process.env.NEXT_PUBLIC_SUPABASE_URL ? "next_public" : "server",
      },
      anonKey: {
        set: !!supabaseAnonKey,
        valid: supabaseAnonKey?.startsWith("eyJ"),
        length: supabaseAnonKey?.length || 0,
        source: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "next_public"
          : "server",
      },
    },
    appUrl: {
      set: !!process.env.NEXT_PUBLIC_APP_URL,
      value: process.env.NEXT_PUBLIC_APP_URL || "not set",
    },
    ai: {
      openaiSet: !!process.env.OPENAI_API_KEY,
      googleAiSet: !!process.env.GOOGLE_AI_API_KEY,
    },
  };

  const issues: string[] = [];

  if (!diagnostics.supabase.url.set) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  } else if (!diagnostics.supabase.url.valid) {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_URL does not start with https:// - it may be invalid",
    );
  }

  if (!diagnostics.supabase.anonKey.set) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  } else if (!diagnostics.supabase.anonKey.valid) {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY does not start with eyJ - it may be the wrong value",
    );
  }

  return NextResponse.json({
    status: issues.length === 0 ? "healthy" : "unhealthy",
    issues,
    diagnostics,
  });
}
