import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  History,
  Shield,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();

  const [
    logsRes,
    totalCountRes,
    startedCountRes,
    submittedCountRes,
    evaluationCountRes,
  ] = await Promise.all([
    supabase
      .from('audit_logs')
      .select(
        'id, action_type, payload, created_at, user:profiles(name, role)',
      )
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'test_started'),
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'test_submitted'),
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'evaluation_submitted'),
  ]);

  const rawLogs = logsRes.data || [];

  const getLogMeta = (actionType: string) => {
    switch (actionType) {
      case 'test_started':
        return { label: 'test started', type: 'info' };
      case 'test_submitted':
        return { label: 'test submitted', type: 'success' };
      case 'evaluation_submitted':
        return { label: 'evaluation submitted', type: 'success' };
      case 'allocation_created':
        return { label: 'allocations created', type: 'info' };
      case 'allocation_failed':
        return { label: 'allocation failed', type: 'error' };
      default:
        return {
          label: actionType.replace(/_/g, ' '),
          type: actionType.includes('fail') ? 'error' : 'info',
        };
    }
  };

  const formatContext = (payload: any) => {
    if (!payload || typeof payload !== 'object') return null;
    const attemptId = payload.attempt_id as string | undefined;
    const testId = payload.test_id as string | undefined;
    const evaluationId = payload.evaluation_id as string | undefined;
    const allocationId = payload.allocation_id as string | undefined;
    const parts = [];
    if (attemptId) parts.push(`Attempt ${attemptId.slice(0, 8)}`);
    if (testId) parts.push(`Test ${testId.slice(0, 8)}`);
    if (evaluationId) parts.push(`Evaluation ${evaluationId.slice(0, 8)}`);
    if (allocationId) parts.push(`Allocation ${allocationId.slice(0, 8)}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const logs = rawLogs.map((log) => {
    const meta = getLogMeta(log.action_type);
    const actor = log.user?.name || 'System';
    let description = '';
    switch (log.action_type) {
      case 'test_started':
        description = `${actor} started a test`;
        break;
      case 'test_submitted':
        description = `${actor} submitted a test`;
        break;
      case 'evaluation_submitted':
        description = `${actor} submitted an evaluation`;
        break;
      case 'allocation_created':
        description = 'Peer evaluations were allocated';
        break;
      case 'allocation_failed':
        description = 'Peer allocation failed';
        break;
      default:
        description = `${actor} performed ${meta.label}`;
        break;
    }

    return {
      id: log.id,
      action: meta.label,
      description,
      timestamp: log.created_at,
      type: meta.type,
      context: formatContext(log.payload),
    };
  });

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
              <p className="text-2xl font-bold">{totalCountRes.count || 0}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-info" />
            <div>
              <p className="text-2xl font-bold">{startedCountRes.count || 0}</p>
              <p className="text-xs text-muted-foreground">Tests Started</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{submittedCountRes.count || 0}</p>
              <p className="text-xs text-muted-foreground">Tests Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{evaluationCountRes.count || 0}</p>
              <p className="text-xs text-muted-foreground">Evaluations</p>
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
                    {log.context && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.context}
                      </p>
                    )}
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
                    {log.action.replace(/_/g, ' ')}
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
