import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/auth/login?error=no_profile");
  }

  if (!profile.is_active) {
    redirect("/auth/login?error=account_inactive");
  }

  const isAdmin = profile.role === "admin" || profile.role === "faculty";
  redirect(isAdmin ? "/admin/settings" : "/student/profile");
}
