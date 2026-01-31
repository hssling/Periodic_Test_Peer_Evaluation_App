import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { ArrowRight, BarChart3, Target, TrendingUp, Trophy } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  // Get all attempts with test info
  const { data: attempts } = await supabase
    .from('attempts')
    .select('*, test:tests(*)')
    .eq('student_id', (profile as any)!.id)
    .in('status', ['submitted', 'evaluated'])
    .order('submitted_at', { ascending: false });

  const allAttempts = (attempts || []) as any[];

  // Calculate stats
  const totalAttempts = allAttempts.length;
  const evaluatedAttempts = allAttempts.filter(a => a.status === 'evaluated');
  const averageScore = evaluatedAttempts.length > 0
    ? Math.round(evaluatedAttempts.reduce((acc, a) => acc + ((a.auto_score || 0) / (a.test?.total_marks || 1)) * 100, 0) / evaluatedAttempts.length)
    : 0;
  const highestScore = evaluatedAttempts.length > 0
    ? Math.round(Math.max(...evaluatedAttempts.map(a => ((a.auto_score || 0) / (a.test?.total_marks || 1)) * 100)))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My <span className="text-gradient">Results</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          View your test scores and performance history
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Tests Taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{averageScore}%</p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{highestScore}%</p>
            <p className="text-xs text-muted-foreground">Highest Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">{evaluatedAttempts.length}</p>
            <p className="text-xs text-muted-foreground">Evaluated</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test History</CardTitle>
        </CardHeader>
        <CardContent>
          {allAttempts.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No test results yet</p>
              <p className="text-sm text-muted-foreground">Complete a test to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allAttempts.map((attempt) => {
                const percentage = attempt.test?.total_marks
                  ? Math.round(((attempt.auto_score || 0) / attempt.test.total_marks) * 100)
                  : 0;
                
                return (
                  <Link key={attempt.id} href={`/student/results/${attempt.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <h3 className="font-medium">{attempt.test?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {attempt.submitted_at && formatDate(attempt.submitted_at, { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`text-lg font-bold ${
                            percentage >= 80 ? 'text-success' :
                            percentage >= 60 ? 'text-warning' :
                            'text-destructive'
                          }`}>
                            {attempt.status === 'evaluated' ? `${percentage}%` : '-'}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {attempt.auto_score || 0}/{attempt.test?.total_marks}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          attempt.status === 'evaluated' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {attempt.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
