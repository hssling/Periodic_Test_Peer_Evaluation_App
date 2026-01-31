import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getTestStatus } from '@/lib/utils';
import { DashboardStats } from '@/components/student/dashboard-stats';
import { TestCard } from '@/components/student/test-card';
import { AnnouncementsBanner } from '@/components/shared/announcements-banner';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { Clock, FileText, CheckCircle, ListChecks } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

    // Get tests
    const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .in('status', ['published', 'active', 'closed'])
        .order('start_at', { ascending: false });

    // Get user's attempts
    const { data: attempts } = await supabase
        .from('attempts')
        .select('*, test:tests(*)')
        .eq('student_id', profile!.id);

    // Get pending evaluations
    const { data: allocations } = await supabase
        .from('allocations')
        .select('*, attempt:attempts(*, test:tests(*))')
        .eq('evaluator_id', profile!.id)
        .eq('status', 'pending');

    // Get announcements
    const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('target_role.is.null,target_role.eq.student')
        .order('created_at', { ascending: false })
        .limit(3);

    // Calculate stats
    const completedTests = attempts?.filter(a => a.status === 'submitted' || a.status === 'evaluated').length || 0;
    const pendingEvaluations = allocations?.length || 0;
    const activeTests = tests?.filter(t => getTestStatus(t.start_at, t.end_at, t.status) === 'active').length || 0;

    // Categorize tests
    const upcomingTests = tests?.filter(t => getTestStatus(t.start_at, t.end_at, t.status) === 'upcoming') || [];
    const activeTestsList = tests?.filter(t => getTestStatus(t.start_at, t.end_at, t.status) === 'active') || [];
    const completedTestsList = tests?.filter(t => getTestStatus(t.start_at, t.end_at, t.status) === 'ended') || [];

    // Check which tests user has attempted
    const attemptedTestIds = new Set(attempts?.map(a => a.test_id) || []);

    const stats = [
        {
            name: 'Active Tests',
            value: activeTests,
            icon: Clock,
            color: 'text-warning',
            bgColor: 'bg-warning/10',
        },
        {
            name: 'Completed',
            value: completedTests,
            icon: CheckCircle,
            color: 'text-success',
            bgColor: 'bg-success/10',
        },
        {
            name: 'Pending Evaluations',
            value: pendingEvaluations,
            icon: ListChecks,
            color: 'text-info',
            bgColor: 'bg-info/10',
        },
        {
            name: 'Total Tests',
            value: tests?.length || 0,
            icon: FileText,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, <span className="text-gradient">{profile?.name.split(' ')[0]}</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here's what's happening with your tests and evaluations.
                </p>
            </div>

            {/* Announcements */}
            {announcements && announcements.length > 0 && (
                <AnnouncementsBanner announcements={announcements} />
            )}

            {/* Stats Grid */}
            <Suspense fallback={<SkeletonDashboard />}>
                <DashboardStats stats={stats} />
            </Suspense>

            {/* Active Tests Section */}
            {activeTestsList.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-warning" />
                        Active Tests
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeTestsList.map((test) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                attempt={attempts?.find(a => a.test_id === test.id)}
                                status="active"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Pending Evaluations Section */}
            {pendingEvaluations > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-info" />
                        Pending Evaluations
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {allocations?.slice(0, 3).map((allocation) => (
                            <div
                                key={allocation.id}
                                className="p-4 rounded-xl border bg-card card-hover"
                            >
                                <h3 className="font-medium">{allocation.attempt?.test?.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Submission Code: {allocation.attempt_id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Deadline: {formatDate(allocation.deadline || '')}
                                </p>
                                <a
                                    href={`/student/evaluations/${allocation.id}`}
                                    className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
                                >
                                    Start Evaluation →
                                </a>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Tests Section */}
            {upcomingTests.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Upcoming Tests
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingTests.slice(0, 3).map((test) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                status="upcoming"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Completed Tests Section */}
            {completedTestsList.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        Recent Completed Tests
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {completedTestsList.slice(0, 3).map((test) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                attempt={attempts?.find(a => a.test_id === test.id)}
                                status="ended"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {tests?.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No tests available</h3>
                    <p className="text-muted-foreground mt-1">
                        Check back later for upcoming tests.
                    </p>
                </div>
            )}
        </div>
    );
}
