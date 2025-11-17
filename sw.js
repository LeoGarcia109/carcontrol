// Service Worker para CarControl - Mobile Driver
// Versão: 1.0.4 - FORCE CACHE CLEANUP
// Suporte offline com cache de assets e Background Sync
// FIX: Limpeza total de cache antigo + Network-First para JS versionado

const CACHE_VERSION = 'carcontrol-v1.0.4';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_API = `${CACHE_VERSION}-api`;
const FALLBACK_FAVICON_BASE64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcpH/83KR//Nykf/wAAAAAAAAAAAAAAADcpH/83KR//Nykf/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcpH/8nGBH/JxgR/ycYEf83KR//AAAAADcpH/8nGBH/JxgR/ycYEf83KR//AAAAAAAAAAAAAAAAAAAAAAAAAAA3KR//JxgR/6+jnP8nGBH/Nykf/69AHrQ3KR//JxgR/6+jnP8nGBH/Nykf/wAAAAAAAAAAAAAAAAAAAAD2bCv/azAY/2swGP9rMBj/azAY/2swGP9rMBj/azAY/2swGP9rMBj/azAY/zcpH/8AAAAAAAAAAAAAAAAAAAAA2E4d/9hOHf/YTh3/2E4d/9hOHf/YTh3/2E4d/9hOHf/YTh3/2E4d/9hOHf/YTh3/AAAAAAAAAAAAAAAAAAAAAE3T/P//jU///41P//+NT///jU///41P//+NT///jU///41P//+NT///jU//TdP8/wAAAAAAAAAAAAAAAAAAAAD/fz///38///ZsK//2bCv/9mwr//ZsK//2bCv/9mwr//ZsK//2bCv//38///9/P/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/fz////Xh3P/14dz/9eHc//Xh3P/14dz/9eHc/38//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/38////14dz/9eHc//Xh3P/14dz/9eHc//Xh3P9/P/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9/P///fz///38///9/P///fz///38///9/P///fz//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

// Assets estáticos para cache (offline-first)
// NOTA: Arquivos JS com versionamento (?v=X) não devem estar aqui
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/mobile-driver.html',
    '/dashboard.html',
    '/css/styles.css',
    '/css/mobile-driver.css',
    '/js/api.js',
    '/js/auth.js',
    // '/js/mobile-driver.js', // REMOVIDO: usa ?v= dinâmico, deve usar Network-First
    '/js/gps-tracking.js',
    '/js/main.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// API endpoints que devem ser cacheados
const CACHEABLE_API_ENDPOINTS = [
    '/vehicles',
    '/drivers',
    '/destinations',
    '/usage'
];

// ===========================
// INSTALL EVENT
// ===========================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting(); // Ativa imediatamente
            })
            .catch(error => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

// ===========================
// ACTIVATE EVENT
// ===========================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...', CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Remover caches antigos
                        if (cacheName.startsWith('carcontrol-') &&
                            cacheName !== CACHE_STATIC &&
                            cacheName !== CACHE_DYNAMIC &&
                            cacheName !== CACHE_API) {
                            console.log('[SW] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activated');
                return self.clients.claim(); // Assume controle imediatamente
            })
    );
});

// ===========================
// FETCH EVENT - ESTRATÉGIAS DE CACHE
// ===========================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições que não sejam GET
    if (request.method !== 'GET') {
        return;
    }

    // Tratamento especial para favicon
    if (url.pathname === '/favicon.ico') {
        event.respondWith(handleFaviconRequest(request));
        return;
    }

    // Estratégia especial: Arquivos JS com versionamento (?v=) devem usar Network-First
    if (url.pathname.endsWith('.js') && url.search.includes('?v=')) {
        event.respondWith(networkFirstWithCache(request, CACHE_DYNAMIC));
        return;
    }

    // Estratégia 1: Cache-First para assets estáticos
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, CACHE_STATIC));
        return;
    }

    // Estratégia 2: Network-First com fallback para API endpoints
    if (isAPIRequest(url)) {
        event.respondWith(networkFirstWithCache(request, CACHE_API));
        return;
    }

    // Estratégia 3: Network-First para páginas HTML
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirstWithCache(request, CACHE_DYNAMIC));
        return;
    }

    // Default: Network-only
    event.respondWith(fetch(request));
});

