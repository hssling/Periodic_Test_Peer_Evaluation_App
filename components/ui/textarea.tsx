import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
    disablePaste?: boolean;
    onPasteAttempt?: () => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, disablePaste, onPasteAttempt, ...props }, ref) => {
        const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            if (disablePaste) {
                e.preventDefault();
                onPasteAttempt?.();
                return;
            }
            props.onPaste?.(e);
        };

        const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
            if (disablePaste) {
                e.preventDefault();
                onPasteAttempt?.();
                return;
            }
            props.onDrop?.(e);
        };

        const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
            if (disablePaste) {
                e.preventDefault();
                return;
            }
            props.onContextMenu?.(e);
        };

        return (
            <div className="relative">
                <textarea
                    className={cn(
                        'flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-y',
                        error && 'border-destructive focus-visible:ring-destructive',
                        disablePaste && 'paste-blocked',
                        className
                    )}
                    ref={ref}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onContextMenu={handleContextMenu}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-sm text-destructive">{error}</p>
                )}
                {disablePaste && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Paste and drag-drop are disabled for this field
                    </p>
                )}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';

export { Textarea };
