import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "faculty")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.rpc("allocate_pending_evaluations", {
    p_test_id: params.id,
    p_force: true,
  });

  return NextResponse.redirect(new URL(`/admin/tests/${params.id}`, request.url));
}
