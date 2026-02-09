"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    const run = async () => {
      try {
        const type = searchParams?.get("type");
        const code = searchParams?.get("code");
        const nextPath = searchParams?.get("next");
        const next = nextPath && nextPath.startsWith("/") ? nextPath : "/";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash) {
          const hash = parseHashParams(window.location.hash);
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login?error=callback_session_failed");
          return;
        }

        if (type === "recovery") {
          setMessage("Redirecting to password update...");
          router.replace("/auth/update-password");
          return;
        }

        setMessage("Redirecting...");
        router.replace(next);
      } catch (error) {
        router.replace("/auth/login?error=callback_failed");
      }
    };

    run();
  }, [router, searchParams, supabase]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Authenticating</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{message}</span>
      </CardContent>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authenticating</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Completing sign in...</span>
            </CardContent>
          </Card>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
