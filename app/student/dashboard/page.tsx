import { AnnouncementsBanner } from "@/components/shared/announcements-banner";
import { DashboardStats } from "@/components/student/dashboard-stats";
import { TestCard } from "@/components/student/test-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getTestStatus } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ListChecks,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return <ErrorDisplay message="Failed to connect to database" />;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get profile with error handling
  const { data: profile, error: profileError } = (await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: any; error: any };

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    return (
      <ErrorDisplay message="Could not load your profile. Please contact administrator." />
    );
  }

  // Fetch all data in parallel for much faster performance
  const [testsResult, attemptsResult, allocationsResult, announcementsResult] =
    await Promise.all([
      supabase
        .from("tests")
        .select("*")
        .in("status", ["published", "active", "closed"])
        .or(`target_batch.is.null,target_batch.eq.${profile.batch}`)
        .order("start_at", { ascending: false }),

      supabase
        .from("attempts")
        .select("*, test:tests(*)")
        .eq("student_id", profile.id),

      supabase
        .from("allocations")
        .select("*, attempt:attempts(*, test:tests(*))")
        .eq("evaluator_id", profile.id)
        .eq("status", "pending"),

      supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const tests = (testsResult.data || []) as any[];
  const attempts = (attemptsResult.data || []) as any[];
  const allocations = (allocationsResult.data || []) as any[];
  const announcements = (announcementsResult.data || []) as any[];

  // Log errors in background but don't crash
  if (testsResult.error) console.error("Tests fetch error:", testsResult.error);
  if (attemptsResult.error)
    console.error("Attempts fetch error:", attemptsResult.error);
  if (allocationsResult.error)
    console.error("Allocations fetch error:", allocationsResult.error);
  if (announcementsResult.error)
    console.error("Announcements fetch error:", announcementsResult.error);

  // Calculate stats with null safety
  const completedTests = attempts.filter(
    (a) => a.status === "submitted" || a.status === "evaluated",
  ).length;
  const pendingEvaluationsCount = allocations.length;
  const activeTestsCount = tests.filter(
    (t) => getTestStatus(t.start_at, t.end_at, t.status) === "active",
  ).length;

  // Categorize tests
  const upcomingTests = tests.filter(
    (t) => getTestStatus(t.start_at, t.end_at, t.status) === "upcoming",
  );
  const activeTestsList = tests.filter(
    (t) => getTestStatus(t.start_at, t.end_at, t.status) === "active",
  );
  const completedTestsList = tests.filter(
    (t) => getTestStatus(t.start_at, t.end_at, t.status) === "ended",
  );

  const stats = [
    {
      name: "Active Tests",
      value: activeTestsCount,
      icon: "Clock",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      name: "Completed",
      value: completedTests,
      icon: "CheckCircle",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      name: "Pending Evaluations",
      value: pendingEvaluationsCount,
      icon: "ListChecks",
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      name: "Total Tests",
      value: tests.length,
      icon: "FileText",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const displayName = profile.name?.split(" ")[0] || "Student";

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="text-gradient">{displayName}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your tests and evaluations.
        </p>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <AnnouncementsBanner announcements={announcements} />
      )}

      {/* Stats Grid */}
      <Suspense fallback={<SkeletonDashboard />}>
        <DashboardStats stats={stats} />
      </Suspense>

      {/* Active Tests Section */}
      {activeTestsList.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Active Tests
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTestsList.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                attempt={attempts.find((a) => a.test_id === test.id)}
                status="active"
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Evaluations Section */}
      {pendingEvaluationsCount > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-info" />
            Pending Evaluations
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allocations.slice(0, 3).map((allocation) => (
              <div
                key={allocation.id}
                className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <h3 className="font-medium">
                  {allocation.attempt?.test?.title || "Unknown Test"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Submission Code:{" "}
                  {allocation.attempt_id?.slice(0, 8).toUpperCase() || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Deadline:{" "}
                  {allocation.deadline
                    ? formatDate(allocation.deadline)
                    : "N/A"}
                </p>
                <a
                  href={`/student/evaluate/${allocation.id}`}
                  className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
                >
                  Start Evaluation →
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Tests Section */}
      {upcomingTests.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Upcoming Tests
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingTests.slice(0, 3).map((test) => (
              <TestCard key={test.id} test={test} status="upcoming" />
            ))}
          </div>
        </section>
      )}

      {/* Completed Tests Section */}
      {completedTestsList.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Recent Completed Tests
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTestsList.slice(0, 3).map((test) => (
              <TestCard
                key={test.id}
                test={test}
                attempt={attempts.find((a) => a.test_id === test.id)}
                status="ended"
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {tests.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tests available yet</h3>
          <p className="text-muted-foreground mt-1">
            Check back later for upcoming tests.
          </p>
        </div>
      )}
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Dashboard Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">{message}</p>
          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-primary hover:underline">
              ← Back to login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
