import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, FileText, History, Shield, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

// This would typically fetch from an audit_logs table
// For now, we'll create a placeholder with simulated data
export default async function AdminAuditLogsPage() {
  const supabase = await createClient();

  // Get recent tests as activity
  const { data: recentTests } = await supabase
    .from('tests')
    .select('id, title, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent attempts
  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select('id, created_at, status, student:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  // Combine into simulated logs
  const logs: any[] = [];
  
  (recentTests || []).forEach((test: any) => {
    logs.push({
      id: `test-${test.id}`,
      action: 'test_created',
      description: `Test "${test.title}" was created`,
      timestamp: test.created_at,
      type: 'info',
    });
  });

  (recentAttempts || []).forEach((attempt: any) => {
    logs.push({
      id: `attempt-${attempt.id}`,
      action: 'test_attempted',
      description: `${attempt.student?.name || 'Student'} ${attempt.status === 'submitted' ? 'submitted' : 'started'} a test`,
      timestamp: attempt.created_at,
      type: attempt.status === 'submitted' ? 'success' : 'info',
    });
  });

  // Sort by timestamp
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <FileText className="w-4 h-4 text-info" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Audit <span className="text-gradient">Logs</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Track system activities and user actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-info" />
            <div>
              <p className="text-2xl font-bold">{recentTests?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Tests Created</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{recentAttempts?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Test Attempts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Security Events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity logs yet</p>
          ) : (
            <div className="space-y-4">
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="mt-1">{getIcon(log.type)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{log.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(log.timestamp, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    log.type === 'success' ? 'bg-success/20 text-success' :
                    log.type === 'warning' ? 'bg-warning/20 text-warning' :
                    log.type === 'error' ? 'bg-destructive/20 text-destructive' :
                    'bg-info/20 text-info'
                  }`}>
                    {log.action.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
