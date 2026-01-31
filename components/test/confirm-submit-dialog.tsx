'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmSubmitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    answeredCount: number;
    totalCount: number;
}

export function ConfirmSubmitDialog({
    open,
    onOpenChange,
    onConfirm,
    isSubmitting,
    answeredCount,
    totalCount,
}: ConfirmSubmitDialogProps) {
    const unanswered = totalCount - answeredCount;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Submit Test?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            You are about to submit your test. This action cannot be undone.
                        </p>
                        <div className="p-4 rounded-lg bg-muted mt-4">
                            <div className="flex justify-between text-sm">
                                <span>Questions answered:</span>
                                <span className="font-medium">{answeredCount} / {totalCount}</span>
                            </div>
                            {unanswered > 0 && (
                                <div className="flex justify-between text-sm text-warning mt-2">
                                    <span>Unanswered questions:</span>
                                    <span className="font-medium">{unanswered}</span>
                                </div>
                            )}
                        </div>
                        {unanswered > 0 && (
                            <p className="text-sm text-warning">
                                ⚠️ You have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}.
                                Are you sure you want to submit?
                            </p>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>
                        Continue editing
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-primary to-accent"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Yes, submit test'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
