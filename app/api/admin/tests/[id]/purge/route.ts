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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "faculty")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from("attempts")
    .select("id")
    .eq("test_id", params.id);

  if (attemptsError) {
    console.error("Purge attempts fetch failed:", attemptsError);
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const attemptIds = (attempts || []).map((a: any) => a.id);

  const { data: files, error: filesError } = attemptIds.length
    ? await supabase
        .from("attempt_files")
        .select("file_path")
        .in("attempt_id", attemptIds)
    : { data: [] };

  if (filesError) {
    console.error("Purge files fetch failed:", filesError);
    return NextResponse.json({ error: filesError.message }, { status: 500 });
  }

  if (files && files.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("attempt-uploads")
      .remove(files.map((f: any) => f.file_path));
    if (storageError) {
      console.error("Purge storage remove failed:", storageError);
    }
  }

  const { data: allocations, error: allocationsError } = attemptIds.length
    ? await supabase.from("allocations").select("id").in("attempt_id", attemptIds)
    : { data: [] };

  if (allocationsError) {
    console.error("Purge allocations fetch failed:", allocationsError);
    return NextResponse.json({ error: allocationsError.message }, { status: 500 });
  }

  const allocationIds = (allocations || []).map((a: any) => a.id);

  const { data: evaluations, error: evaluationsError } = allocationIds.length
    ? await supabase
        .from("evaluations")
        .select("id")
        .in("allocation_id", allocationIds)
    : { data: [] };

  if (evaluationsError) {
    console.error("Purge evaluations fetch failed:", evaluationsError);
    return NextResponse.json({ error: evaluationsError.message }, { status: 500 });
  }

  const evaluationIds = (evaluations || []).map((e: any) => e.id);

  if (evaluationIds.length > 0) {
    const { error } = await supabase
      .from("evaluation_items")
      .delete()
      .in("evaluation_id", evaluationIds);
    if (error) {
      console.error("Purge evaluation items failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (allocationIds.length > 0) {
    const { error: evalDeleteError } = await supabase
      .from("evaluations")
      .delete()
      .in("id", evaluationIds);
    if (evalDeleteError) {
      console.error("Purge evaluations delete failed:", evalDeleteError);
      return NextResponse.json({ error: evalDeleteError.message }, { status: 500 });
    }

    const { error: allocDeleteError } = await supabase
      .from("allocations")
      .delete()
      .in("id", allocationIds);
    if (allocDeleteError) {
      console.error("Purge allocations delete failed:", allocDeleteError);
      return NextResponse.json({ error: allocDeleteError.message }, { status: 500 });
    }
  }

  if (attemptIds.length > 0) {
    const { error: responsesDeleteError } = await supabase
      .from("responses")
      .delete()
      .in("attempt_id", attemptIds);
    if (responsesDeleteError) {
      console.error("Purge responses delete failed:", responsesDeleteError);
      return NextResponse.json({ error: responsesDeleteError.message }, { status: 500 });
    }

    const { error: filesDeleteError } = await supabase
      .from("attempt_files")
      .delete()
      .in("attempt_id", attemptIds);
    if (filesDeleteError) {
      console.error("Purge attempt files delete failed:", filesDeleteError);
      return NextResponse.json({ error: filesDeleteError.message }, { status: 500 });
    }

    const { error: attemptsDeleteError } = await supabase
      .from("attempts")
      .delete()
      .in("id", attemptIds);
    if (attemptsDeleteError) {
      console.error("Purge attempts delete failed:", attemptsDeleteError);
      return NextResponse.json({ error: attemptsDeleteError.message }, { status: 500 });
    }
  }

  const { error: questionsDeleteError } = await supabase
    .from("questions")
    .delete()
    .eq("test_id", params.id);
  if (questionsDeleteError) {
    console.error("Purge questions delete failed:", questionsDeleteError);
    return NextResponse.json({ error: questionsDeleteError.message }, { status: 500 });
  }

  const { error: rubricsDeleteError } = await supabase
    .from("rubrics")
    .delete()
    .eq("test_id", params.id);
  if (rubricsDeleteError) {
    console.error("Purge rubrics delete failed:", rubricsDeleteError);
    return NextResponse.json({ error: rubricsDeleteError.message }, { status: 500 });
  }

  const { error: testDeleteError } = await supabase
    .from("tests")
    .delete()
    .eq("id", params.id);
  if (testDeleteError) {
    console.error("Purge test delete failed:", testDeleteError);
    return NextResponse.json({ error: testDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
