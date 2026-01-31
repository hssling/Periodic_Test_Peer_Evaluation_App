import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { PromotionFooter } from "@/components/layout/promotion-footer";
import { TopNav } from "@/components/layout/top-nav";
import { ErrorBoundaryUI } from "@/components/shared/error-boundary-ui";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
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
          <PromotionFooter />
        </div>
      </div>
    );
  } catch (criticalError: any) {
    if (criticalError.message === "NEXT_REDIRECT") throw criticalError;

    console.error("Critical Layout Error:", criticalError);
    return (
      <ErrorBoundaryUI
        variant="admin"
        title="Administration Error"
        message="A critical error occurred while loading the administration area."
      />
    );
  }
}
