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
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "faculty")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: test } = await supabase
    .from("tests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", params.id);

  const { data: rubrics } = await supabase
    .from("rubrics")
    .select("*")
    .eq("test_id", params.id);

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*")
    .eq("test_id", params.id);

  const attemptIds = (attempts || []).map((a: any) => a.id);

  const { data: responses } = attemptIds.length
    ? await supabase.from("responses").select("*").in("attempt_id", attemptIds)
    : { data: [] };

  const { data: allocations } = attemptIds.length
    ? await supabase.from("allocations").select("*").in("attempt_id", attemptIds)
    : { data: [] };

  const allocationIds = (allocations || []).map((a: any) => a.id);

  const { data: evaluations } = allocationIds.length
    ? await supabase
        .from("evaluations")
        .select("*")
        .in("allocation_id", allocationIds)
    : { data: [] };

  const evaluationIds = (evaluations || []).map((e: any) => e.id);

  const { data: evaluationItems } = evaluationIds.length
    ? await supabase
        .from("evaluation_items")
        .select("*")
        .in("evaluation_id", evaluationIds)
    : { data: [] };

  const { data: attemptFiles } = attemptIds.length
    ? await supabase
        .from("attempt_files")
        .select("*")
        .in("attempt_id", attemptIds)
    : { data: [] };

  const payload = {
    test,
    questions: questions || [],
    rubrics: rubrics || [],
    attempts: attempts || [],
    responses: responses || [],
    allocations: allocations || [],
    evaluations: evaluations || [],
    evaluation_items: evaluationItems || [],
    attempt_files: attemptFiles || [],
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `${test.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
