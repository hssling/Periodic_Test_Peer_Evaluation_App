import { StudentSidebar } from "@/components/layout/student-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({
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
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If no profile exists, try to create one automatically
  if (!profile) {
    console.log(
      "No profile found for user:",
      user.id,
      "- attempting to create one",
    );

    try {
      const { data: newProfile, error: insertError } = await supabase
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
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating profile:", insertError);
        // Try to fetch again - maybe RLS is preventing insert but profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (existingProfile) {
          profile = existingProfile;
        } else {
          // Profile really doesn't exist and we can't create it
          redirect("/auth/login?error=profile_not_found");
        }
      } else {
        profile = newProfile;
      }
    } catch (createError) {
      console.error("Exception creating profile:", createError);
      redirect("/auth/login?error=profile_creation_failed");
    }
  }

  // Safety check
  if (!profile) {
    redirect("/auth/login?error=no_profile");
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
