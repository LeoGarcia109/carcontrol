// Sync Manager para CarControl - Offline Synchronization
// Gerencia sincronização automática de dados quando voltar online

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInProgress = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo inicial, com exponential backoff
        this.listeners = [];
    }

    /**
     * Inicializar Sync Manager
     */
    async init() {
        console.log('[SyncManager] Initializing...');

        // Verificar suporte a Service Worker
        if (!('serviceWorker' in navigator)) {
            console.warn('[SyncManager] Service Worker not supported');
            return;
        }

        // FIX: Aguardar Service Worker estar pronto antes de qualquer operação
        // Isso garante que o SW foi registrado e está disponível
        try {
            console.log('[SyncManager] Waiting for Service Worker to be ready...');
            const registration = await navigator.serviceWorker.ready;
            console.log('[SyncManager] Service Worker is ready!', registration.scope);

            // Verificar suporte a Background Sync
            if ('sync' in registration) {
                console.log('[SyncManager] Background Sync supported');
            } else {
                console.warn('[SyncManager] Background Sync not supported, using fallback');
            }
        } catch (error) {
            console.warn('[SyncManager] Could not check Background Sync support:', error);
            // Continuar mesmo sem Background Sync - usar fallback manual
        }

        // Listen para mudanças de conectividade
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Listen para mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event.data);
        });

        // Verificar status inicial
        this.updateOnlineStatus();

        // Se estiver online, tentar sincronizar pendências
        if (this.isOnline) {
            setTimeout(() => this.syncAll(), 2000);
        }

        console.log('[SyncManager] Initialized');
    }

    /**
     * Registrar listener para eventos de sincronização
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    /**
     * Disparar evento para listeners
     */
    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }

    /**
     * Atualizar status online/offline
     */
    updateOnlineStatus() {
        const wasOnline = this.isOnline;
        this.isOnline = navigator.onLine;

        if (this.isOnline !== wasOnline) {
            console.log('[SyncManager] Online status changed:', this.isOnline);
            this.emit('statusChange', { online: this.isOnline });
        }
    }

    /**
     * Handler quando ficar online
     */
    async handleOnline() {
        console.log('[SyncManager] Device is now ONLINE');
        this.isOnline = true;
        this.retryAttempts = 0;

        this.emit('online', null);

        // Aguardar 2 segundos para estabilizar conexão
        setTimeout(() => {
            this.syncAll();
        }, 2000);
    }

    /**
     * Handler quando ficar offline
     */
    handleOffline() {
        console.log('[SyncManager] Device is now OFFLINE');
        this.isOnline = false;
        this.emit('offline', null);
    }

    /**
     * Handler para mensagens do Service Worker
     */
    handleServiceWorkerMessage(message) {
        console.log('[SyncManager] SW Message:', message);

        switch (message.type) {
            case 'SYNC_STARTED':
                this.emit('syncStarted', null);
                break;
            case 'SYNC_COMPLETED':
                this.emit('syncCompleted', null);
                break;
            case 'SYNC_FAILED':
                this.emit('syncFailed', message.error);
                break;
            case 'GPS_SYNC_STARTED':
                this.emit('gpsSyncStarted', null);
                break;
            case 'GPS_SYNC_COMPLETED':
                this.emit('gpsSyncCompleted', null);
                break;
        }
    }

    /**
     * Sincronizar todos os dados pendentes
     */
    async syncAll() {
        if (!this.isOnline) {
            console.log('[SyncManager] Cannot sync: offline');
            return {
                success: false,
                message: 'Dispositivo offline'
            };
        }

        if (this.syncInProgress) {
            console.log('[SyncManager] Sync already in progress');
            return {
                success: false,
                message: 'Sincronização já em andamento'
            };
        }

        try {
            this.syncInProgress = true;
            this.emit('syncStarted', null);

            console.log('[SyncManager] Starting full sync...');

            const results = {
                routes: 0,
                finalizations: 0,
                expenses: 0,
                gps: 0,
                errors: []
            };

            // Prioridade 1: Criar rotas pendentes
            const routesResult = await this.syncPendingRoutes();
            results.routes = routesResult.synced;
            if (routesResult.errors.length > 0) {
                results.errors.push(...routesResult.errors);
            }

            // Prioridade 2: Enviar GPS em lote
            const gpsResult = await this.syncGPSQueue();
            results.gps = gpsResult.synced;
            if (gpsResult.errors.length > 0) {
                results.errors.push(...gpsResult.errors);
            }

            // Prioridade 3: Finalizar rotas
            const finalizationsResult = await this.syncPendingFinalizations();
            results.finalizations = finalizationsResult.synced;
            if (finalizationsResult.errors.length > 0) {
                results.errors.push(...finalizationsResult.errors);
            }

            // Prioridade 4: Criar despesas
            const expensesResult = await this.syncPendingExpenses();
            results.expenses = expensesResult.synced;
            if (expensesResult.errors.length > 0) {
                results.errors.push(...expensesResult.errors);
            }

            const totalSynced = results.routes + results.finalizations + results.expenses + results.gps;

            console.log('[SyncManager] Sync completed:', results);

            this.emit('syncCompleted', {
                success: true,
                ...results,
                totalSynced
            });

            this.syncInProgress = false;
            this.retryAttempts = 0;

            return {
                success: true,
                ...results,
                totalSynced
            };

        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            this.syncInProgress = false;

            this.emit('syncFailed', { error: error.message });

            // Retry com exponential backoff
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);
                console.log(`[SyncManager] Retrying in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);

                setTimeout(() => this.syncAll(), delay);
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sincronizar rotas pendentes
     */
    async syncPendingRoutes() {
        const routes = await offlineDB.getUnsyncedRoutes();
        console.log(`[SyncManager] Syncing ${routes.length} pending routes`);

        const results = {
            synced: 0,
            errors: []
        };

        for (const route of routes) {
            try {
                // Criar rota no servidor
                const response = await apiCreateUsage({
                    vehicleId: route.vehicleId,
                    driverId: route.driverId,
                    departureTime: route.departureTime,
                    kmDeparture: route.kmDeparture,
                    destinationId: route.destinationId,
                    notes: route.notes || null,
                    incidentPhoto: route.incidentPhoto || null
                });

                const serverId = response.data?.id || response.id;

                // Marcar como sincronizada
                await offlineDB.markRouteSynced(route.tempId, serverId);

                // Atualizar GPS queue com o ID real
                await this.updateGPSQueueWithServerId(route.tempId, serverId);

                results.synced++;
                console.log(`[SyncManager] Route ${route.tempId} synced as ${serverId}`);

            } catch (error) {
                console.error(`[SyncManager] Error syncing route ${route.tempId}:`, error);
                results.errors.push({
                    type: 'route',
                    tempId: route.tempId,
                    error: error.message
                });
            }
        }

        // Limpar rotas sincronizadas
        await this.cleanSyncedRoutes();

        return results;
    }

    /**
     * Sincronizar finalizações pendentes
     */
    async syncPendingFinalizations() {
        const finalizations = await offlineDB.getUnsyncedFinalizations();
        console.log(`[SyncManager] Syncing ${finalizations.length} pending finalizations`);

        const results = {
            synced: 0,
            errors: []
        };

        for (const finalization of finalizations) {
            try {
                // Finalizar rota no servidor
                await apiFinalizeUsage(finalization.routeId, {
                    returnTime: finalization.returnTime,
                    kmReturn: finalization.kmReturn
                });

                // Marcar como sincronizada
                await offlineDB.markFinalizationSynced(finalization.tempId);

                results.synced++;
                console.log(`[SyncManager] Finalization ${finalization.tempId} synced`);

            } catch (error) {
                console.error(`[SyncManager] Error syncing finalization ${finalization.tempId}:`, error);
                results.errors.push({
                    type: 'finalization',
                    tempId: finalization.tempId,
                    error: error.message
                });
            }
        }

        // Limpar finalizações sincronizadas
        await this.cleanSyncedFinalizations();

        return results;
    }

    /**
     * Sincronizar despesas pendentes
     */
    async syncPendingExpenses() {
        const expenses = await offlineDB.getUnsyncedExpenses();
        console.log(`[SyncManager] Syncing ${expenses.length} pending expenses`);

        const results = {
            synced: 0,
            errors: []
        };

        for (const expense of expenses) {
            try {
                // Criar despesa no servidor
                const response = await apiCreateExpense({
                    vehicleId: expense.vehicleId,
                    category: expense.category,
                    date: expense.date,
                    currentKm: expense.currentKm,
                    liters: expense.liters,
                    pricePerLiter: expense.pricePerLiter,
                    totalValue: expense.totalValue,
                    notes: expense.notes
                });

                const serverId = response.data?.id || response.id;

                // Marcar como sincronizada
                await offlineDB.markExpenseSynced(expense.tempId, serverId);

                results.synced++;
                console.log(`[SyncManager] Expense ${expense.tempId} synced as ${serverId}`);

            } catch (error) {
                console.error(`[SyncManager] Error syncing expense ${expense.tempId}:`, error);
                results.errors.push({
                    type: 'expense',
                    tempId: expense.tempId,
                    error: error.message
                });
            }
        }

        // Limpar despesas sincronizadas
        await this.cleanSyncedExpenses();

        return results;
    }

    /**
     * Sincronizar fila de GPS em lote
     */
    async syncGPSQueue(batchSize = 50) {
        const points = await offlineDB.getUnsyncedGPSPoints(batchSize);
        console.log(`[SyncManager] Syncing ${points.length} GPS points`);

        const results = {
            synced: 0,
            errors: []
        };

        // Enviar em lote
        for (const point of points) {
            try {
                // Enviar ponto GPS
                await apiSendGPS({
                    vehicleId: point.vehicleId,
                    driverId: point.driverId,
                    usageId: point.usageId,
                    latitude: point.latitude,
                    longitude: point.longitude,
                    accuracy: point.accuracy,
                    speed: point.speed,
                    altitude: point.altitude,
                    heading: point.heading,
                    timestamp: new Date(point.timestamp).toISOString()
                });

                // Marcar como sincronizado
                await offlineDB.markGPSPointSynced(point.queueId);

                results.synced++;

            } catch (error) {
                console.error(`[SyncManager] Error syncing GPS point ${point.queueId}:`, error);
                results.errors.push({
                    type: 'gps',
                    queueId: point.queueId,
                    error: error.message
                });
            }
        }

        // Limpar pontos sincronizados (manter últimos 100 para segurança)
        const syncedCount = await offlineDB.getGPSQueueCount();
        if (syncedCount > 100) {
            await offlineDB.clearSyncedGPSPoints();
        }

        return results;
    }

    /**
     * Atualizar GPS queue com ID real do servidor
     */
    async updateGPSQueueWithServerId(tempUsageId, serverUsageId) {
        // Não há campo tempUsageId na tabela GPS queue
        // Esta função seria útil se tivéssemos esse campo
        // Por enquanto, deixar como placeholder
        console.log(`[SyncManager] GPS queue update: ${tempUsageId} -> ${serverUsageId}`);
    }

    /**
     * Limpar rotas sincronizadas
     */
    async cleanSyncedRoutes() {
        const routes = await offlineDB.getUnsyncedRoutes();
        const synced = (await offlineDB.getPendingRoutes()).filter(r => r.synced);

        for (const route of synced) {
            // Manter por 24h após sincronização para segurança
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (route.syncedAt && route.syncedAt < dayAgo) {
                await offlineDB.removePendingRoute(route.tempId);
            }
        }
    }

    /**
     * Limpar finalizações sincronizadas
     */
    async cleanSyncedFinalizations() {
        const all = await offlineDB._getAll('pending_finalizations');
        const synced = all.filter(f => f.synced);

        for (const finalization of synced) {
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (finalization.syncedAt && finalization.syncedAt < dayAgo) {
                await offlineDB.removePendingFinalization(finalization.tempId);
            }
        }
    }

    /**
     * Limpar despesas sincronizadas
     */
    async cleanSyncedExpenses() {
        const all = await offlineDB._getAll('pending_expenses');
        const synced = all.filter(e => e.synced);

        for (const expense of synced) {
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (expense.syncedAt && expense.syncedAt < dayAgo) {
                await offlineDB.removePendingExpense(expense.tempId);
            }
        }
    }

    /**
     * Obter contagem de itens pendentes
     */
    async getPendingCount() {
        return await offlineDB.getPendingCount();
    }

    /**
     * Registrar sincronização no Background Sync API
     */
    async registerBackgroundSync(tag = 'sync-pending-data') {
        if (!('serviceWorker' in navigator)) {
            console.warn('[SyncManager] Service Worker not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            if (!('sync' in registration)) {
                console.warn('[SyncManager] Background Sync not supported');
                return false;
            }

            await registration.sync.register(tag);
            console.log(`[SyncManager] Background sync registered: ${tag}`);
            return true;
        } catch (error) {
            console.error('[SyncManager] Error registering background sync:', error);
            return false;
        }
    }
}

// Singleton instance
const syncManager = new SyncManager();

// Export para uso global
if (typeof window !== 'undefined') {
    window.syncManager = syncManager;
}

console.log('[SyncManager] Module loaded');
