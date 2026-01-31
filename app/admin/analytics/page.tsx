import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { Award, BarChart3, Clock, FileText, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Get tests count
  const { count: testsCount } = await supabase.from('tests').select('*', { count: 'exact', head: true });
  
  // Get students count
  const { count: studentsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  
  // Get attempts count
  const { count: attemptsCount } = await supabase.from('attempts').select('*', { count: 'exact', head: true });
  
  // Get evaluations count
  const { count: evaluationsCount } = await supabase.from('evaluations').select('*', { count: 'exact', head: true });

  // Get completion rate
  const { count: submittedCount } = await supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted');

  const completionRate = attemptsCount ? Math.round(((submittedCount || 0) / attemptsCount) * 100) : 0;

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

      {/* Charts placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chart visualization coming soon</p>
                <p className="text-sm">Integrate with a charting library like Recharts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluation Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Distribution chart coming soon</p>
                <p className="text-sm">View score distributions and patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <p className="text-lg font-bold text-info">97%</p>
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
