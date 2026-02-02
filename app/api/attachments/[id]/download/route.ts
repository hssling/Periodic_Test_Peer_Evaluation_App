import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: file } = await supabase
    .from("attempt_files")
    .select("*, attempt:attempts(student_id)")
    .eq("id", params.id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = profile.role === "admin" || profile.role === "faculty";
  const isOwner = file.uploader_id === profile.id;

  if (!isAdmin && !isOwner) {
    const { data: allocation } = await supabase
      .from("allocations")
      .select("id")
      .eq("attempt_id", file.attempt_id)
      .eq("evaluator_id", profile.id)
      .maybeSingle();

    if (!allocation && file.attempt?.student_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase.storage
    .from("attempt-uploads")
    .createSignedUrl(file.file_path, 600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
