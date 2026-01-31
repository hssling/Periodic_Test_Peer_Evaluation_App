import { offlineStorage, type DraftResponse, type SyncQueueItem } from './db';
import { getSupabaseClient } from '@/lib/supabase/client';

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second, exponential backoff

type SyncEventType = 'sync_start' | 'sync_progress' | 'sync_complete' | 'sync_error';

interface SyncEvent {
    type: SyncEventType;
    total?: number;
    current?: number;
    error?: string;
}

type SyncListener = (event: SyncEvent) => void;

class SyncEngine {
    private listeners: Set<SyncListener> = new Set();
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Automatically start sync when online
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.sync());

            // Periodic sync every 30 seconds
            this.startPeriodicSync();
        }
    }

    subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: SyncEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }

    startPeriodicSync(intervalMs: number = 30000): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            if (navigator.onLine) {
                this.sync();
            }
        }, intervalMs);
    }

    stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async sync(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) {
            return;
        }

        this.isSyncing = true;
        this.emit({ type: 'sync_start' });

        try {
            // Sync pending drafts
            await this.syncDrafts();

            // Process sync queue
            await this.processSyncQueue();

            this.emit({ type: 'sync_complete' });
        } catch (error: any) {
            console.error('Sync failed:', error);
            this.emit({ type: 'sync_error', error: error.message });
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncDrafts(): Promise<void> {
        const supabase = getSupabaseClient();
        const pendingDrafts = await offlineStorage.getPendingDrafts();

        if (pendingDrafts.length === 0) return;

        this.emit({ type: 'sync_progress', total: pendingDrafts.length, current: 0 });

        for (let i = 0; i < pendingDrafts.length; i++) {
            const draft = pendingDrafts[i];

            try {
                const { error } = await supabase
                    .from('responses')
                    .upsert({
                        attempt_id: draft.attemptId,
                        question_id: draft.questionId,
                        answer_text: draft.answerText || null,
                        selected_options: draft.selectedOptions || null,
                        saved_at: new Date(draft.savedAt).toISOString(),
                    }, {
                        onConflict: 'attempt_id,question_id',
                    });

                if (error) throw error;

                await offlineStorage.markDraftSynced(draft.id);
            } catch (error: any) {
                console.error('Failed to sync draft:', draft.id, error);
                await offlineStorage.markDraftError(draft.id, error.message);
            }

            this.emit({ type: 'sync_progress', total: pendingDrafts.length, current: i + 1 });
        }
    }

    private async processSyncQueue(): Promise<void> {
        const supabase = getSupabaseClient();
        const queue = await offlineStorage.getSyncQueue();

        for (const item of queue) {
            if (item.retryCount >= MAX_RETRIES) {
                // Move to dead letter queue or log
                console.error('Max retries exceeded for sync item:', item);
                await offlineStorage.removeSyncItem(item.id!);
                continue;
            }

            try {
                let result;

                switch (item.operation) {
                    case 'insert':
                        result = await supabase.from(item.table).insert(item.data);
                        break;
                    case 'update':
                        const { id, ...updateData } = item.data;
                        result = await supabase.from(item.table).update(updateData).eq('id', id);
                        break;
                    case 'delete':
                        result = await supabase.from(item.table).delete().eq('id', item.data.id);
                        break;
                }

                if (result.error) throw result.error;

                await offlineStorage.removeSyncItem(item.id!);
            } catch (error: any) {
                console.error('Failed to process sync item:', item, error);
                await offlineStorage.updateSyncRetry(item.id!, error.message);

                // Exponential backoff
                const delay = RETRY_DELAY_BASE * Math.pow(2, item.retryCount);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    // Save response with offline support
    async saveResponse(
        attemptId: string,
        questionId: string,
        response: { answerText?: string; selectedOptions?: string[] }
    ): Promise<{ synced: boolean; error?: string }> {
        // Always save to local storage first
        await offlineStorage.saveDraft({
            attemptId,
            questionId,
            answerText: response.answerText,
            selectedOptions: response.selectedOptions,
        });

        // If online, try to sync immediately
        if (navigator.onLine) {
            const supabase = getSupabaseClient();

            try {
                const { error } = await supabase
                    .from('responses')
                    .upsert({
                        attempt_id: attemptId,
                        question_id: questionId,
                        answer_text: response.answerText || null,
                        selected_options: response.selectedOptions || null,
                        saved_at: new Date().toISOString(),
                    }, {
                        onConflict: 'attempt_id,question_id',
                    });

                if (error) throw error;

                await offlineStorage.markDraftSynced(`${attemptId}-${questionId}`);
                return { synced: true };
            } catch (error: any) {
                console.error('Failed to sync response:', error);
                return { synced: false, error: error.message };
            }
        }

        return { synced: false, error: 'Offline - saved locally' };
    }

    // Update time spent with offline support
    async updateTimeSpent(attemptId: string, seconds: number): Promise<void> {
        await offlineStorage.updateTimeSpent(attemptId, seconds);

        if (navigator.onLine) {
            const supabase = getSupabaseClient();
            try {
                await supabase
                    .from('attempts')
                    .update({ time_spent_seconds: seconds })
                    .eq('id', attemptId);
            } catch (error) {
                console.error('Failed to sync time spent:', error);
                // Queue for later sync
                await offlineStorage.queueSync({
                    table: 'attempts',
                    operation: 'update',
                    data: { id: attemptId, time_spent_seconds: seconds },
                });
            }
        }
    }

    // Get sync status
    async getSyncStatus(): Promise<{
        pendingDrafts: number;
        queuedItems: number;
        isOnline: boolean;
    }> {
        const pendingDrafts = await offlineStorage.getPendingDrafts();
        const queue = await offlineStorage.getSyncQueue();

        return {
            pendingDrafts: pendingDrafts.length,
            queuedItems: queue.length,
            isOnline: navigator.onLine,
        };
    }
}

// Singleton instance
let syncEngineInstance: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
    if (!syncEngineInstance) {
        syncEngineInstance = new SyncEngine();
    }
    return syncEngineInstance;
}

export { SyncEngine };
