import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { redirect } from "next/navigation";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Try to get existing profile
  let { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If no profile exists, create one automatically (default to student, they can be upgraded)
  if (!profileData) {
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
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      redirect("/auth/login?error=profile_creation_failed");
    }

    profileData = newProfile;
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
