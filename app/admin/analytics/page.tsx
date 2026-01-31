import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  Award,
  BarChart3,
  Clock,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Fetch data for overview stats
  const [
    { count: testsCount },
    { count: studentsCount },
    { count: attemptsCount },
    { count: evaluationsCount },
    { count: submittedCount },
    testsRes,
    attemptsRes,
  ] = await Promise.all([
    supabase.from("tests").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase.from("attempts").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .in("status", ["submitted", "evaluated"]),
    supabase.from("tests").select("id, title, total_marks"),
    supabase
      .from("attempts")
      .select("id, test_id, status, submitted_at, final_score"),
  ]);

  const testData = testsRes.data as
    | { id: string; title: string; total_marks: number }[]
    | null;
  const attemptData = attemptsRes.data as
    | {
        id: string;
        test_id: string;
        status: string;
        submitted_at: string | null;
        final_score: number | null;
      }[]
    | null;

  const completionRate = attemptsCount
    ? Math.round(((submittedCount || 0) / attemptsCount) * 100)
    : 0;

  // Process data for charts
  // 1. Test performance trends (Average score per test)
  const performanceTrends = (testData || [])
    .map((test) => {
      const testAttempts = (attemptData || []).filter(
        (a) => a.test_id === test.id && a.final_score !== null,
      );
      const avgScore =
        testAttempts.length > 0
          ? testAttempts.reduce((sum, a) => sum + (a.final_score || 0), 0) /
            testAttempts.length
          : 0;

      return {
        name: test.title.slice(0, 10),
        average: Math.round((avgScore / (test.total_marks || 1)) * 100),
      };
    })
    .slice(-5); // Show last 5 tests

  // 2. Evaluation distribution (Counts of scores in ranges)
  const scoreDist = [
    { range: "0-20%", count: 0 },
    { range: "21-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];

  (attemptData || []).forEach((a) => {
    if (a.final_score === null || a.final_score === undefined) return;
    const test = (testData || []).find((t) => t.id === a.test_id);
    if (!test || !test.total_marks || test.total_marks === 0) return;

    const percentage = (a.final_score / test.total_marks) * 100;
    if (percentage <= 20) scoreDist[0].count++;
    else if (percentage <= 40) scoreDist[1].count++;
    else if (percentage <= 60) scoreDist[2].count++;
    else if (percentage <= 80) scoreDist[3].count++;
    else scoreDist[4].count++;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Platform <span className="text-gradient">Analytics</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of platform usage and performance metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{testsCount || 0}</p>
            <p className="text-xs text-muted-foreground">Total Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">{studentsCount || 0}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">{attemptsCount || 0}</p>
            <p className="text-xs text-muted-foreground">Attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{evaluationsCount || 0}</p>
            <p className="text-xs text-muted-foreground">Evaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold">{submittedCount || 0}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <AnalyticsCharts
        performanceData={performanceTrends}
        distributionData={scoreDist}
      />

      {/* Quick Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-success/10 text-center">
              <p className="text-lg font-bold text-success">Active</p>
              <p className="text-sm text-muted-foreground">System Status</p>
            </div>
            <div className="p-4 rounded-lg bg-info/10 text-center">
              <p className="text-lg font-bold text-info">99%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 text-center">
              <p className="text-lg font-bold text-warning">Low</p>
              <p className="text-sm text-muted-foreground">Error Rate</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-lg font-bold text-primary">Fast</p>
              <p className="text-sm text-muted-foreground">Response Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
