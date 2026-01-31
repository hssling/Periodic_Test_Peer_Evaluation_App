import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getTestStatus } from '@/lib/utils';
import type { Database } from '@/types/supabase';
import {
    BarChart3, Calendar,
    Clock,
    FileText,
    Pencil,
    Plus,
    Users
} from 'lucide-react';
import Link from 'next/link';

type Test = Database['public']['Tables']['tests']['Row'];
type Attempt = Database['public']['Tables']['attempts']['Row'];

export const dynamic = 'force-dynamic';

export default async function AdminTestsPage() {
  const supabase = await createClient();
  
  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false });

  // Get attempt counts for each test
  const testIds = (tests || []).map((t: Test) => t.id);
  
  let countByTest = new Map<string, number>();
  
  if (testIds.length > 0) {
    const { data: attemptCounts } = await supabase
      .from('attempts')
      .select('test_id')
      .in('test_id', testIds);

    (attemptCounts || []).forEach((a: Pick<Attempt, 'test_id'>) => {
      countByTest.set(a.test_id, (countByTest.get(a.test_id) || 0) + 1);
    });
  }

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

      {/* Tests Grid */}
      <div className="grid gap-4">
        {(!tests || tests.length === 0) ? (
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
            const status = getTestStatus(test.start_at, test.end_at, test.status);
            const attemptCount = countByTest.get(test.id) || 0;

            return (
              <Card key={test.id} hover>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">{test.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          status === 'active' ? 'bg-success/20 text-success' :
                          status === 'upcoming' ? 'bg-info/20 text-info' :
                          status === 'draft' ? 'bg-muted text-muted-foreground' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3 sm:mb-4">
                        {test.description || 'No description'}
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
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          {formatDate(test.start_at, { month: 'short', day: 'numeric' })}
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
    </div>
  );
}
