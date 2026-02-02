import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((value) => {
      const str = value === null || value === undefined ? "" : String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

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
    .select("id, title, target_batch")
    .eq("id", params.id)
    .single();

  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, order_num, prompt, max_marks")
    .eq("test_id", params.id)
    .order("order_num", { ascending: true });

  let studentsQuery = supabase
    .from("profiles")
    .select("id, name, roll_no, batch, section")
    .eq("role", "student")
    .eq("is_active", true);

  if (test.target_batch) {
    studentsQuery = studentsQuery.eq("batch", test.target_batch);
  }

  const { data: studentsList } = await studentsQuery;

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, student_id, status, final_score, submitted_at")
    .eq("test_id", params.id);

  const attemptIds = (attempts || []).map((attempt: any) => attempt.id);
  let evaluationItems: any[] = [];

  if (attemptIds.length > 0) {
    const { data: allocations } = await supabase
      .from("allocations")
      .select("id, attempt_id")
      .in("attempt_id", attemptIds);

    const allocationIds = (allocations || []).map((al: any) => al.id);

    if (allocationIds.length > 0) {
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("id, allocation_id")
        .in("allocation_id", allocationIds)
        .eq("is_draft", false);

      const evaluationIds = (evaluations || []).map((ev: any) => ev.id);
      const evaluationToAttempt = new Map(
        (evaluations || []).map((ev: any) => [
          ev.id,
          allocations?.find((al: any) => al.id === ev.allocation_id)?.attempt_id,
        ]),
      );

      if (evaluationIds.length > 0) {
        const { data: items } = await supabase
          .from("evaluation_items")
          .select("score, question_id, evaluation_id")
          .in("evaluation_id", evaluationIds);

        evaluationItems = (items || []).map((item: any) => ({
          ...item,
          attempt_id: evaluationToAttempt.get(item.evaluation_id),
        }));
      }
    }
  }

  const attemptMap = new Map(
    (attempts || []).map((attempt: any) => [attempt.student_id, attempt]),
  );

  const questionIds = (questions || []).map((q: any) => q.id);
  const scoreMap = new Map<string, Record<string, { total: number; count: number }>>();

  (evaluationItems || []).forEach((item: any) => {
    const attemptId = item.attempt_id;
    if (!attemptId) return;
    const byQuestion = scoreMap.get(attemptId) || {};
    const current = byQuestion[item.question_id] || { total: 0, count: 0 };
    byQuestion[item.question_id] = {
      total: current.total + (item.score || 0),
      count: current.count + 1,
    };
    scoreMap.set(attemptId, byQuestion);
  });

  const header = [
    "Student Name",
    "Roll No",
    "Batch",
    "Section",
    "Status",
    "Submitted At",
    "Final Score",
    ...(questions || []).map((q: any) => `Q${q.order_num} Avg Score`),
  ];

  const rows = (studentsList || []).map((student: any) => {
    const attempt = attemptMap.get(student.id);
    const attemptId = attempt?.id;
    const questionScores = questionIds.map((qId) => {
      if (!attemptId) return "";
      const stats = scoreMap.get(attemptId)?.[qId];
      if (!stats || stats.count === 0) return "";
      return (stats.total / stats.count).toFixed(2);
    });

    return toCsvRow([
      student.name,
      student.roll_no || "",
      student.batch || "",
      student.section || "",
      attempt?.status || "not_attempted",
      attempt?.submitted_at || "",
      attempt?.final_score ?? "",
      ...questionScores,
    ]);
  });

  const csv = [toCsvRow(header), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${test.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_scores.csv"`,
    },
  });
}
