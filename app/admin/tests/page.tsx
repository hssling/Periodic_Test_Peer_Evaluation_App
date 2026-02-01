import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getTestStatus } from "@/lib/utils";
import type { Database } from "@/types/supabase";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";

type Test = Database["public"]["Tables"]["tests"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminTestsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string; status?: string };
}) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    return <ErrorState message="Failed to connect to database" />;
  }

  const searchQuery = searchParams?.q?.trim();
  const statusFilter = searchParams?.status?.trim();
  const parsedPage = Number(searchParams?.page);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get tests
  let testsQuery = supabase
    .from("tests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchQuery) {
    testsQuery = testsQuery.or(
      `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
    );
  }

  if (statusFilter) {
    testsQuery = testsQuery.eq("status", statusFilter);
  }

  const { data: tests, error: testsError, count } = await testsQuery;

  if (testsError) {
    console.error("Tests fetch error:", testsError);
    return (
      <ErrorState message="Could not load tests. Please check database connection." />
    );
  }

  // Get attempt counts efficiently
  // Instead of fetching every single attempt record, we do one query and count
  // This is a trade-off. For hundreds of attempts it's fine. For millions, we'd need a view or RPC.
  const testIds = (tests || []).map((t: Test) => t.id);
  let countByTest = new Map<string, number>();
  let pendingByTest = new Map<string, number>();

  if (testIds.length > 0) {
    try {
      // Only select test_id to keep payload small
      const { data: attemptCounts, error: countError } = await supabase
        .from("attempts")
        .select("test_id")
        .in("test_id", testIds);

      if (!countError && attemptCounts) {
        attemptCounts.forEach((a: any) => {
          countByTest.set(a.test_id, (countByTest.get(a.test_id) || 0) + 1);
        });
      }

      const { data: pendingAllocations } = await supabase
        .from("allocations")
        .select("status, attempt:attempts(test_id)")
        .in("status", ["pending", "in_progress"]);

      (pendingAllocations || []).forEach((row: any) => {
        const testId = row.attempt?.test_id;
        if (testId && testIds.includes(testId)) {
          pendingByTest.set(testId, (pendingByTest.get(testId) || 0) + 1);
        }
      });
    } catch (e) {
      console.error("Attempt counts fetch error:", e);
    }
  }

  const totalRows = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Manage <span className="text-gradient">Tests</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage periodic tests
          </p>
        </div>
        <Link href="/admin/tests/new">
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <form className="w-full max-w-md">
          <input
            type="text"
            name="q"
            placeholder="Search by title or description..."
            defaultValue={searchQuery || ""}
            className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
          />
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
        </form>
      </div>

      {/* Tests Grid */}
      <div className="grid gap-4">
        {!tests || tests.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Tests Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first test to get started
              </p>
              <Link href="/admin/tests/new">
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          (tests as Test[]).map((test: Test) => {
            const status = getTestStatus(
              test.start_at,
              test.end_at,
              test.status,
            );
            const attemptCount = countByTest.get(test.id) || 0;
            const pendingCount = pendingByTest.get(test.id) || 0;

            return (
              <Card key={test.id} hover>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">
                          {test.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3 sm:mb-4">
                        {test.description || "No description"}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {test.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          {test.total_marks} marks
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          {attemptCount} attempts
                        </span>
                        {pendingCount > 0 && (
                          <span className="flex items-center gap-1 text-warning">
                            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            {pendingCount} pending
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {formatDate(test.start_at, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link href={`/admin/tests/${test.id}/analytics`}>
                        <Button variant="ghost" size="sm">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/tests/${test.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/tests/${test.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={`/admin/tests?page=${Math.max(1, page - 1)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`px-3 py-1 rounded-md border ${
                page === 1
                  ? "pointer-events-none text-muted-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Previous
            </a>
            <a
              href={`/admin/tests?page=${Math.min(totalPages, page + 1)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`px-3 py-1 rounded-md border ${
                page >= totalPages
                  ? "pointer-events-none text-muted-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Next
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-destructive">
          Error Loading Tests
        </h3>
        <p className="text-muted-foreground mt-2">{message}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() =>
            typeof window !== "undefined" && window.location.reload()
          }
        >
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
