'use client';

import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncIndicatorProps {
    status: 'pending' | 'syncing' | 'synced' | 'error';
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
    const config = {
        pending: {
            icon: Cloud,
            text: 'Saved locally',
            className: 'text-muted-foreground',
        },
        syncing: {
            icon: RefreshCw,
            text: 'Syncing...',
            className: 'text-info',
            animate: true,
        },
        synced: {
            icon: Check,
            text: 'Saved',
            className: 'text-success',
        },
        error: {
            icon: AlertCircle,
            text: 'Sync error',
            className: 'text-destructive',
        },
    };

    const current = config[status];
    const Icon = current.icon;

    return (
        <div className={cn('flex items-center gap-1.5 text-xs', current.className)}>
            <Icon className={cn('w-3.5 h-3.5', current.animate && 'animate-spin')} />
            <span>{current.text}</span>
        </div>
    );
}
