import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, ClipboardCheck, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentEvaluationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  // Get allocations assigned to this user
  const { data: allocations } = await supabase
    .from('allocations')
    .select(`
      *,
      attempt:attempts(
        *,
        test:tests(*),
        student:profiles(name, roll_no)
      ),
      evaluation:evaluations(*)
    `)
    .eq('evaluator_id', profile!.id)
    .order('allocated_at', { ascending: false });

  const pendingAllocations = allocations?.filter(a => a.status === 'pending' || a.status === 'in_progress') || [];
  const completedAllocations = allocations?.filter(a => a.status === 'completed') || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Peer <span className="text-gradient">Evaluations</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and evaluate your assigned submissions
        </p>
      </div>

      {/* Pending Evaluations */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Pending ({pendingAllocations.length})
        </h2>
        
        {pendingAllocations.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">No pending evaluations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingAllocations.map(allocation => (
              <Card key={allocation.id} hover className="border-warning/30">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {allocation.attempt?.test?.title}
                    </CardTitle>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>Submission Code: <span className="font-mono">Submission-{allocation.attempt_id.slice(0, 8)}</span></p>
                    <p>Total Marks: {allocation.attempt?.test?.total_marks}</p>
                    {allocation.deadline && (
                      <p className="text-warning">
                        Deadline: {formatDate(allocation.deadline, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <Link href={`/student/evaluate/${allocation.id}`}>
                    <Button variant="gradient" className="w-full">
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Start Evaluation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed Evaluations */}
      {completedAllocations.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Completed ({completedAllocations.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedAllocations.map(allocation => {
              const evaluation = Array.isArray(allocation.evaluation)
                ? allocation.evaluation[0]
                : allocation.evaluation;
              return (
              <Card key={allocation.id} className="opacity-70">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {allocation.attempt?.test?.title}
                    </CardTitle>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                      Completed
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Submission Code: <span className="font-mono">Submission-{allocation.attempt_id.slice(0, 8)}</span></p>
                    <p>Score Given: {evaluation?.total_score ?? '-'}/{allocation.attempt?.test?.total_marks}</p>
                    <p>Submitted: {evaluation?.submitted_at ? formatDate(evaluation.submitted_at, { month: 'short', day: 'numeric' }) : '-'}</p>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
