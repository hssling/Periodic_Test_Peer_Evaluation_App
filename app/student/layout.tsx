import { StudentSidebar } from "@/components/layout/student-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
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
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no profile exists, try to create one automatically
    if (!profile) {
      try {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email || "",
            name:
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Student",
            role: "student",
            is_active: true,
          } as any)
          .select()
          .single();

        if (insertError) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (existingProfile) {
            profile = existingProfile;
          } else {
            redirect("/auth/login?error=profile_creation_failed");
          }
        } else {
          profile = newProfile;
        }
      } catch (createError) {
        console.error("Exception creating profile:", createError);
        redirect("/auth/login?error=profile_creation_failed");
      }
    }

    if (!profile) {
      redirect("/auth/login?error=no_profile");
    }

    // Redirect admins/faculty to admin dashboard
    if (profile.role !== "student") {
      redirect("/admin/dashboard");
    }

    return (
      <div className="min-h-screen bg-background text-foreground">
        <StudentSidebar profile={profile} />
        <div className="lg:pl-72">
          <TopNav profile={profile} />
          <main className="py-6 px-4 sm:px-6 lg:px-8 text-foreground">
            {children}
          </main>
        </div>
      </div>
    );
  } catch (criticalError: any) {
    if (criticalError.message === "NEXT_REDIRECT") throw criticalError;

    console.error("Critical Student Layout Error:", criticalError);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Application Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              A critical error occurred while loading your student dashboard.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button
                className="flex-1"
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
