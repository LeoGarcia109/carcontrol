// IndexedDB Manager para CarControl - Offline Support
// Gerencia armazenamento local de dados para funcionamento offline

const DB_NAME = 'CarControlDB';
const DB_VERSION = 1;

// Object Stores
const STORES = {
    PENDING_ROUTES: 'pending_routes',
    PENDING_FINALIZATIONS: 'pending_finalizations',
    PENDING_EXPENSES: 'pending_expenses',
    GPS_QUEUE: 'gps_queue',
    CACHE_VEHICLES: 'cache_vehicles',
    CACHE_DESTINATIONS: 'cache_destinations',
    CACHE_USAGE: 'cache_usage',
    SYNC_STATUS: 'sync_status'
};

class OfflineDB {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar banco de dados IndexedDB
     */
    async init() {
        if (this.isInitialized) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineDB] Error opening database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('[OfflineDB] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[OfflineDB] Database upgrade needed');

                // Store: Rotas pendentes (criadas offline)
                if (!db.objectStoreNames.contains(STORES.PENDING_ROUTES)) {
                    const routesStore = db.createObjectStore(STORES.PENDING_ROUTES, {
                        keyPath: 'tempId',
                        autoIncrement: true
                    });
                    routesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    routesStore.createIndex('synced', 'synced', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.PENDING_ROUTES);
                }

                // Store: Finalizações pendentes
                if (!db.objectStoreNames.contains(STORES.PENDING_FINALIZATIONS)) {
                    const finalizationsStore = db.createObjectStore(STORES.PENDING_FINALIZATIONS, {
                        keyPath: 'tempId',
                        autoIncrement: true
                    });
                    finalizationsStore.createIndex('routeId', 'routeId', { unique: false });
                    finalizationsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    finalizationsStore.createIndex('synced', 'synced', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.PENDING_FINALIZATIONS);
                }

                // Store: Despesas pendentes
                if (!db.objectStoreNames.contains(STORES.PENDING_EXPENSES)) {
                    const expensesStore = db.createObjectStore(STORES.PENDING_EXPENSES, {
                        keyPath: 'tempId',
                        autoIncrement: true
                    });
                    expensesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    expensesStore.createIndex('synced', 'synced', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.PENDING_EXPENSES);
                }

                // Store: Fila de GPS (pontos não enviados)
                if (!db.objectStoreNames.contains(STORES.GPS_QUEUE)) {
                    const gpsStore = db.createObjectStore(STORES.GPS_QUEUE, {
                        keyPath: 'queueId',
                        autoIncrement: true
                    });
                    gpsStore.createIndex('usageId', 'usageId', { unique: false });
                    gpsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    gpsStore.createIndex('synced', 'synced', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.GPS_QUEUE);
                }

                // Store: Cache de veículos
                if (!db.objectStoreNames.contains(STORES.CACHE_VEHICLES)) {
                    const vehiclesStore = db.createObjectStore(STORES.CACHE_VEHICLES, {
                        keyPath: 'id'
                    });
                    vehiclesStore.createIndex('status', 'status', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.CACHE_VEHICLES);
                }

                // Store: Cache de destinos
                if (!db.objectStoreNames.contains(STORES.CACHE_DESTINATIONS)) {
                    db.createObjectStore(STORES.CACHE_DESTINATIONS, {
                        keyPath: 'id'
                    });
                    console.log('[OfflineDB] Created store:', STORES.CACHE_DESTINATIONS);
                }

                // Store: Cache de registros de uso
                if (!db.objectStoreNames.contains(STORES.CACHE_USAGE)) {
                    const usageStore = db.createObjectStore(STORES.CACHE_USAGE, {
                        keyPath: 'id'
                    });
                    usageStore.createIndex('driverId', 'driverId', { unique: false });
                    usageStore.createIndex('status', 'status', { unique: false });
                    console.log('[OfflineDB] Created store:', STORES.CACHE_USAGE);
                }

