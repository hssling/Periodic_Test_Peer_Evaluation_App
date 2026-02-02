import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getTestStatus } from "@/lib/utils";
import { ArrowLeft, Clock, FileText, Play } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface TestDetailPageProps {
  params: { testId: string };
}

export default async function StudentTestDetailPage({
  params,
}: TestDetailPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get test info
  const { data: test, error } = await supabase
    .from("tests")
    .select("*")
    .eq("id", params.testId)
    .single();

  if (error || !test) {
    notFound();
  }

  const status = getTestStatus(test.start_at, test.end_at, test.status);

  // Check if there's an existing attempt
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status")
    .eq("test_id", test.id)
    .eq("student_id", profile?.id)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/student/tests">
        <Button variant="ghost" size="sm" className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">{test.title}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {test.description || "No description provided."}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status === "active"
                  ? "bg-success/20 text-success"
                  : status === "upcoming"
                    ? "bg-info/20 text-info"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Duration
              </span>
              <p className="font-medium text-lg">
                {test.duration_minutes} Minutes
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> Total Marks
              </span>
              <p className="font-medium text-lg">{test.total_marks} Marks</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
            <h4 className="font-semibold text-sm">Important Instructions:</h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Ensure you have a stable internet connection.</li>
              <li>Once started, the timer cannot be paused.</li>
              <li>Do not switch tabs or minimize the browser window.</li>
              <li>The test will automatically submit when time is up.</li>
            </ul>
          </div>

          {status === "active" ? (
            attempt?.status === "submitted" || attempt?.status === "evaluated" ? (
              <Link href={`/student/results/${attempt.id}`} className="block">
                <Button variant="gradient" size="lg" className="w-full">
                  <Play className="w-5 h-5 mr-2" />
                  View Results
                </Button>
              </Link>
            ) : (
              <Link href={`/student/tests/${test.id}/attempt`} className="block">
                <Button variant="gradient" size="lg" className="w-full">
                  <Play className="w-5 h-5 mr-2" />
                  {attempt ? "Continue Attempt" : "Start Test Now"}
                </Button>
              </Link>
            )
          ) : status === "upcoming" ? (
            <Button disabled className="w-full" size="lg">
              Test starts at {formatDate(test.start_at)}
            </Button>
          ) : (
            <Button disabled className="w-full" size="lg">
              This test has ended
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
