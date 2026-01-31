'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
        indicatorClassName?: string;
        variant?: 'default' | 'success' | 'warning' | 'danger';
    }
>(({ className, value, indicatorClassName, variant = 'default', ...props }, ref) => {
    const variantClasses = {
        default: 'bg-primary',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-destructive',
    };

    return (
        <ProgressPrimitive.Root
            ref={ref}
            className={cn(
                'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
                className
            )}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className={cn(
                    'h-full w-full flex-1 transition-all duration-500 ease-out',
                    variantClasses[variant],
                    indicatorClassName
                )}
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
