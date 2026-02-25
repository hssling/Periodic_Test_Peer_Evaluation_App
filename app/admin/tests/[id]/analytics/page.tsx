import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import {
    ArrowLeft,
    Award,
    BarChart3,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminTestAnalyticsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createClient();

  // Get test
  const { data: test, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !test) {
    notFound();
  }

  const testData = test as any;

  // Get all attempts with scores
  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      `
      id,
      status,
      final_score,
      student:profiles(name, batch, section),
      allocations(
        status,
        evaluation:evaluations(total_score)
      )
    `,
    )
    .eq('test_id', params.id)
    .in('status', ['submitted', 'evaluated']);

  const allAttempts = (attempts || []).map((attempt: any) => {
    const evaluationScores =
      attempt.allocations
        ?.map((allocation: any) => {
          const evaluation = allocation.evaluation;
          return Array.isArray(evaluation)
            ? evaluation[0]?.total_score
            : evaluation?.total_score;
        })
        .filter((score: number | null | undefined) => score !== null && score !== undefined) || [];
    const pendingReviewers =
      attempt.allocations?.filter(
        (allocation: any) => allocation.status !== 'completed',
      ).length || 0;
    const computedScore =
      attempt.final_score !== null && attempt.final_score !== undefined
        ? attempt.final_score
        : evaluationScores.length > 0
          ? evaluationScores.reduce((sum: number, score: number) => sum + score, 0) /
            evaluationScores.length
          : null;
    return { ...attempt, computed_score: computedScore, pending_reviewers: pendingReviewers };
  });

  // Calculate analytics
  const totalAttempts = allAttempts.length;
  const evaluatedAttempts = allAttempts.filter(
    (attempt) => attempt.status === 'evaluated',
  );
  const scoredAttempts = allAttempts.filter(
    (attempt) => attempt.computed_score !== null,
  );

  const scores = scoredAttempts.map((attempt) => attempt.computed_score || 0);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Score distribution
  const distribution = {
    excellent: scoredAttempts.filter(a => (a.computed_score / testData.total_marks) >= 0.9).length,
    good: scoredAttempts.filter(a => (a.computed_score / testData.total_marks) >= 0.7 && (a.computed_score / testData.total_marks) < 0.9).length,
    average: scoredAttempts.filter(a => (a.computed_score / testData.total_marks) >= 0.5 && (a.computed_score / testData.total_marks) < 0.7).length,
    belowAverage: scoredAttempts.filter(a => (a.computed_score / testData.total_marks) < 0.5).length,
  };
  const distributionBase = scoredAttempts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/tests/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient">Analytics</span>: {testData.title}
          </h1>
          <p className="text-muted-foreground">
            Performance insights and statistics
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">{averageScore}/{testData.total_marks}</p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{highestScore}/{testData.total_marks}</p>
            <p className="text-xs text-muted-foreground">Highest Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">{evaluatedAttempts.length}</p>
            <p className="text-xs text-muted-foreground">Evaluated</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-success"></span>
                    Excellent (90%+)
                  </span>
                  <span className="font-medium">{distribution.excellent}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-success" 
                    style={{ width: `${distributionBase > 0 ? (distribution.excellent / distributionBase) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-info"></span>
                    Good (70-89%)
                  </span>
                  <span className="font-medium">{distribution.good}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-info" 
                    style={{ width: `${distributionBase > 0 ? (distribution.good / distributionBase) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-warning"></span>
                    Average (50-69%)
                  </span>
                  <span className="font-medium">{distribution.average}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-warning" 
                    style={{ width: `${distributionBase > 0 ? (distribution.average / distributionBase) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-destructive"></span>
                    Below Average (&lt;50%)
                  </span>
                  <span className="font-medium">{distribution.belowAverage}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-destructive" 
                    style={{ width: `${distributionBase > 0 ? (distribution.belowAverage / distributionBase) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoredAttempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No scored attempts yet</p>
            ) : (
              <div className="space-y-3">
                {scoredAttempts
                  .sort((a, b) => (b.computed_score || 0) - (a.computed_score || 0))
                  .slice(0, 5)
                  .map((attempt, idx) => (
                    <div key={attempt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-warning text-warning-foreground' :
                        idx === 1 ? 'bg-slate-300 text-slate-700' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{attempt.student?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.student?.batch && `Batch ${attempt.student.batch}`}
                        </p>
                      </div>
                      <span className="font-bold text-success">
                        {Math.round(attempt.computed_score || 0)}/{testData.total_marks}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {allAttempts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Student</th>
                    <th className="text-left py-3 px-2 hidden sm:table-cell">Batch</th>
                    <th className="text-center py-3 px-2">Score</th>
                    <th className="text-center py-3 px-2">Percentage</th>
                    <th className="text-center py-3 px-2">Pending Reviews</th>
                    <th className="text-center py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttempts.map((attempt) => {
                    const scoreValue = attempt.computed_score || 0;
                    const percentage = Math.round((scoreValue / testData.total_marks) * 100);
                    return (
                      <tr key={attempt.id} className="border-b">
                        <td className="py-3 px-2 font-medium">{attempt.student?.name}</td>
                        <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">
                          {attempt.student?.batch || '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {attempt.computed_score !== null
                            ? `${Math.round(scoreValue)}/${testData.total_marks}`
                            : '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-medium ${
                            percentage >= 80 ? 'text-success' :
                            percentage >= 60 ? 'text-warning' :
                            'text-destructive'
                          }`}>
                            {attempt.computed_score !== null ? `${percentage}%` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {attempt.pending_reviewers || 0}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            attempt.status === 'evaluated' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

