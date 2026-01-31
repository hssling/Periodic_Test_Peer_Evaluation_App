"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  // Check if this might be a configuration error
  const isConfigError =
    error.message?.includes("URL") ||
    error.message?.includes("Supabase") ||
    error.message?.includes("environment");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-primary/5">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            {isConfigError
              ? "There seems to be a configuration issue with the application."
              : "An unexpected error occurred while loading this page."}
          </p>

          {error.digest && (
            <p className="text-xs text-muted-foreground text-center font-mono bg-muted p-2 rounded">
              Error ID: {error.digest}
            </p>
          )}

          {isConfigError && (
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium mb-2">
                Administrator: Check these settings:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>NEXT_PUBLIC_SUPABASE_URL is set correctly</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY is valid</li>
                <li>Database is accessible</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full" variant="default">
                <Home className="w-4 h-4 mr-2" />
                Go home
              </Button>
            </Link>
          </div>

          <Link
            href="/auth/login"
            className="block text-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
