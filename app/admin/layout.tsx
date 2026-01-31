import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { TopNav } from "@/components/layout/top-nav";
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

  // If no profile exists, create one automatically (default to student, they can be upgraded)
  if (!profileData) {
    try {
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          role: user.user_metadata?.role || "student", // Default to student
          batch: user.user_metadata?.batch || null,
          section: user.user_metadata?.section || null,
          roll_no: user.user_metadata?.roll_no || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        // Try to fetch again
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
}
