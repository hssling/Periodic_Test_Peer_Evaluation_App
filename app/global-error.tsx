"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-xl">Something went wrong!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-400 text-center">
              An unexpected error occurred. This might be a configuration issue.
            </p>

            {error.digest && (
              <p className="text-xs text-slate-500 text-center font-mono">
                Error Digest: {error.digest}
              </p>
            )}

            <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-2">
                Possible causes:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Database connection issues</li>
                <li>Missing environment variables</li>
                <li>Invalid Supabase URL or API key</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={reset}
                variant="outline"
                className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Go home
              </Button>
            </div>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
