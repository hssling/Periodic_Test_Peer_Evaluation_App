import { redirect } from "next/navigation";

// Redirect /settings to /admin/settings
export default function SettingsRedirect() {
  redirect("/admin/settings");
}
