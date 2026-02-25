import { AttachmentList } from "@/components/shared/attachment-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("*, test:tests(*), student:profiles(*)")
    .eq("id", params.attemptId)
    .single();

  if (!attempt) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", attempt.test_id)
    .order("order_num", { ascending: true });

  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("attempt_id", attempt.id);

  const { data: attachments } = await supabase
    .from("attempt_files")
    .select("*")
    .eq("attempt_id", attempt.id)
    .order("created_at", { ascending: true });

  const { data: allocations } = await supabase
    .from("allocations")
    .select(
      "*, evaluator:profiles(*), evaluation:evaluations(*, items:evaluation_items(*))",
    )
    .eq("attempt_id", attempt.id);

  const responseMap = new Map((responses || []).map((r: any) => [r.question_id, r]));
  const questionMap = new Map((questions || []).map((q: any) => [q.id, q]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/tests/${attempt.test_id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Test
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Attempt Details</h1>
          <p className="text-muted-foreground">
            {attempt.test?.title} - {attempt.student?.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(questions || []).map((q: any, index: number) => {
                const response = responseMap.get(q.id);
                return (
                  <div key={q.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        Q{index + 1}. {q.prompt}
                      </p>
                      <span className="text-xs text-muted-foreground">{q.max_marks} marks</span>
                    </div>
                    <div className="mt-2 text-sm">
                      {response?.answer_text ? (
                        <p className="whitespace-pre-wrap">{response.answer_text}</p>
                      ) : response?.selected_options ? (
                        <p>Selected: {(response.selected_options as string[]).join(", ")}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No response provided</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Peer Evaluations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(allocations || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No evaluations yet.</p>
              )}
              {(allocations || []).map((allocation: any) => {
                const evaluation = Array.isArray(allocation.evaluation)
                  ? allocation.evaluation[0]
                  : allocation.evaluation;

                return (
                  <div key={allocation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Evaluator: {allocation.evaluator?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">Status: {allocation.status}</p>
                      </div>
                      {evaluation?.submitted_at && (
                        <span className="text-xs text-muted-foreground">
                          Submitted {formatDate(evaluation.submitted_at, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {evaluation && (
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-medium">Total Score: {evaluation.total_score ?? "-"}</p>
                        {evaluation.overall_feedback && (
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {evaluation.overall_feedback}
                          </p>
                        )}
                        {(evaluation.items || []).length > 0 && (
                          <div className="space-y-2">
                            {(evaluation.items || []).map((item: any, index: number) => {
                              const question = questionMap.get(item.question_id);
                              return (
                                <div key={item.id} className="rounded-md border p-2 text-xs">
                                  <p className="font-medium">
                                    Q{index + 1}: {question?.prompt || item.question_id}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Score: {item.score}
                                    {question?.max_marks ? ` / ${question.max_marks}` : ""}
                                  </p>
                                  {item.feedback && (
                                    <p className="text-muted-foreground">Feedback: {item.feedback}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attempt Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{attempt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>{formatDate(attempt.started_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{attempt.submitted_at ? formatDate(attempt.submitted_at) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final Score</span>
                <span>{attempt.final_score ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentList files={attachments || []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
