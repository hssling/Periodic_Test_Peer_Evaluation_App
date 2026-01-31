"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface ErrorBoundaryUIProps {
  title?: string;
  message?: string;
  variant?: "admin" | "student";
}

export function ErrorBoundaryUI({
  title = "Application Error",
  message = "A critical error occurred while loading this page.",
  variant = "student",
}: ErrorBoundaryUIProps) {
  const isAdmin = variant === "admin";

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${isAdmin ? "bg-slate-900" : "bg-background"}`}
    >
      <Card
        className={`max-w-md w-full ${isAdmin ? "bg-slate-800 border-slate-700 text-white" : "border-destructive/50 bg-destructive/5"}`}
      >
        <CardHeader className="text-center">
          <AlertTriangle
            className={`w-12 h-12 ${isAdmin ? "text-red-500" : "text-destructive"} mx-auto mb-4`}
          />
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className={isAdmin ? "text-slate-400" : "text-muted-foreground"}>
            {message}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className={`flex-1 ${isAdmin ? "bg-slate-700 border-slate-600" : ""}`}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              className={`flex-1 ${isAdmin ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              onClick={() => (window.location.href = "/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
