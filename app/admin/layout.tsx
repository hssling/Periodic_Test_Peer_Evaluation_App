import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch (error) {
      console.error("Failed to create Supabase client:", error);
      redirect("/auth/login?error=server_error");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/auth/login");
    }

    // Try to get existing profile
    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no profile exists, create one automatically
    if (!profileData) {
      try {
        const { data: newProfile, error } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email || "",
            name:
              user.user_metadata?.name || user.email?.split("@")[0] || "User",
            role: user.user_metadata?.role || "student",
            is_active: true,
          } as any)
          .select()
          .single();

        if (error) {
          console.error("Error creating profile:", error);
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (existingProfile) {
            profileData = existingProfile;
          } else {
            redirect("/auth/login?error=profile_creation_failed");
          }
        } else {
          profileData = newProfile;
        }
      } catch (createError) {
        console.error("Exception creating profile:", createError);
        redirect("/auth/login?error=profile_creation_failed");
      }
    }

    const profile = profileData as Profile | null;

    // Redirect non-admin users to student dashboard
    if (!profile || (profile.role !== "admin" && profile.role !== "faculty")) {
      redirect("/student/dashboard");
    }

    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar profile={profile} />
        <div className="lg:pl-72">
          <TopNav profile={profile} />
          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    );
  } catch (criticalError: any) {
    if (criticalError.message === "NEXT_REDIRECT") throw criticalError;

    console.error("Critical Layout Error:", criticalError);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <Card className="max-w-md bg-slate-800 border-slate-700 text-white">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Administration Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-slate-400">
              A critical error occurred while loading the administration area.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-slate-700"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button
                className="flex-1 bg-blue-600"
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
}
