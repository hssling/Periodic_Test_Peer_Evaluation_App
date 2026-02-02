import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, ClipboardList, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminEvaluationsPage({
  searchParams,
}: {
  searchParams?: { page?: string; status?: string };
}) {
  const supabase = await createClient();
  const parsedPage = Number(searchParams?.page);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const statusFilter = searchParams?.status;

  // Get all allocations with attempts and test info
  let allocationsQuery = supabase
    .from('allocations')
    .select(
      '*, attempt:attempts(*, test:tests(*), student:profiles(*)), evaluator:profiles(*), evaluation:evaluations(total_score, submitted_at)',
      { count: 'exact' },
    )
    .order('allocated_at', { ascending: false })
    .range(from, to);

  if (statusFilter) {
    allocationsQuery = allocationsQuery.eq('status', statusFilter);
  }

  const { data: allocations, count } = await allocationsQuery;

  const allAllocations = (allocations || []) as any[];
  const totalRows = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  
  const pending = allAllocations.filter(a => a.status === 'pending');
  const inProgress = allAllocations.filter(a => a.status === 'in_progress');
  const completed = allAllocations.filter(a => a.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Peer <span className="text-gradient">Evaluations</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage peer evaluation assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgress.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Evaluations */}
      {pending.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Evaluations ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((allocation: any) => (
                <div key={allocation.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{allocation.attempt?.test?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Evaluator: {allocation.evaluator?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deadline: {allocation.deadline ? formatDate(allocation.deadline) : 'No deadline'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Send Reminder
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          {allAllocations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No evaluations yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Test</th>
                    <th className="text-left py-3 px-2 hidden sm:table-cell">Evaluator</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">Submission</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">Score</th>
                    <th className="text-center py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2 hidden lg:table-cell">Allocated</th>
                    <th className="text-right py-3 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
              {allAllocations.map((allocation: any) => (
                <tr key={allocation.id} className="border-b">
                      <td className="py-3 px-2">{allocation.attempt?.test?.title}</td>
                      <td className="py-3 px-2 hidden sm:table-cell">{allocation.evaluator?.name}</td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        {allocation.attempt_id?.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        {allocation.evaluation?.total_score ?? "-"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          allocation.status === 'completed' ? 'bg-success/20 text-success' :
                          allocation.status === 'in_progress' ? 'bg-info/20 text-info' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {allocation.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">
                        {formatDate(allocation.allocated_at, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <a
                          href={`/admin/attempts/${allocation.attempt_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View Attempt
                        </a>
                      </td>
                    </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={`/admin/evaluations?page=${Math.max(1, page - 1)}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`px-3 py-1 rounded-md border ${
                page === 1
                  ? 'pointer-events-none text-muted-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Previous
            </a>
            <a
              href={`/admin/evaluations?page=${Math.min(totalPages, page + 1)}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`px-3 py-1 rounded-md border ${
                page >= totalPages
                  ? 'pointer-events-none text-muted-foreground'
                  : 'hover:bg-muted'
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
