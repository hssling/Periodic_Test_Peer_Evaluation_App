import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getTestStatus } from '@/lib/utils';
import { ArrowRight, Calendar, CheckCircle, Clock, FileText, Play } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentTestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  // Get all tests
  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .in('status', ['active', 'published', 'closed'])
    .order('start_at', { ascending: false });

  // Get user's attempts
  const { data: attempts } = await supabase
    .from('attempts')
    .select('*')
    .eq('student_id', profile!.id);

  const attemptsByTest = new Map(attempts?.map(a => [a.test_id, a]) || []);

  const categorizedTests = {
    active: [] as any[],
    upcoming: [] as any[],
    completed: [] as any[],
  };

  tests?.forEach(test => {
    const status = getTestStatus(test.start_at, test.end_at, test.status);
    const attempt = attemptsByTest.get(test.id);

    if (attempt?.status === 'submitted' || attempt?.status === 'evaluated') {
      categorizedTests.completed.push({ ...test, attempt });
    } else if (status === 'active') {
      categorizedTests.active.push({ ...test, attempt });
    } else if (status === 'upcoming') {
      categorizedTests.upcoming.push(test);
    } else if (status === 'ended') {
      categorizedTests.completed.push({ ...test, attempt });
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          My <span className="text-gradient">Tests</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          View and take your assigned tests
        </p>
      </div>

      {/* Active Tests */}
      {categorizedTests.active.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-success" />
            Active Now
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorizedTests.active.map(test => (
              <Card key={test.id} hover className="border-success/30 bg-success/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                      Active
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {test.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {test.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {test.total_marks} marks
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    Ends: {formatDate(test.end_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Link href={test.attempt ? `/student/tests/${test.id}/attempt` : `/student/tests/${test.id}`}>
                    <Button variant="gradient" className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      {test.attempt ? 'Continue Test' : 'Start Test'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Tests */}
      {categorizedTests.upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-info" />
            Upcoming
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorizedTests.upcoming.map(test => (
              <Card key={test.id} className="opacity-80">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-info/20 text-info">
                      Upcoming
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {test.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {test.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {test.total_marks} marks
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Starts: {formatDate(test.start_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Completed Tests */}
      {categorizedTests.completed.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-muted-foreground" />
            Completed
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorizedTests.completed.map(test => (
              <Card key={test.id} className="opacity-70">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {test.attempt?.status === 'evaluated' ? 'Evaluated' : test.attempt ? 'Submitted' : 'Ended'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {test.description || 'No description'}
                  </p>
                  {test.attempt && (
                    <Link href={`/student/results/${test.attempt.id}`}>
                      <Button variant="outline" className="w-full">
                        View Results
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {tests?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tests Available</h3>
            <p className="text-muted-foreground">
              You don't have any tests assigned yet. Check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
