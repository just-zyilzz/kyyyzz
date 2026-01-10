/**
 * Service Worker for kfocean Media Downloader PWA
 * Provides offline functionality and improves load performance
 */

const CACHE_VERSION = 'v1.0.1-20260106';
const CACHE_NAME = `kfocean-cache-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/robots.txt',
    '/sitemap.xml'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activation complete');
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Different strategies for different types of requests
    if (request.url.includes('/api/')) {
        // API calls - Network first, fallback to cache
        event.respondWith(networkFirst(request));
    } else if (request.destination === 'document' || request.url.endsWith('.html') || request.url === url.origin + '/') {
        // HTML files - Network first to ensure latest version
        event.respondWith(networkFirst(request));
    } else {
        // Static assets (CSS, JS, images) - Cache first, fallback to network
        event.respondWith(cacheFirst(request));
    }
});

/**
 * Cache First Strategy - For static assets
 * Try cache first, if not found fetch from network and cache it
 */
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return cached;
    }

    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response && response.status === 200) {
            console.log('[Service Worker] Caching new resource:', request.url);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);

        // Return a custom offline page if available
        const offlineResponse = await cache.match('/index.html');
        if (offlineResponse) {
            return offlineResponse;
        }

        throw error;
    }
}

/**
 * Network First Strategy - For API calls
 * Try network first, fallback to cache if offline
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        // Don't cache API responses (always fetch fresh data)
        return response;
    } catch (error) {
        console.log('[Service Worker] Network failed, trying cache:', request.url);

        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }

        throw error;
    }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Received SKIP_WAITING message');
        self.skipWaiting();
    }
});

// Notify clients about new version available
self.addEventListener('install', (event) => {
    // Send message to all clients that a new version is available
    event.waitUntil(
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'NEW_VERSION_AVAILABLE',
                    version: CACHE_VERSION
                });
            });
        })
    );
});

console.log('[Service Worker] Loaded');