                // Store: Status de sincronização
                if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
                    db.createObjectStore(STORES.SYNC_STATUS, {
                        keyPath: 'key'
                    });
                    console.log('[OfflineDB] Created store:', STORES.SYNC_STATUS);
                }
            };
        });
    }

    // ===========================
    // PENDING ROUTES
    // ===========================

    /**
     * Adicionar rota pendente (criada offline)
     */
    async addPendingRoute(routeData) {
        await this.init();

        const route = {
            ...routeData,
            timestamp: Date.now(),
            synced: false,
            offline: true
        };

        return this._add(STORES.PENDING_ROUTES, route);
    }

    /**
     * Obter todas as rotas pendentes
     */
    async getPendingRoutes() {
        await this.init();
        return this._getAll(STORES.PENDING_ROUTES);
    }

    /**
     * Obter rotas não sincronizadas
     */
    async getUnsyncedRoutes() {
        await this.init();
        return this._getByIndex(STORES.PENDING_ROUTES, 'synced', false);
    }

    /**
     * Marcar rota como sincronizada
     */
    async markRouteSynced(tempId, serverId) {
        await this.init();
        const route = await this._get(STORES.PENDING_ROUTES, tempId);
        if (route) {
            route.synced = true;
            route.serverId = serverId;
            route.syncedAt = Date.now();
            await this._update(STORES.PENDING_ROUTES, route);
        }
    }

    /**
     * Remover rota pendente
     */
    async removePendingRoute(tempId) {
        await this.init();
        return this._delete(STORES.PENDING_ROUTES, tempId);
    }

    // ===========================
    // PENDING FINALIZATIONS
    // ===========================

    /**
     * Adicionar finalização pendente
     */
    async addPendingFinalization(finalizationData) {
        await this.init();

        const finalization = {
            ...finalizationData,
            timestamp: Date.now(),
            synced: false,
            offline: true
        };

        return this._add(STORES.PENDING_FINALIZATIONS, finalization);
    }

    /**
     * Obter finalizações não sincronizadas
     */
    async getUnsyncedFinalizations() {
        await this.init();
        return this._getByIndex(STORES.PENDING_FINALIZATIONS, 'synced', false);
    }

    /**
     * Marcar finalização como sincronizada
     */
    async markFinalizationSynced(tempId) {
        await this.init();
        const finalization = await this._get(STORES.PENDING_FINALIZATIONS, tempId);
        if (finalization) {
            finalization.synced = true;
            finalization.syncedAt = Date.now();
            await this._update(STORES.PENDING_FINALIZATIONS, finalization);
        }
    }

    /**
     * Remover finalização pendente
     */
    async removePendingFinalization(tempId) {
        await this.init();
        return this._delete(STORES.PENDING_FINALIZATIONS, tempId);
    }

    // ===========================
    // PENDING EXPENSES
    // ===========================

    /**
     * Adicionar despesa pendente
     */
    async addPendingExpense(expenseData) {
        await this.init();

        const expense = {
            ...expenseData,
            timestamp: Date.now(),
            synced: false,
            offline: true
        };

        return this._add(STORES.PENDING_EXPENSES, expense);
    }

    /**
     * Obter despesas não sincronizadas
     */
    async getUnsyncedExpenses() {
        await this.init();
        return this._getByIndex(STORES.PENDING_EXPENSES, 'synced', false);
    }

    /**
     * Marcar despesa como sincronizada
     */
    async markExpenseSynced(tempId, serverId) {
        await this.init();
        const expense = await this._get(STORES.PENDING_EXPENSES, tempId);
        if (expense) {
            expense.synced = true;
            expense.serverId = serverId;
            expense.syncedAt = Date.now();
            await this._update(STORES.PENDING_EXPENSES, expense);
        }
    }

    /**
     * Remover despesa pendente
     */
    async removePendingExpense(tempId) {
        await this.init();
        return this._delete(STORES.PENDING_EXPENSES, tempId);
    }

    // ===========================
    // GPS QUEUE
    // ===========================

    /**
     * Adicionar ponto GPS à fila
     */
    async addGPSPoint(gpsData) {
        await this.init();

        const point = {
            ...gpsData,
            timestamp: Date.now(),
            synced: false
        };

        // Limitar tamanho da fila (máximo 1000 pontos)
        const count = await this.getGPSQueueCount();
        if (count >= 1000) {
            console.warn('[OfflineDB] GPS queue full, removing oldest points');
            await this._deleteOldestGPSPoints(100);
        }

        return this._add(STORES.GPS_QUEUE, point);
    }

    /**
     * Obter pontos GPS não sincronizados
     */
    async getUnsyncedGPSPoints(limit = 50) {
        await this.init();
        const allPoints = await this._getByIndex(STORES.GPS_QUEUE, 'synced', false);

        // Ordenar por timestamp (mais antigos primeiro)
        allPoints.sort((a, b) => a.timestamp - b.timestamp);

        // Retornar apenas o limite especificado
        return allPoints.slice(0, limit);
    }

    /**
     * Contar pontos GPS na fila
     */
    async getGPSQueueCount() {
        await this.init();
        const allPoints = await this._getAll(STORES.GPS_QUEUE);
        return allPoints.length;
    }

    /**
     * Contar pontos GPS não sincronizados
     */
    async getUnsyncedGPSCount() {
        await this.init();
        const points = await this._getByIndex(STORES.GPS_QUEUE, 'synced', false);
        return points.length;
    }

    /**
     * Marcar ponto GPS como sincronizado
     */
    async markGPSPointSynced(queueId) {
        await this.init();
        const point = await this._get(STORES.GPS_QUEUE, queueId);
        if (point) {
            point.synced = true;
            point.syncedAt = Date.now();
            await this._update(STORES.GPS_QUEUE, point);
        }
    }

    /**
     * Remover ponto GPS
     */
    async removeGPSPoint(queueId) {
        await this.init();
        return this._delete(STORES.GPS_QUEUE, queueId);
    }

    /**
     * Remover pontos GPS mais antigos
     */
    async _deleteOldestGPSPoints(count) {
        await this.init();
        const allPoints = await this._getAll(STORES.GPS_QUEUE);

        // Ordenar por timestamp (mais antigos primeiro)
        allPoints.sort((a, b) => a.timestamp - b.timestamp);

        // Remover os N mais antigos
        const toDelete = allPoints.slice(0, count);
        const promises = toDelete.map(point => this._delete(STORES.GPS_QUEUE, point.queueId));

        return Promise.all(promises);
    }

    /**
     * Limpar pontos GPS sincronizados
     */
    async clearSyncedGPSPoints() {
        await this.init();
        const synced = await this._getByIndex(STORES.GPS_QUEUE, 'synced', true);
        const promises = synced.map(point => this._delete(STORES.GPS_QUEUE, point.queueId));
        return Promise.all(promises);
    }

    // ===========================
    // CACHE - VEHICLES
    // ===========================

    /**
     * Salvar veículos no cache
     */
    async cacheVehicles(vehicles) {
        await this.init();
        const promises = vehicles.map(vehicle => this._put(STORES.CACHE_VEHICLES, vehicle));
        return Promise.all(promises);
    }

    /**
     * Obter veículos do cache
     */
    async getCachedVehicles() {
        await this.init();
        return this._getAll(STORES.CACHE_VEHICLES);
    }

    /**
     * Obter veículos disponíveis do cache
     */
    async getAvailableVehicles() {
        await this.init();
        return this._getByIndex(STORES.CACHE_VEHICLES, 'status', 'disponivel');
    }

    // ===========================
    // CACHE - DESTINATIONS
    // ===========================

    /**
     * Salvar destinos no cache
     */
    async cacheDestinations(destinations) {
        await this.init();
        const promises = destinations.map(dest => this._put(STORES.CACHE_DESTINATIONS, dest));
        return Promise.all(promises);
    }

    /**
     * Obter destinos do cache
     */
    async getCachedDestinations() {
        await this.init();
        return this._getAll(STORES.CACHE_DESTINATIONS);
    }

    // ===========================
    // CACHE - USAGE RECORDS
    // ===========================

    /**
     * Salvar registros de uso no cache
     */
    async cacheUsageRecords(records) {
        await this.init();
        const promises = records.map(record => this._put(STORES.CACHE_USAGE, record));
        return Promise.all(promises);
    }

    /**
     * Obter registros de uso do cache
     */
    async getCachedUsageRecords(driverId) {
        await this.init();
        if (driverId) {
            return this._getByIndex(STORES.CACHE_USAGE, 'driverId', driverId);
        }
        return this._getAll(STORES.CACHE_USAGE);
    }

    // ===========================
    // SYNC STATUS
    // ===========================

    /**
     * Salvar status de sincronização
     */
    async setSyncStatus(key, value) {
        await this.init();
        return this._put(STORES.SYNC_STATUS, { key, value, timestamp: Date.now() });
    }

    /**
     * Obter status de sincronização
     */
    async getSyncStatus(key) {
        await this.init();
        const result = await this._get(STORES.SYNC_STATUS, key);
        return result ? result.value : null;
    }

    /**
     * Obter contagem total de itens pendentes
     */
    async getPendingCount() {
        const [routes, finalizations, expenses, gps] = await Promise.all([
            this.getUnsyncedRoutes(),
            this.getUnsyncedFinalizations(),
            this.getUnsyncedExpenses(),
            this.getUnsyncedGPSCount()
        ]);

        return {
            routes: routes.length,
            finalizations: finalizations.length,
            expenses: expenses.length,
            gps: gps,
            total: routes.length + finalizations.length + expenses.length + gps
        };
    }

    // ===========================
    // GENERIC CRUD OPERATIONS
    // ===========================

    _add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    _getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    _update(storeName, data) {
        return this._put(storeName, data);
    }

    _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Limpar todos os dados (útil para reset)
     */
    async clearAll() {
        await this.init();
        const stores = Object.values(STORES);
        const promises = stores.map(storeName => this._clear(storeName));
        return Promise.all(promises);
    }

    _clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
const offlineDB = new OfflineDB();

// Export para uso global
if (typeof window !== 'undefined') {
    window.offlineDB = offlineDB;
}

console.log('[OfflineDB] Module loaded');
