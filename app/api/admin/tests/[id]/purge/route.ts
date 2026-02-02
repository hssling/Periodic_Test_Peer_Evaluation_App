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

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("test_id", params.id);

  const attemptIds = (attempts || []).map((a: any) => a.id);

  const { data: files } = attemptIds.length
    ? await supabase
        .from("attempt_files")
        .select("file_path")
        .in("attempt_id", attemptIds)
    : { data: [] };

  if (files && files.length > 0) {
    await supabase.storage
      .from("attempt-uploads")
      .remove(files.map((f: any) => f.file_path));
  }

  const { data: allocations } = attemptIds.length
    ? await supabase.from("allocations").select("id").in("attempt_id", attemptIds)
    : { data: [] };

  const allocationIds = (allocations || []).map((a: any) => a.id);

  const { data: evaluations } = allocationIds.length
    ? await supabase
        .from("evaluations")
        .select("id")
        .in("allocation_id", allocationIds)
    : { data: [] };

  const evaluationIds = (evaluations || []).map((e: any) => e.id);

  if (evaluationIds.length > 0) {
    await supabase
      .from("evaluation_items")
      .delete()
      .in("evaluation_id", evaluationIds);
  }

  if (allocationIds.length > 0) {
    await supabase.from("evaluations").delete().in("id", evaluationIds);
    await supabase.from("allocations").delete().in("id", allocationIds);
  }

  if (attemptIds.length > 0) {
    await supabase.from("responses").delete().in("attempt_id", attemptIds);
    await supabase.from("attempt_files").delete().in("attempt_id", attemptIds);
    await supabase.from("attempts").delete().in("id", attemptIds);
  }

  await supabase.from("questions").delete().eq("test_id", params.id);
  await supabase.from("rubrics").delete().eq("test_id", params.id);
  await supabase.from("tests").delete().eq("id", params.id);

  return NextResponse.redirect(new URL("/admin/tests", request.url));
}
