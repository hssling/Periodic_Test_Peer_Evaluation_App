import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  User,
  XCircle,
} from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface ResultsPageProps {
  params: { attemptId: string };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  // Get attempt with test and responses
  const { data: attempt } = await supabase
    .from("attempts")
    .select("*, test:tests(*)")
    .eq("id", params.attemptId)
    .eq("student_id", profile!.id)
    .single();

  if (!attempt) {
    notFound();
  }

  // Get questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", attempt.test_id)
    .order("order_num");

  // Get responses
  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("attempt_id", attempt.id);

  // Get evaluations for this attempt
  const { data: allocations } = await supabase
    .from("allocations")
    .select("*, evaluation:evaluations(*)")
    .eq("attempt_id", attempt.id)
    .eq("status", "completed");

  const evaluations =
    allocations?.map((a) => a.evaluation).filter(Boolean) || [];
  const avgScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((sum, e) => sum + (e?.total_score || 0), 0) /
            evaluations.length,
        )
      : null;

  const responsesByQuestion = new Map(
    responses?.map((r) => [r.question_id, r]),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Test <span className="text-gradient">Results</span>
        </h1>
        <p className="text-muted-foreground mt-1">{attempt.test?.title}</p>
      </div>

      {/* Summary Card */}
      <Card variant="gradient">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                {attempt.status === "evaluated" ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-success" /> Evaluated
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-warning" /> Pending
                  </>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-lg font-semibold">
                {attempt.submitted_at
                  ? formatDate(attempt.submitted_at, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not submitted"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Spent</p>
              <p className="text-lg font-semibold">
                {attempt.time_spent_seconds >= 60
                  ? `${Math.floor(attempt.time_spent_seconds / 60)} min`
                  : `${attempt.time_spent_seconds || 0} sec`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-gradient">
                {avgScore !== null
                  ? `${avgScore}/${attempt.test?.total_marks}`
                  : "Pending"}
              </p>
            </div>
          </div>

          {avgScore !== null && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Score</span>
                <span>
                  {Math.round(
                    (avgScore / (attempt.test?.total_marks || 1)) * 100,
                  )}
                  %
                </span>
              </div>
              <Progress
                value={(avgScore / (attempt.test?.total_marks || 1)) * 100}
                variant={
                  avgScore >= 80
                    ? "success"
                    : avgScore >= 60
                      ? "warning"
                      : "default"
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Violations */}
      {(attempt.tab_switches > 0 || attempt.paste_attempts > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <XCircle className="w-5 h-5" />
              Violations Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {attempt.tab_switches > 0 && (
                <div>
                  <p className="text-2xl font-bold">{attempt.tab_switches}</p>
                  <p className="text-sm text-muted-foreground">Tab switches</p>
                </div>
              )}
              {attempt.paste_attempts > 0 && (
                <div>
                  <p className="text-2xl font-bold">{attempt.paste_attempts}</p>
                  <p className="text-sm text-muted-foreground">
                    Paste attempts
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluations */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Peer Evaluations ({evaluations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluations.map((evaluation, index) => (
              <div
                key={evaluation?.id || index}
                className="p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    Evaluator {index + 1}
                  </span>
                  <span className="font-semibold">
                    {evaluation?.total_score}/{attempt.test?.total_marks}
                  </span>
                </div>
                {evaluation?.overall_feedback && (
                  <p className="text-sm text-muted-foreground mt-2">
                    &ldquo;{evaluation.overall_feedback}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Your Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Answers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions?.map((question, index) => {
            const response = responsesByQuestion.get(question.id);
            return (
              <div key={question.id} className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{question.prompt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {question.type.replace("_", " ")} • {question.max_marks}{" "}
                      marks
                    </p>
                  </div>
                </div>
                <div className="ml-11">
                  {response?.answer_text ? (
                    <p className="text-sm bg-background p-3 rounded-lg">
                      {response.answer_text}
                    </p>
                  ) : response?.selected_options ? (
                    <p className="text-sm bg-background p-3 rounded-lg">
                      Selected:{" "}
                      {(response.selected_options as string[]).join(", ")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No answer provided
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
