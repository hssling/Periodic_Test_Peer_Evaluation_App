'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Tables } from '@/types/supabase';

interface AnnouncementsBannerProps {
    announcements: Tables<'announcements'>[];
}

export function AnnouncementsBanner({ announcements }: AnnouncementsBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || announcements.length === 0) return null;

    const current = announcements[currentIndex];

    const nextAnnouncement = () => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4"
        >
            <div className="flex items-start gap-4">
                <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h4 className="font-semibold text-foreground">{current.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {current.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(current.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                    {announcements.length > 1 && (
                        <button
                            onClick={nextAnnouncement}
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                            title="Next announcement"
                        >
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                    )}
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Indicator dots */}
            {announcements.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                    {announcements.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${index === currentIndex
                                    ? 'w-6 bg-primary'
                                    : 'bg-primary/30 hover:bg-primary/50'
                                }`}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
