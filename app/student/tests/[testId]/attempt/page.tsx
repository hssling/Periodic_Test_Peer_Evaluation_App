import { TestAttemptClient } from "@/components/student/test-attempt-client";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface TestAttemptPageProps {
  params: { testId: string };
}

export default async function TestAttemptPage({
  params,
}: TestAttemptPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // Get test
  const { data: test } = await supabase
    .from("tests")
    .select("*")
    .eq("id", params.testId)
    .single();

  if (!test) {
    notFound();
  }

  // Get or create attempt
  let attempt = await supabase
    .from("attempts")
    .select("*")
    .eq("test_id", test.id)
    .eq("student_id", profile.id)
    .single()
    .then(({ data }) => data);

  // If already submitted, redirect to results
  if (attempt && (attempt.status === "submitted" || attempt.status === "evaluated")) {
    redirect(`/student/results/${attempt.id}`);
  }

  // Check if test is active for new attempts
  const now = new Date();
  const startAt = new Date(test.start_at);
  const endAt = new Date(test.end_at);

  if (
    !attempt &&
    (!["published", "active"].includes(test.status) ||
      now < startAt ||
      now > endAt)
  ) {
    redirect(`/student/tests/${params.testId}?error=not_active`);
  }

  if (!attempt) {
    // Create new attempt
    const { data: newAttempt, error } = await supabase
      .from("attempts")
      .insert({
        test_id: test.id,
        student_id: profile.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create attempt:", error);
      redirect(`/student/tests/${params.testId}?error=create_failed`);
    }

    attempt = newAttempt;

    // Log attempt start
    await supabase.from("audit_logs").insert({
      user_id: profile.id,
      action_type: "test_started",
      payload: { test_id: test.id, attempt_id: newAttempt.id },
    });
  }

  // Get questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", test.id)
    .order("order_num", { ascending: true });

  if (!questions || questions.length === 0) {
    redirect(`/student/tests/${params.testId}?error=no_questions`);
  }

  // Get existing responses
  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("attempt_id", attempt.id);

  return (
    <TestAttemptClient
      test={test}
      questions={questions}
      attempt={attempt}
      existingResponses={responses || []}
      profile={profile}
    />
  );
}
