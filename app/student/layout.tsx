import { PromotionFooter } from "@/components/layout/promotion-footer";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { ErrorBoundaryUI } from "@/components/shared/error-boundary-ui";
import { createClient } from "@/lib/supabase/server";
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
    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

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
            roll_no:
              user.user_metadata?.roll_no || user.user_metadata?.rollNo || null,
            batch: user.user_metadata?.batch || null,
            section:
              user.user_metadata?.section || user.user_metadata?.group || null,
            role: "student",
            is_active: true,
          } as any)
          .select()
          .maybeSingle();

        if (insertError) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

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
    if ((profile as any).role !== "student") {
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
          <PromotionFooter />
        </div>
      </div>
    );
  } catch (criticalError: any) {
    if (criticalError.message === "NEXT_REDIRECT") throw criticalError;

    console.error("Critical Student Layout Error:", criticalError);
    return (
      <ErrorBoundaryUI
        variant="student"
        title="Application Error"
        message="A critical error occurred while loading your student dashboard."
      />
    );
  }
}
