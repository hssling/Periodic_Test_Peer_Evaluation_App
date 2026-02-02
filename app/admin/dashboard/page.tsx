import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getTestStatus } from "@/lib/utils";
import type { Database } from "@/types/supabase";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Test = Database["public"]["Tables"]["tests"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"] & {
  test?: Test | null;
  student?: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    testsRes,
    studentsRes,
    attemptsRes,
    pendingAllocationsRes,
    rankingRes,
  ] = await Promise.all([
    supabase
      .from("tests")
      .select(
        "id, title, status, start_at, end_at, total_marks, duration_minutes, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id").eq("role", "student"),
    supabase
      .from("attempts")
      .select("*, test:tests(*), student:profiles(*)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("allocations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("attempts")
      .select("id, final_score, test:tests(title), student:profiles(name, roll_no)")
      .eq("status", "evaluated")
      .order("final_score", { ascending: false })
      .limit(10),
  ]);

  const tests = (testsRes.data || []) as Test[];
  const students = studentsRes.data || [];
  const recentAttempts = (attemptsRes.data || []) as Attempt[];
  const pendingAllocations = pendingAllocationsRes.count || 0;
  const ranking = (rankingRes.data || []) as any[];

  // Calculate stats
  const totalTests = tests.length;
  const activeTests = tests.filter(
    (t) => getTestStatus(t.start_at, t.end_at, t.status) === "active",
  ).length;
  const totalStudents = students?.length || 0;
  const pendingEvaluations = pendingAllocations;

  const stats = [
    {
      name: "Total Tests",
      value: totalTests,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/admin/tests",
    },
    {
      name: "Active Tests",
      value: activeTests,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      href: "/admin/tests?status=active",
    },
    {
      name: "Total Students",
      value: totalStudents,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
      href: "/admin/users",
    },
    {
      name: "Pending Reviews",
      value: pendingEvaluations,
      icon: ClipboardCheck,
      color: "text-accent",
      bgColor: "bg-accent/10",
      href: "/admin/evaluations",
    },
  ];

  // Recent tests for quick access
  const recentTests = tests.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Admin <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of tests, students, and evaluations.
          </p>
        </div>
        <Link href="/admin/tests/new">
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<SkeletonDashboard />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Link key={stat.name} href={stat.href}>
              <Card hover className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.name}
                      </p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                  </div>
                  <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Suspense>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Tests</CardTitle>
            <Link href="/admin/tests">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tests created yet
                </p>
              ) : (
                recentTests.map((test) => {
                  const status = getTestStatus(
                    test.start_at,
                    test.end_at,
                    test.status,
                  );
                  return (
                    <Link
                      key={test.id}
                      href={`/admin/tests/${test.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{test.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {test.total_marks} marks • {test.duration_minutes} min
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === "active"
                            ? "bg-success/10 text-success"
                            : status === "upcoming"
                              ? "bg-info/10 text-info"
                              : status === "draft"
                                ? "bg-muted text-muted-foreground"
                                : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {status === "active" && <Clock className="w-3 h-3" />}
                        {status === "ended" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {status}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rankings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top Rankings</CardTitle>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm">
                View analytics
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No evaluated attempts yet
              </p>
            ) : (
              <div className="space-y-3">
                {ranking.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{index + 1} {row.student?.name || "Unknown Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.student?.roll_no || "No roll no"} •{" "}
                        {row.test?.title || "Test"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {row.final_score ?? "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
            <Link href="/admin/evaluations">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!recentAttempts || recentAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No submissions yet
                </p>
              ) : (
                recentAttempts.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {attempt.student?.name || "Unknown Student"}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {attempt.test?.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          attempt.status === "submitted"
                            ? "bg-warning/10 text-warning"
                            : attempt.status === "evaluated"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {attempt.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(
                          attempt.submitted_at || attempt.created_at,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Evaluations Alert */}
        {pendingEvaluations > 0 && (
          <Card className="lg:col-span-2 border-warning/50 bg-warning/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-warning/20">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-warning">
                    {pendingEvaluations} Pending Evaluations
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are evaluations pending from peer reviewers. Consider
                    sending reminders.
                  </p>
                </div>
                <Link href="/admin/evaluations?status=pending">
                  <Button
                    variant="outline"
                    className="border-warning/50 text-warning hover:bg-warning/10"
                  >
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/tests/new">
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col py-6 gap-2"
                >
                  <Plus className="w-6 h-6" />
                  <span>Create Test</span>
                </Button>
              </Link>
              <Link href="/admin/users/import">
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col py-6 gap-2"
                >
                  <Users className="w-6 h-6" />
                  <span>Import Students</span>
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col py-6 gap-2"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>View Analytics</span>
                </Button>
              </Link>
              <Link href="/admin/announcements?create=1">
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col py-6 gap-2"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span>New Announcement</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
