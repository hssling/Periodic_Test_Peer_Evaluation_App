/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Take control immediately
clientsClaim();

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// Background sync for failed requests
const bgSyncPlugin = new BackgroundSyncPlugin('syncQueue', {
    maxRetentionTime: 24 * 60, // Retry for up to 24 hours
});

// Cache strategies

// 1. Cache First for static assets (images, fonts, icons)
registerRoute(
    ({ request }) =>
        request.destination === 'image' ||
        request.destination === 'font' ||
        request.url.includes('/icons/'),
    new CacheFirst({
        cacheName: 'static-assets',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            }),
        ],
    })
);

// 2. Stale While Revalidate for CSS and JS
registerRoute(
    ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script',
    new StaleWhileRevalidate({
        cacheName: 'static-resources',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            }),
        ],
    })
);

// 3. Network First for API calls (with background sync for POST/PUT)
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
            }),
        ],
    })
);

// 4. Network First for Supabase REST API
registerRoute(
    ({ url }) => url.hostname.includes('supabase.co'),
    new NetworkFirst({
        cacheName: 'supabase-cache',
        networkTimeoutSeconds: 10,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 minutes
            }),
        ],
    })
);

// 5. Network First for HTML pages (app shell)
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 5,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

// Handle sync events for offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-responses') {
        event.waitUntil(syncResponses());
    }
});

async function syncResponses(): Promise<void> {
    // This will be handled by the SyncEngine in the app
    // The service worker just needs to wake up the sync process
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_WAKE_UP' });
    });
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options: NotificationOptions = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data.tag || 'default',
        data: data.url ? { url: data.url } : undefined,
        actions: data.actions || [],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.data?.url) {
        event.waitUntil(
            self.clients.openWindow(event.notification.data.url)
        );
    }
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Install event - preload critical resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('offline-fallback').then((cache) => {
            return cache.addAll([
                '/offline',
                '/icons/icon-192x192.png',
            ]);
        })
    );
});
