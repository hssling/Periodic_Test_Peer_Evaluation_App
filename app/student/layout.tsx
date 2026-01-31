import { StudentSidebar } from "@/components/layout/student-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({
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
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If no profile exists, create one automatically
  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        email: user.email || "",
        name:
          user.user_metadata?.name || user.email?.split("@")[0] || "Student",
        role: "student",
        batch: user.user_metadata?.batch || null,
        section: user.user_metadata?.section || null,
        roll_no: user.user_metadata?.roll_no || null,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      // Redirect to a setup page or show error
      redirect("/auth/login?error=profile_creation_failed");
    }

    profile = newProfile;
  }

  // Redirect admins/faculty to admin dashboard
  if (profile.role !== "student") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar profile={profile} />
      <div className="lg:pl-72">
        <TopNav profile={profile} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
