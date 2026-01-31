import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getTestStatus } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Edit,
  FileText,
  Users,
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
          />
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
                  {formatDate(testData.start_at, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ends</p>
                <p className="font-medium">
                  {formatDate(testData.end_at, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