// ===========================
// BACKGROUND SYNC EVENT
// ===========================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync event:', event.tag);

    if (event.tag === 'sync-pending-data') {
        event.waitUntil(syncPendingData());
    }

    if (event.tag === 'sync-gps-queue') {
        event.waitUntil(syncGPSQueue());
    }
});

// ===========================
// MESSAGE EVENT - Comunicação com app
// ===========================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        event.waitUntil(clearAllCaches());
    }

    if (event.data.action === 'syncNow') {
        event.waitUntil(syncPendingData());
    }
});

// ===========================
// CACHE STRATEGIES
// ===========================

/**
 * Cache-First Strategy
 * Busca no cache primeiro, fallback para network
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        console.log('[SW] Cache hit:', request.url);
        return cached;
    }

    try {
        console.log('[SW] Cache miss, fetching:', request.url);
        const response = await fetch(request);

        // Cache da resposta se for bem sucedida
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Retornar página offline se disponível
        return cache.match('/offline.html') || new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Network-First Strategy com fallback para cache
 * Tenta network primeiro, fallback para cache se falhar
 */
async function networkFirstWithCache(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const response = await fetch(request);

        // Cache da resposta se for bem sucedida
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cached = await cache.match(request);

        if (cached) {
            return cached;
        }

        // Se for API, retornar resposta vazia com dados do IndexedDB
        if (isAPIRequest(new URL(request.url))) {
            return new Response(JSON.stringify({
                success: true,
                data: [],
                offline: true,
                message: 'Dados carregados do cache local'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        throw error;
    }
}

// ===========================
// SYNC FUNCTIONS
// ===========================

/**
 * Sincronizar dados pendentes (rotas, despesas, finalizações)
 */
async function syncPendingData() {
    console.log('[SW] Starting sync of pending data...');

    try {
        // Notificar clientes que sincronização começou
        await notifyClients({ type: 'SYNC_STARTED' });

        // Aguardar o sync manager do app fazer o trabalho
        // O SW apenas dispara o evento, a lógica fica no sync-manager.js

        await notifyClients({ type: 'SYNC_COMPLETED' });
        console.log('[SW] Sync completed successfully');

        return Promise.resolve();
    } catch (error) {
        console.error('[SW] Sync failed:', error);
        await notifyClients({
            type: 'SYNC_FAILED',
            error: error.message
        });
        return Promise.reject(error);
    }
}

/**
 * Sincronizar fila de GPS em lote
 */
async function syncGPSQueue() {
    console.log('[SW] Starting GPS queue sync...');

    try {
        await notifyClients({ type: 'GPS_SYNC_STARTED' });

        // Lógica de sincronização delegada ao sync-manager.js

        await notifyClients({ type: 'GPS_SYNC_COMPLETED' });
        return Promise.resolve();
    } catch (error) {
        console.error('[SW] GPS sync failed:', error);
        return Promise.reject(error);
    }
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Verificar se é um asset estático
 */
function isStaticAsset(pathname) {
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ico'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Verificar se é uma requisição de API
 */
function isAPIRequest(url) {
    return url.hostname === 'localhost' &&
           (url.port === '5000' || url.pathname.startsWith('/api/'));
}

/**
 * Limpar todos os caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

/**
 * Notificar todos os clientes (páginas abertas)
 */
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
        client.postMessage(message);
    });
}

/**
 * Verificar se endpoint deve ser cacheado
 */
function shouldCacheAPIEndpoint(pathname) {
    return CACHEABLE_API_ENDPOINTS.some(endpoint =>
        pathname.includes(endpoint)
    );
}

/**
 * Tratar fetch do favicon com fallback inline
 */
async function handleFaviconRequest(request) {
    try {
        const cache = await caches.open(CACHE_STATIC);
        const cached = await cache.match('/favicon.ico');
        if (cached) {
            return cached;
        }

        const response = await fetch(request);
        if (response && response.ok) {
            cache.put('/favicon.ico', response.clone());
            return response;
        }
    } catch (error) {
        console.warn('[SW] Favicon fetch failed, using fallback:', error);
    }

    return faviconFallbackResponse();
}

function faviconFallbackResponse() {
    const binaryString = atob(FALLBACK_FAVICON_BASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Response(bytes, {
        headers: {
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=604800'
        }
    });
}

console.log('[SW] Service Worker loaded');
