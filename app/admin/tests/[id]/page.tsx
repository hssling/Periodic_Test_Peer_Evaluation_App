import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublishTestButton } from "@/components/admin/publish-test-button";
import { createClient } from "@/lib/supabase/server";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { getTestStatus } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Edit,
  FileText,
  Users,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminTestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Auto-activate/close this test based on schedule.
  await supabase
    .from("tests")
    .update({ status: "active" })
    .eq("id", params.id)
    .eq("status", "published")
    .lte("start_at", nowIso)
    .gte("end_at", nowIso);

  const { data: closedTests } = await supabase
    .from("tests")
    .update({ status: "closed" })
    .eq("id", params.id)
    .in("status", ["published", "active"])
    .lt("end_at", nowIso)
    .select("id, auto_allocate_on_end");

  if (closedTests?.[0]?.auto_allocate_on_end) {
    try {
      await supabase.rpc("allocate_pending_evaluations", {
        p_test_id: params.id,
        p_force: false,
      });
    } catch (e) {
      console.error("Allocation batch failed:", e);
    }
  }

  // Get test with questions
  const { data: test, error } = await supabase
    .from("tests")
    .select(
      "*, questions(*), created_by_profile:profiles!tests_created_by_fkey(name)",
    )
    .eq("id", params.id)
    .single();

  if (error || !test) {
    notFound();
  }

  const testData = test as any;
  const status = getTestStatus(
    testData.start_at,
    testData.end_at,
    testData.status,
  );

  // Get attempt stats
  const { count: totalAttempts } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("test_id", params.id);

  const { count: submittedAttempts } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("test_id", params.id)
    .eq("status", "submitted");

  const { data: attemptIds } = await supabase
    .from("attempts")
    .select("id")
    .eq("test_id", params.id);

  const { data: recentAttempts } = await supabase
    .from("attempts")
    .select("id, status, submitted_at, student:profiles(name, roll_no)")
    .eq("test_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: pendingReviews } =
    attemptIds && attemptIds.length > 0
      ? await supabase
          .from("allocations")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"])
          .in(
            "attempt_id",
            attemptIds.map((a: any) => a.id),
          )
      : { count: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/tests">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {testData.title}
              </h1>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status === "active"
                    ? "bg-success/20 text-success"
                    : status === "upcoming"
                      ? "bg-info/20 text-info"
                      : status === "draft"
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-secondary-foreground"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-muted-foreground">
              Created by {testData.created_by_profile?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PublishTestButton
            testId={params.id}
            currentStatus={testData.status}
            questionsCount={testData.questions?.length || 0}
            durationMinutes={testData.duration_minutes}
          />
          <form action={`/api/admin/tests/${params.id}/allocate`} method="post">
            <Button variant="outline" size="sm" type="submit">
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Allocation
            </Button>
          </form>
          <Link href={`/admin/tests/${params.id}/analytics`}>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href={`/admin/tests/${params.id}/edit`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {testData.description || "No description provided"}
              </p>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Questions ({testData.questions?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(testData.questions || [])
                  .sort((a: any, b: any) => a.order_num - b.order_num)
                  .map((q: any, idx: number) => (
                    <div key={q.id} className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">
                            Q{idx + 1}
                          </span>
                          <p className="font-medium">{q.prompt}</p>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mt-2 inline-block">
                            {q.type} • {q.max_marks} marks
                          </span>
                        </div>
                      </div>
                      {q.options && (
                        <div className="mt-3 ml-4 space-y-1">
                          {q.options.map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="font-medium">{opt.id}.</span>
                              <span
                                className={
                                  q.correct_answer?.includes(opt.id)
                                    ? "text-success font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {opt.text}
                              </span>
                              {q.correct_answer?.includes(opt.id) && (
                                <CheckCircle className="w-3 h-3 text-success" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recentAttempts || []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No attempts yet.
                </p>
              )}
              {(recentAttempts || []).map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attempt.student?.name || "Unknown Student"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.student?.roll_no || "No roll no"} •{" "}
                      {attempt.status}
                    </p>
                  </div>
                  <Link href={`/admin/attempts/${attempt.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Marks</span>
                <span className="font-medium">{testData.total_marks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {testData.duration_minutes} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Attempts</span>
                <span className="font-medium">{totalAttempts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-medium">{submittedAttempts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Reviews</span>
                <span className="font-medium">{pendingReviews || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data & Exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href={`/api/admin/tests/${params.id}/scores`}>
                <Button variant="outline" className="w-full">
                  Download Score Sheet (CSV)
                </Button>
              </a>
              <a href={`/api/admin/tests/${params.id}/export`}>
                <Button variant="outline" className="w-full">
                  Download Full Test Data
                </Button>
              </a>
              <form
                action={`/api/admin/tests/${params.id}/purge`}
                method="post"
              >
                <Button variant="destructive" className="w-full" type="submit">
                  Delete Test Data
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                This permanently deletes the test and all related data.
              </p>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Starts</p>
                <p className="font-medium">
                  <LocalDateTime
                    value={testData.start_at}
                    options={{
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }}
                  />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ends</p>
                <p className="font-medium">
                  <LocalDateTime
                    value={testData.end_at}
                    options={{
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }}
                  />
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Peer Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evaluators</span>
                <span className="font-medium">
                  {testData.evaluators_per_submission}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Same Batch Only</span>
                <span
                  className={`font-medium ${testData.same_batch_only ? "text-success" : "text-muted-foreground"}`}
                >
                  {testData.same_batch_only ? "Yes" : "No"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
