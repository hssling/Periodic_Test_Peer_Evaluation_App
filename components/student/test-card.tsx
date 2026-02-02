'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Calendar, Award, ArrowRight, CheckCircle, Play } from 'lucide-react';
import { LocalDateTime } from '@/components/shared/local-datetime';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Tables } from '@/types/supabase';

interface TestCardProps {
    test: Tables<'tests'>;
    attempt?: Tables<'attempts'> | null;
    status: 'upcoming' | 'active' | 'ended';
}

export function TestCard({ test, attempt, status }: TestCardProps) {
    const hasAttempted = !!attempt;
    const isSubmitted = attempt?.status === 'submitted' || attempt?.status === 'evaluated';
    const isEvaluated = attempt?.status === 'evaluated';
    const isInProgress = attempt?.status === 'in_progress';

    const getStatusBadge = () => {
        if (status === 'upcoming') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Calendar className="w-3 h-3" />
                    Upcoming
                </span>
            );
        }
        if (status === 'active') {
            if (isEvaluated) {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        <Award className="w-3 h-3" />
                        Results
                    </span>
                );
            }
            if (isSubmitted) {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        <CheckCircle className="w-3 h-3" />
                        Submitted
                    </span>
                );
            }
            if (isInProgress) {
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning animate-pulse">
                        <Play className="w-3 h-3" />
                        In Progress
                    </span>
                );
            }
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                    <Clock className="w-3 h-3" />
                    Available
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                Closed
            </span>
        );
    };

    const getActionButton = () => {
        if (status === 'upcoming') {
            return (
                <Button variant="outline" disabled className="w-full">
                    Starts{" "}
                    <LocalDateTime
                        value={test.start_at}
                        options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
                    />
                </Button>
            );
        }
        if (status === 'active') {
            if (isSubmitted) {
                return (
                    <Link href={`/student/results/${attempt?.id}`}>
                        <Button variant="secondary" className="w-full">
                            View Results
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                );
            }
            if (isInProgress) {
                return (
                    <Link href={`/student/tests/${test.id}/attempt`}>
                        <Button variant="warning" className="w-full">
                            Continue Test
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                );
            }
            return (
                <Link href={`/student/tests/${test.id}`}>
                    <Button variant="gradient" className="w-full">
                        Start Test
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            );
        }
        // Ended
        if (hasAttempted) {
            return (
                <Link href={`/student/results/${attempt?.id}`}>
                    <Button variant="secondary" className="w-full">
                        View Results
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            );
        }
        return (
            <Button variant="outline" disabled className="w-full">
                Not Attempted
            </Button>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border bg-card overflow-hidden card-hover"
        >
            {/* Header with gradient */}
            <div className="h-2 bg-gradient-to-r from-primary to-accent" />

            <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-semibold line-clamp-2">{test.title}</h3>
                    {getStatusBadge()}
                </div>

                {test.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {test.description}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="w-4 h-4" />
                        <span>{test.total_marks} marks</span>
                    </div>
                </div>

                {/* Progress for in-progress attempts */}
                {isInProgress && attempt?.time_spent_seconds && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Time spent</span>
                            <span>{formatDuration(attempt.time_spent_seconds)}</span>
                        </div>
                        <Progress
                            value={Math.min((attempt.time_spent_seconds / (test.duration_minutes * 60)) * 100, 100)}
                            variant={attempt.time_spent_seconds > test.duration_minutes * 60 * 0.8 ? 'warning' : 'default'}
                        />
                    </div>
                )}

                {/* Date info */}
                <div className="text-xs text-muted-foreground mb-4">
                    {status === 'upcoming' && (
                        <p>
                            Starts: <LocalDateTime value={test.start_at} />
                        </p>
                    )}
                    {status === 'active' && (
                        <p>
                            Ends: <LocalDateTime value={test.end_at} />
                        </p>
                    )}
                    {status === 'ended' && attempt?.submitted_at && (
                        <p>
                            Submitted: <LocalDateTime value={attempt.submitted_at} />
                        </p>
                    )}
                </div>

                {getActionButton()}
            </div>
        </motion.div>
    );
}
