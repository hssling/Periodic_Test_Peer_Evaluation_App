import Dexie, { type Table } from 'dexie';

// Types for offline storage
export interface DraftResponse {
    id: string;
    attemptId: string;
    questionId: string;
    answerText?: string;
    selectedOptions?: string[];
    savedAt: number;
    syncedAt?: number;
    syncStatus: 'pending' | 'synced' | 'error';
}

export interface SyncQueueItem {
    id?: number;
    table: string;
    operation: 'insert' | 'update' | 'delete';
    data: Record<string, any>;
    retryCount: number;
    lastAttempt?: number;
    error?: string;
    createdAt: number;
}

export interface AttemptCache {
    id: string;
    testId: string;
    startedAt: number;
    timeSpentSeconds: number;
    lastSyncedAt?: number;
}

export interface TestCache {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    totalMarks: number;
    questions: any[];
    cachedAt: number;
}

// Define the database
class PeriodicTestDB extends Dexie {
    draftResponses!: Table<DraftResponse, string>;
    syncQueue!: Table<SyncQueueItem, number>;
    attemptCache!: Table<AttemptCache, string>;
    testCache!: Table<TestCache, string>;

    constructor() {
        super('PeriodicTestDB');

        this.version(1).stores({
            draftResponses: 'id, attemptId, questionId, syncStatus, savedAt',
            syncQueue: '++id, table, operation, createdAt, retryCount',
            attemptCache: 'id, testId, startedAt',
            testCache: 'id, cachedAt',
        });
    }
}

// Singleton instance
let dbInstance: PeriodicTestDB | null = null;

export function getDB(): PeriodicTestDB {
    if (!dbInstance) {
        dbInstance = new PeriodicTestDB();
    }
    return dbInstance;
}

// Helper functions for offline operations
export const offlineStorage = {
    // Draft Responses
    async saveDraft(response: Omit<DraftResponse, 'id' | 'savedAt' | 'syncStatus'>): Promise<void> {
        const db = getDB();
        const id = `${response.attemptId}-${response.questionId}`;

        await db.draftResponses.put({
            ...response,
            id,
            savedAt: Date.now(),
            syncStatus: 'pending',
        });
    },

    async getDrafts(attemptId: string): Promise<DraftResponse[]> {
        const db = getDB();
        return db.draftResponses.where('attemptId').equals(attemptId).toArray();
    },

    async markDraftSynced(id: string): Promise<void> {
        const db = getDB();
        await db.draftResponses.update(id, {
            syncStatus: 'synced',
            syncedAt: Date.now(),
        });
    },

    async markDraftError(id: string, error: string): Promise<void> {
        const db = getDB();
        await db.draftResponses.update(id, {
            syncStatus: 'error',
        });
    },

    async getPendingDrafts(): Promise<DraftResponse[]> {
        const db = getDB();
        return db.draftResponses.where('syncStatus').equals('pending').toArray();
    },

    async clearDrafts(attemptId: string): Promise<void> {
        const db = getDB();
        await db.draftResponses.where('attemptId').equals(attemptId).delete();
    },

    // Sync Queue
    async queueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<number> {
        const db = getDB();
        return db.syncQueue.add({
            ...item,
            retryCount: 0,
            createdAt: Date.now(),
        });
    },

    async getSyncQueue(): Promise<SyncQueueItem[]> {
        const db = getDB();
        return db.syncQueue.orderBy('createdAt').toArray();
    },

    async removeSyncItem(id: number): Promise<void> {
        const db = getDB();
        await db.syncQueue.delete(id);
    },

    async updateSyncRetry(id: number, error: string): Promise<void> {
        const db = getDB();
        const item = await db.syncQueue.get(id);
        if (item) {
            await db.syncQueue.update(id, {
                retryCount: item.retryCount + 1,
                lastAttempt: Date.now(),
                error,
            });
        }
    },

    // Attempt Cache
    async cacheAttempt(attempt: AttemptCache): Promise<void> {
        const db = getDB();
        await db.attemptCache.put(attempt);
    },

    async getAttemptCache(attemptId: string): Promise<AttemptCache | undefined> {
        const db = getDB();
        return db.attemptCache.get(attemptId);
    },

    async updateTimeSpent(attemptId: string, seconds: number): Promise<void> {
        const db = getDB();
        await db.attemptCache.update(attemptId, { timeSpentSeconds: seconds });
    },

    // Test Cache
    async cacheTest(test: TestCache): Promise<void> {
        const db = getDB();
        await db.testCache.put({
            ...test,
            cachedAt: Date.now(),
        });
    },

    async getTestCache(testId: string): Promise<TestCache | undefined> {
        const db = getDB();
        return db.testCache.get(testId);
    },

    async clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        const db = getDB();
        const cutoff = Date.now() - maxAgeMs;
        await db.testCache.where('cachedAt').below(cutoff).delete();
    },

    // Utility
    async clearAll(): Promise<void> {
        const db = getDB();
        await Promise.all([
            db.draftResponses.clear(),
            db.syncQueue.clear(),
            db.attemptCache.clear(),
            db.testCache.clear(),
        ]);
    },
};
