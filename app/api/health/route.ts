import { NextResponse } from "next/server";

// Health check endpoint to diagnose configuration issues
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        valid: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://"),
        preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + "...",
      },
      anonKey: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        valid: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ"),
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
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
