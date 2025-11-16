// Mobile Driver JavaScript
// Gerenciamento de rotas para motoristas

let currentDriver = null;
let vehicles = [];
let drivers = [];
let usageRecords = [];
let destinations = [];
let currentFilter = 'todas';

// Variáveis para rastreamento GPS
let gpsTracking = false;
let gpsInterval = null;
let currentUsageId = null;
let lastGpsPosition = null;
let lastGpsTimestamp = null;

// Variáveis para modo offline
let isOfflineMode = !navigator.onLine;
let pendingCount = 0;
let offlineIndicatorUpdater = null;

// Variáveis para inspeção
let templatesArray = [];
let checklistItens = [];
let currentInspectionType = null;

// ===========================
// FUNÇÕES GPS
// ===========================

// Solicitar permissão e iniciar GPS
async function startGPSTracking(usageId, vehicleId) {
    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada neste navegador');
        showToast('GPS não disponível neste dispositivo', 'error');
        return false;
    }

    try {
        // Solicitar permissão
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });

        console.log('GPS autorizado, iniciando rastreamento...');
        currentUsageId = usageId;
        gpsTracking = true;

        // Atualizar indicador visual imediatamente
        updateGPSIndicator(true);

        // Capturar posição inicial
        await captureAndSendGPS(position, vehicleId);

        // Iniciar rastreamento contínuo (a cada 5 segundos)
        gpsInterval = setInterval(async () => {
            if (!gpsTracking) {
                clearInterval(gpsInterval);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await captureAndSendGPS(pos, vehicleId);
                },
                (error) => {
                    console.error('Erro ao obter GPS:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }, 20000); // Atualizar a cada 20 segundos

        showToast('Rastreamento GPS ativado', 'success');
        return true;

    } catch (error) {
        console.error('Erro ao iniciar GPS:', error);
        let errorMsg = 'Erro ao ativar GPS';

        if (error.code === 1) {
            errorMsg = 'GPS negado. Por favor, autorize o acesso à localização';
        } else if (error.code === 2) {
            errorMsg = 'Localização indisponível';
        } else if (error.code === 3) {
            errorMsg = 'Tempo esgotado ao obter localização';
        }

        showToast(errorMsg, 'error');
        return false;
    }
}

// Parar rastreamento GPS
async function stopGPSTracking() {
    if (!gpsTracking) return;

    gpsTracking = false;

    if (gpsInterval) {
        clearInterval(gpsInterval);
        gpsInterval = null;
    }

    // Notificar backend para parar rastreamento
    if (currentUsageId) {
        try {
            await apiStopGPS(currentUsageId);
            console.log('Rastreamento GPS finalizado');
        } catch (error) {
            console.error('Erro ao parar GPS no servidor:', error);
        }
    }

    currentUsageId = null;
    lastGpsPosition = null;

    // Atualizar indicador visual
    updateGPSIndicator(false);

    showToast('Rastreamento GPS desativado', 'info');
}

// Capturar e enviar coordenadas GPS
async function captureAndSendGPS(position, vehicleId) {
    const coords = position.coords;
    const currentTimestamp = Date.now();

    // Calcular velocidade se browser não fornecer
    let calculatedSpeed = coords.speed; // m/s ou null

    if (calculatedSpeed === null && lastGpsPosition && lastGpsTimestamp) {
        // Calcular velocidade com base na posição anterior
        const distance = calculateDistance(
            lastGpsPosition.latitude,
            lastGpsPosition.longitude,
            coords.latitude,
            coords.longitude
        ); // metros

        const timeElapsed = (currentTimestamp - lastGpsTimestamp) / 1000; // segundos

        if (timeElapsed > 0 && distance > 0) {
            const speedMps = distance / timeElapsed; // m/s
            calculatedSpeed = speedMps * 3.6; // converter para km/h (formato que o trigger espera)
            console.log(`📊 Velocidade calculada: ${calculatedSpeed.toFixed(2)} km/h (${distance.toFixed(1)}m em ${timeElapsed.toFixed(1)}s)`);
        }
    } else if (calculatedSpeed !== null) {
        // Browser forneceu velocidade em m/s, converter para km/h
        calculatedSpeed = calculatedSpeed * 3.6;
        console.log(`📊 Velocidade do browser: ${calculatedSpeed.toFixed(2)} km/h`);
    }

    // Preparar dados GPS
    const gpsData = {
        vehicleId: vehicleId,
        driverId: currentDriver.id,
        usageId: currentUsageId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null,
        speed: calculatedSpeed, // km/h ou null
        altitude: coords.altitude || null,
        heading: coords.heading || null,
        timestamp: new Date().toISOString()
    };

    // Verificar se houve mudança significativa (mínimo 10 metros)
    if (lastGpsPosition) {
        const distance = calculateDistance(
            lastGpsPosition.latitude,
            lastGpsPosition.longitude,
            coords.latitude,
            coords.longitude
        );

        // Se movimentação menor que 10 metros, não enviar
        if (distance < 10) {
            console.log('Posição não mudou significativamente, ignorando...');
            return;
        }
    }

    try {
        // MODO OFFLINE: Salvar GPS no IndexedDB
        if (isOfflineMode) {
            await offlineDB.addGPSPoint(gpsData);
            console.log('📴 GPS salvo offline:', {
                lat: coords.latitude.toFixed(6),
                lng: coords.longitude.toFixed(6),
                accuracy: Math.round(coords.accuracy) + 'm'
            });

            // Atualizar contador de pendências
            await updatePendingCount();
        } else {
            // MODO ONLINE: Tentar enviar para o servidor
            try {
                await apiSendGPS(gpsData);
                console.log('📡 GPS enviado online:', {
                    lat: coords.latitude.toFixed(6),
                    lng: coords.longitude.toFixed(6),
                    accuracy: Math.round(coords.accuracy) + 'm'
                });
            } catch (networkError) {
                // Falha de rede, salvar offline como fallback
                console.warn('⚠️ Falha de rede, salvando GPS offline');
                await offlineDB.addGPSPoint(gpsData);
                await updatePendingCount();
            }
        }

        lastGpsPosition = {
            latitude: coords.latitude,
            longitude: coords.longitude
        };
        lastGpsTimestamp = currentTimestamp;

        // Atualizar indicador visual
        updateGPSIndicator(true);

    } catch (error) {
        console.error('Erro ao processar GPS:', error);
        updateGPSIndicator(false);
    }
}

// Calcular distância entre duas coordenadas (fórmula Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
}

// Atualizar indicador visual de GPS
function updateGPSIndicator(active) {
    const indicator = document.getElementById('gpsIndicator');
    if (indicator) {
        if (active) {
            indicator.innerHTML = `
                <svg width="16" height="16" fill="currentColor" class="gps-active">
                    <circle cx="8" cy="8" r="3" fill="#10b981"/>
                    <path d="M8 0v3m0 10v3M0 8h3m10 0h3" stroke="#10b981" stroke-width="2"/>
                </svg>
                <span>GPS Ativo</span>
            `;
            indicator.className = 'gps-indicator active';
        } else {
            indicator.innerHTML = `
                <svg width="16" height="16" fill="currentColor" class="gps-inactive">
                    <circle cx="8" cy="8" r="3" fill="#94a3b8"/>
                    <path d="M8 0v3m0 10v3M0 8h3m10 0h3" stroke="#94a3b8" stroke-width="1"/>
                </svg>
                <span>GPS Inativo</span>
            `;
            indicator.className = 'gps-indicator inactive';
        }
    }
}

// ===========================
// FUNÇÕES DE MANUTENÇÃO
// ===========================

// Verificar status de manutenção
function checkMaintenanceStatus(vehicle) {
    if (!vehicle.nextMaintenanceKm || !vehicle.nextMaintenanceDate) {
        return {
            status: 'ok',
            message: 'Sem dados de manutenção',
            kmRemaining: 999999,
            daysRemaining: 999999,
            priority: 'low'
        };
    }

    const currentDate = new Date();
    const nextMaintDate = new Date(vehicle.nextMaintenanceDate);
    const daysUntilMaintenance = Math.floor((nextMaintDate - currentDate) / (1000 * 60 * 60 * 24));
    const kmUntilMaintenance = vehicle.nextMaintenanceKm - vehicle.currentKm;

    // Verificar se está vencida
    if (vehicle.currentKm >= vehicle.nextMaintenanceKm || currentDate >= nextMaintDate) {
        return {
            status: 'overdue',
            message: 'Manutenção vencida!',
            kmRemaining: kmUntilMaintenance,
            daysRemaining: daysUntilMaintenance,
            priority: 'high'
        };
    }

    // Verificar se está próxima (dentro de 500km ou 15 dias)
    if (kmUntilMaintenance <= 500 || daysUntilMaintenance <= 15) {
        return {
            status: 'approaching',
            message: `Manutenção próxima (${Math.max(kmUntilMaintenance, 0)} km ou ${Math.max(daysUntilMaintenance, 0)} dias)`,
            kmRemaining: kmUntilMaintenance,
            daysRemaining: daysUntilMaintenance,
            priority: 'medium'
        };
    }

    return {
        status: 'ok',
        message: 'Manutenção em dia',
        kmRemaining: kmUntilMaintenance,
        daysRemaining: daysUntilMaintenance,
        priority: 'low'
    };
}

// Inicializar sistema
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se há token de sessão na URL (para compatibilidade com Playwright)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session');

    if (sessionToken) {
        try {
            // Decodificar e restaurar usuário do token
            const user = JSON.parse(atob(sessionToken));
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Limpar URL para ficar mais limpa
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error('Token de sessão inválido:', e);
        }
    }

    // Verificar autenticação
    let user = getCurrentUser();
    if (!user) {
        // Tentar carregar do backend (sessão PHP)
        try {
            user = await loadCurrentUser();
        } catch (e) {
            user = null;
        }
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
    }

    // Inicializar suporte offline ANTES de carregar dados
    await initOfflineSupport();

    // Carregar dados da API (veículos, rotas, destinos)
    await loadDataFromAPI();

    // Cachear dados carregados
    await cacheCurrentData();

    // Resolver motorista atual preferindo a API (usa motorista_id da sessão)
    console.log('🔍 [MOBILE-DRIVER] Iniciando resolução do motorista...');
    console.log('🔍 [MOBILE-DRIVER] User:', user);

    try {
        if (user.motorista_id) {
            console.log('🔍 [MOBILE-DRIVER] Tentando carregar motorista por ID:', user.motorista_id);
            const apiDriver = await apiGetDriver(user.motorista_id);
            console.log('🔍 [MOBILE-DRIVER] apiGetDriver retornou:', apiDriver);
            if (apiDriver) {
                currentDriver = apiDriver;
                console.log('✅ [MOBILE-DRIVER] Motorista carregado por ID:', currentDriver.nome);
            }
        } else {
            console.warn('⚠️ [MOBILE-DRIVER] User não tem motorista_id!');
        }
    } catch (e) {
        console.error('🔴 [MOBILE-DRIVER] Erro ao carregar motorista pela API:', e);
    }

    // Fallback: tentar localizar motorista pela API via email (caso não tenha motorista_id)
    if (!currentDriver && user.email) {
        console.log('🔍 [MOBILE-DRIVER] Tentando fallback: buscar motorista por email:', user.email);
        try {
            const allDrivers = await apiGetDrivers();
            console.log('🔍 [MOBILE-DRIVER] apiGetDrivers retornou:', allDrivers?.data?.length || 0, 'motoristas');
            const list = allDrivers.data || [];
            currentDriver = list.find(d => d.email === user.email) || null;
            if (currentDriver) {
                console.log('✅ [MOBILE-DRIVER] Motorista encontrado por email:', currentDriver.nome);
            } else {
                console.error('🔴 [MOBILE-DRIVER] Nenhum motorista encontrado com email:', user.email);
            }
        } catch (e) {
            console.error('🔴 [MOBILE-DRIVER] Erro no fallback de busca por email:', e);
        }
    }

    if (!currentDriver) {
        console.error('🔴 [MOBILE-DRIVER] CRÍTICO: Motorista não encontrado! Fazendo logout...');
        alert('Motorista não encontrado no sistema. Entre em contato com o administrador.');
        logout();
        return;
    }

    console.log('✅ [MOBILE-DRIVER] Motorista resolvido com sucesso:', currentDriver);

    // Carregar registros de uso do motorista e configurar interface
    await refreshUsageForDriver();
    setupInterface();
    loadStats();
    loadRoutes();

    // ===========================
    // RESTAURAR GPS EM VIAGENS ATIVAS
    // ===========================

    // Verificar se há viagem ativa e reiniciar GPS automaticamente
    // Status padronizado: 'em_uso' (valor do ENUM do banco)
    const activeRoute = usageRecords.find(r =>
        r.driverId === currentDriver.id &&
        r.status === 'em_uso'
    );

    if (activeRoute) {
        console.log('🔄 Viagem ativa detectada, reiniciando GPS...', activeRoute);

        // Restaurar estado do GPS
        currentUsageId = activeRoute.id;
        gpsTracking = true;

        // Reiniciar rastreamento GPS para viagem ativa
        try {
            const gpsStarted = await startGPSTracking(activeRoute.id, activeRoute.vehicleId);
            if (gpsStarted) {
                console.log('✅ GPS restaurado para viagem ID:', activeRoute.id);
                updateGPSIndicator(true);
            } else {
                console.warn('⚠️ Falha ao restaurar GPS');
                updateGPSIndicator(false);
            }
        } catch (err) {
            console.error('❌ Erro ao restaurar GPS:', err);
            updateGPSIndicator(false);
        }
    } else {
        // Nenhuma viagem ativa, indicador permanece inativo
        console.log('ℹ️ Nenhuma viagem ativa, GPS permanece inativo');
        updateGPSIndicator(false);
    }

    // Event listeners
    setupEventListeners();

    // Inicializar Speed Dial FAB
    initSpeedDialFAB();

    // Tornar funções acessíveis para onclick handlers
    // IMPORTANTE: NÃO sobrescrever logout - usar a do auth.js
    window.openNewRouteModal = openNewRouteModal;
    window.closeNewRouteModal = closeNewRouteModal;
    window.filterRoutes = filterRoutes;
    window.closeFinalizeRouteModal = closeFinalizeRouteModal;
    window.openExpenseModal = openExpenseModal;
    window.closeExpenseModal = closeExpenseModal;
    window.toggleExpenseFields = toggleExpenseFields;
    window.submitExpense = submitExpense;

    // Funções de inspeção
    window.openInspectionModal = openInspectionModal;
    window.closeInspectionModal = closeInspectionModal;
    window.loadInspectionTemplate = loadInspectionTemplate;
    window.loadVehicleKm = loadVehicleKm;
    window.updateInspectionStatus = updateInspectionStatus;
    window.submitInspection = submitInspection;
    // NÃO definir window.logout - manter a função do auth.js
});

function setupInterface() {
    document.getElementById('driverName').textContent = currentDriver.name;
}

function setupEventListeners() {
    // Form nova rota
    document.getElementById('newRouteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await createNewRoute();
    });

    // Form finalizar rota
    document.getElementById('finalizeRouteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await finalizeRoute();
    });

    // Toggle seção de intercorrência
    const incidentToggle = document.getElementById('routeHasIncident');
    if (incidentToggle) {
        incidentToggle.addEventListener('change', () => {
            const section = document.getElementById('incidentSection');
            section.style.display = incidentToggle.checked ? 'block' : 'none';
        });
    }

    // Preview de foto de intercorrência
    const incidentInput = document.getElementById('routeIncidentPhoto');
    if (incidentInput) {
        incidentInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            const preview = document.getElementById('incidentPhotoPreview');
            const btnRemove = document.getElementById('btnRemoveIncidentPhoto');
            if (!file) {
                if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
                if (btnRemove) btnRemove.style.display = 'none';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (preview) {
                    preview.style.display = 'flex';
                    preview.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
                }
                if (btnRemove) btnRemove.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        });
    }
}

// Carregar dados da API
async function loadDataFromAPI() {
    console.log('📦 [MOBILE-DRIVER] Iniciando loadDataFromAPI...');
    try {
        console.log('📦 [MOBILE-DRIVER] Chamando Promise.all para vehicles, destinations, drivers...');
        const [vehResp, destResp, drvResp] = await Promise.all([
            apiGetVehicles(),
            apiGetDestinations(),
            apiGetDrivers()
        ]);
        console.log('📦 [MOBILE-DRIVER] Respostas recebidas:', {
            vehicles: vehResp?.data?.length || 0,
            destinations: destResp?.data?.length || 0,
            drivers: drvResp?.data?.length || 0
        });
        vehicles = vehResp.data || [];
        destinations = destResp.data || [];
        drivers = drvResp.data || [];
        console.log('✅ [MOBILE-DRIVER] Dados carregados com sucesso');
    } catch (e) {
        console.error('🔴 [MOBILE-DRIVER] Erro ao carregar dados base:', e);
    }
}

// Buscar registros de uso do motorista pela API e normalizar formato
async function refreshUsageForDriver() {
    try {
        const resp = await apiGetUsageRecords();
        const all = resp.data || [];
        // Filtrar por motorista atual e normalizar campos para o UI atual
        usageRecords = all
            .filter(r => r.driverId === currentDriver.id)
            .map(normalizeUsageRecord);
    } catch (e) {
        console.error('Erro ao carregar registros de uso:', e);
        usageRecords = [];
    }
}

function normalizeUsageRecord(r) {
    // Status já vem padronizado do backend: 'em_uso' ou 'finalizado'
    const status = r.status;
    // Calcular duração quando possível
    let duration = null;
    if (r.departureTime && r.returnTime) {
        const dep = new Date(r.departureTime);
        const ret = new Date(r.returnTime);
        duration = Math.round((ret - dep) / (1000 * 60));
    }
    // Definir approvalStatus (não há fluxo de aprovação na API)
    const approvalStatus = status === 'finalizado' ? 'aprovado' : 'pendente';

    return {
        id: r.id,
        vehicleId: r.vehicleId,
        driverId: r.driverId,
        departure: r.departureTime,
        kmDeparture: r.kmDeparture,
        return: r.returnTime,
        kmReturn: r.kmReturn,
        destinationId: r.destinationId,
        status,
        approvalStatus,
        duration
    };
}

// Carregar estatísticas
function loadStats() {
    const myRoutes = usageRecords.filter(r => r.driverId === currentDriver.id);

    // Status padronizados: 'em_uso' e 'finalizado' (valores do ENUM)
    const activeTrips = myRoutes.filter(r => r.status === 'em_uso').length;
    const completedTrips = myRoutes.filter(r => r.status === 'finalizado').length;
    const pendingApproval = myRoutes.filter(r => r.approvalStatus === 'pendente').length;

    document.getElementById('statActiveTrips').textContent = activeTrips;
    document.getElementById('statCompletedTrips').textContent = completedTrips;
    document.getElementById('statPendingApproval').textContent = pendingApproval;
}

// Carregar rotas
function loadRoutes() {
    const container = document.getElementById('routesContainer');
    const emptyState = document.getElementById('emptyState');

    // Filtrar rotas do motorista atual
    let myRoutes = usageRecords.filter(r => r.driverId === currentDriver.id);

    // Aplicar filtro - status padronizados (valores do ENUM)
    if (currentFilter === 'em_uso') {
        myRoutes = myRoutes.filter(r => r.status === 'em_uso');
    } else if (currentFilter === 'finalizado') {
        myRoutes = myRoutes.filter(r => r.status === 'finalizado');
    } else if (currentFilter === 'pendente') {
        // Sem fluxo de aprovação real na API; exibir rotas em uso como pendentes
        myRoutes = myRoutes.filter(r => r.status !== 'finalizado');
    }

    // Ordenar por data (mais recentes primeiro)
    myRoutes.sort((a, b) => new Date(b.departure) - new Date(a.departure));

    if (myRoutes.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';
    container.innerHTML = '';

    myRoutes.forEach(route => {
        const vehicle = vehicles.find(v => v.id === route.vehicleId);
        const destination = destinations.find(d => d.id === route.destinationId);

        const card = createRouteCard(route, vehicle, destination);
        container.appendChild(card);
    });
}

// Criar card de rota
function createRouteCard(route, vehicle, destination) {
    const card = document.createElement('div');
    card.className = 'route-card';

    // Status padronizados (valores do ENUM do banco)
    const isActive = route.status === 'em_uso';
    const isCompleted = route.status === 'finalizado';
    const statusText = isActive ? 'Em Andamento' : 'Concluída';
    const statusClass = `status-${route.status}`;

    const approvalText = route.approvalStatus === 'pendente' ? 'Pendente' :
                         route.approvalStatus === 'aprovado' ? 'Aprovada' :
                         'Rejeitada';

    const duration = route.duration ? formatDuration(route.duration) : '-';
    const distance = route.kmReturn ? (route.kmReturn - route.kmDeparture) + ' km' : '-';

    card.innerHTML = `
        <div class="route-header">
            <div class="route-vehicle">${vehicle ? vehicle.plate + ' - ' + vehicle.model : 'Veículo não encontrado'}</div>
            <div class="route-status ${statusClass}">${statusText}</div>
        </div>

        <div class="route-details">
            <div class="route-detail-item">
                <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C7.58172 2 4 5.58172 4 10C4 14.4183 12 22 12 22C12 22 20 14.4183 20 10C20 5.58172 16.4183 2 12 2Z" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="route-detail-label">Destino:</span>
                <span class="route-detail-value">${destination ? destination.name : 'N/A'}</span>
            </div>

            <div class="route-detail-item">
                <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M16 2V6M8 2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M3 9H21" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="route-detail-label">Saída:</span>
                <span class="route-detail-value">${formatDateTime(route.departure)}</span>
            </div>

            ${route.return ? `
                <div class="route-detail-item">
                    <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="route-detail-label">Retorno:</span>
                    <span class="route-detail-value">${formatDateTime(route.return)}</span>
                </div>
            ` : ''}

            <div class="route-detail-item">
                <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="route-detail-label">Duração:</span>
                <span class="route-detail-value">${duration}</span>
            </div>

            <div class="route-detail-item">
                <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12H21M3 6H21M3 18H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="route-detail-label">Distância:</span>
                <span class="route-detail-value">${distance}</span>
            </div>

            <div class="route-detail-item">
                <svg class="route-detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 7H15M9 11H15M9 15H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="route-detail-label">Status:</span>
                <span class="route-detail-value ${route.approvalStatus}">${approvalText}</span>
            </div>
        </div>

        ${route.status === 'em_uso' ? `
            <div class="route-actions">
                <button class="btn-action btn-finalize" onclick="openFinalizeModal(${route.id})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Finalizar Rota
                </button>
            </div>
        ` : ''}
    `;

    return card;
}

// Filtrar rotas
function filterRoutes(filter) {
    currentFilter = filter;

    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    loadRoutes();
}

// ===========================
// VERIFICAR PERMISSÃO GPS
// ===========================

// Verificar/solicitar permissão GPS antes de criar rota
async function checkGPSPermission() {
    if (!navigator.geolocation) {
        throw new Error('GPS não disponível neste dispositivo');
    }

    try {
        // Solicitar permissão antecipadamente
        await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });

        // Permissão concedida - atualizar indicador
        updateGPSIndicator(true);
        console.log('✅ Permissão GPS concedida');
        return true;

    } catch (error) {
        // Permissão negada ou erro
        updateGPSIndicator(false);

        let errorMsg = 'GPS é obrigatório para iniciar rotas';
        if (error.code === 1) {
            errorMsg = 'Você precisa autorizar o acesso ao GPS para criar rotas. Por favor, permita o acesso à localização.';
        } else if (error.code === 2) {
            errorMsg = 'GPS indisponível. Verifique se o GPS está ativado no dispositivo.';
        } else if (error.code === 3) {
            errorMsg = 'Tempo esgotado ao obter GPS. Tente novamente.';
        }

        console.error('❌ Erro ao verificar GPS:', errorMsg);
        throw new Error(errorMsg);
    }
}

// Abrir modal nova rota
function openNewRouteModal() {
    const modal = document.getElementById('newRouteModal');
    modal.classList.add('active');
    modal.style.display = 'flex';

    // Verificar GPS antecipadamente (não bloquear abertura do modal)
    checkGPSPermission().catch(err => {
        console.warn('⚠️ GPS não disponível ao abrir modal:', err.message);
        // Apenas aviso, não impede abertura do modal
    });

    // Buscar dados atualizados da API antes de popular selects
    Promise.all([apiGetVehicles(), apiGetDestinations()]).then(([veh, dest]) => {
        vehicles = veh.data || [];
        destinations = dest.data || [];
        populateVehicles();
        populateDestinations();
    }).catch(e => console.warn('Falha ao carregar dados para nova rota:', e));

    // Reset form
    document.getElementById('newRouteForm').reset();

    // Reset incident fields
    const incidentToggle = document.getElementById('routeHasIncident');
    const incidentSection = document.getElementById('incidentSection');
    if (incidentToggle) incidentToggle.checked = false;
    if (incidentSection) incidentSection.style.display = 'none';
    const notes = document.getElementById('routeNotes');
    if (notes) notes.value = '';
    const incidentInput = document.getElementById('routeIncidentPhoto');
    if (incidentInput) incidentInput.value = '';
    const preview = document.getElementById('incidentPhotoPreview');
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    const btnRemove = document.getElementById('btnRemoveIncidentPhoto');
    if (btnRemove) btnRemove.style.display = 'none';
}

// Fechar modal nova rota
function closeNewRouteModal() {
    const modal = document.getElementById('newRouteModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function populateVehicles() {
    const select = document.getElementById('routeVehicle');
    select.innerHTML = '<option value="">Selecione o veículo</option>';

    // Debug: mostrar quantos veículos existem
    console.log('Total de veículos no sistema:', vehicles.length);
    console.log('Veículos:', vehicles);

    // Apenas veículos disponíveis
    const availableVehicles = vehicles.filter(v => v.status === 'disponivel');
    console.log('Veículos disponíveis:', availableVehicles.length);

    availableVehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;

        // Verificar status de manutenção
        let maintenanceIndicator = '';
        const status = checkMaintenanceStatus(vehicle);
        if (status.status === 'overdue') {
            maintenanceIndicator = ' ⚠️ MANUTENÇÃO VENCIDA';
            option.style.color = '#ff6b6b';  // Cor mais clara para melhor contraste
            option.style.backgroundColor = '#3a2828';  // Fundo escuro avermelhado
        } else if (status.status === 'approaching') {
            maintenanceIndicator = ' ⚠️ Manutenção próxima';
            option.style.color = '#ffa94d';  // Cor mais clara para melhor contraste
            option.style.backgroundColor = '#3a3228';  // Fundo escuro amarelado
        }

        // Adicionar indicador visual de status de inspeção
        let inspectionIndicator = '';
        // Buscar status de inspeção de forma assíncrona (se disponível)
        if (typeof apiCheckInspectionCompliance === 'function' && !isOfflineMode) {
            apiCheckInspectionCompliance(vehicle.id).then(response => {
                if (response && response.success) {
                    if (!response.compliant) {
                        if (response.status === 'overdue' || response.status === 'never_inspected') {
                            option.textContent = `${vehicle.plate} - ${vehicle.model}${maintenanceIndicator} 🔴 INSPEÇÃO VENCIDA`;
                            option.style.color = '#ff6b6b';
                            option.style.backgroundColor = '#3a2828';
                        } else if (response.status === 'due_soon') {
                            option.textContent = `${vehicle.plate} - ${vehicle.model}${maintenanceIndicator} 🟡 Inspeção próxima`;
                        }
                    } else {
                        option.textContent = `${vehicle.plate} - ${vehicle.model}${maintenanceIndicator} 🟢`;
                    }
                }
            }).catch(err => console.error('Erro ao verificar inspeção:', err));
        }

        option.textContent = `${vehicle.plate} - ${vehicle.model}${maintenanceIndicator}${inspectionIndicator}`;
        select.appendChild(option);
    });
}

function populateDestinations() {
    const select = document.getElementById('routeDestination');
    select.innerHTML = '<option value="">Selecione o destino</option>';

    const sortedDestinations = [...destinations].sort((a, b) => a.name.localeCompare(b.name));

    sortedDestinations.forEach(destination => {
        const option = document.createElement('option');
        option.value = destination.id;
        const dkm = (destination.distanceKm ?? destination.distancia_km ?? destination.distance);
        option.textContent = dkm != null ? `${destination.name} (${dkm} km)` : `${destination.name}`;
        select.appendChild(option);
    });
}

// Criar nova rota
async function createNewRoute() {
    const vehicleId = parseInt(document.getElementById('routeVehicle').value);
    const destinationId = parseInt(document.getElementById('routeDestination').value);
    const kmDeparture = parseInt(document.getElementById('routeKm').value);
    const hasIncident = document.getElementById('routeHasIncident')?.checked;
    const notes = hasIncident ? (document.getElementById('routeNotes').value || '').trim() : '';
    const photoFile = hasIncident ? (document.getElementById('routeIncidentPhoto').files[0] || null) : null;

    if (!vehicleId || !destinationId || !kmDeparture) {
        alert('Por favor, preencha todos os campos');
        return;
    }

    // Verificar conformidade de inspeção antes de permitir uso do veículo
    if (vehicleId && typeof apiCheckInspectionCompliance === 'function' && !isOfflineMode) {
        try {
            const complianceResponse = await apiCheckInspectionCompliance(vehicleId);
            if (complianceResponse && complianceResponse.success) {
                if (!complianceResponse.compliant) {
                    // Veículo não está em conformidade com inspeção
                    const vehicle = complianceResponse.vehicle;
                    const message = complianceResponse.message;

                    // Mostrar alerta e perguntar se deseja fazer inspeção
                    const shouldInspect = confirm(
                        `⚠️ ATENÇÃO: INSPEÇÃO VENCIDA!\n\n` +
                        `Veículo: ${vehicle ? vehicle.placa : 'ID ' + vehicleId}\n` +
                        `Status: ${message}\n\n` +
                        `A inspeção semanal deste veículo está vencida. ` +
                        `É obrigatório realizar a inspeção antes de usar o veículo.\n\n` +
                        `Deseja realizar a inspeção agora?`
                    );

                    if (shouldInspect) {
                        // Usuário quer fazer inspeção - abrir modal
                        closeNewRouteModal();
                        if (typeof openInspectionModal === 'function') {
                            openInspectionModal();
                            // Pré-selecionar o veículo
                            setTimeout(() => {
                                const inspectionVehicleSelect = document.getElementById('inspectionVehicle');
                                if (inspectionVehicleSelect) {
                                    inspectionVehicleSelect.value = vehicleId;
                                    inspectionVehicleSelect.dispatchEvent(new Event('change'));
                                }
                            }, 100);
                        }
                        return;
                    } else {
                        // Usuário não quer fazer inspeção - cancelar rota
                        showToast('Rota cancelada. Realize a inspeção antes de iniciar viagem.', 'warning');
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao verificar conformidade de inspeção:', error);
            // Em caso de erro na verificação, alertar mas permitir continuar
            if (!confirm('Não foi possível verificar a inspeção do veículo. Deseja continuar mesmo assim?')) {
                return;
            }
        }
    }

    try {
        // ⚠️ VALIDAÇÃO OBRIGATÓRIA: Verificar permissão GPS ANTES de criar rota
        console.log('🔒 Validando permissão GPS antes de criar rota...');
        await checkGPSPermission();
        console.log('✅ GPS autorizado, prosseguindo com criação da rota');

        // Preparar imagem (se houver)
        let incidentPhoto = null;
        if (photoFile) {
            incidentPhoto = await fileToDataURL(photoFile);
        }

        const routeData = {
            vehicleId,
            driverId: currentDriver.id,
            departureTime: toSqlDateTime(new Date()),
            kmDeparture,
            destinationId,
            notes: notes || null,
            incidentPhoto: incidentPhoto || null
        };

        let newUsageId = null;

        // MODO OFFLINE: Salvar no IndexedDB
        if (isOfflineMode) {
            const tempId = await offlineDB.addPendingRoute(routeData);
            newUsageId = `temp_${tempId}`; // ID temporário

            console.log('📴 Rota criada offline com ID temporário:', newUsageId);
            showToast('Rota criada em modo offline', 'info');

            // Adicionar à lista local para exibição imediata
            usageRecords.unshift({
                id: tempId,
                ...routeData,
                status: 'em_uso',
                approvalStatus: 'pendente',
                offline: true,
                tempId: tempId
            });

            await updatePendingCount();
        } else {
            // MODO ONLINE: Enviar para API
            try {
                const response = await apiCreateUsage(routeData);
                newUsageId = response.data?.id || response.id;
                console.log('📡 Rota criada online com ID:', newUsageId);
                showToast('Rota iniciada com sucesso!');
            } catch (error) {
                // Fallback para offline se falhar
                console.warn('⚠️ Falha ao criar rota online, salvando offline');
                const tempId = await offlineDB.addPendingRoute(routeData);
                newUsageId = `temp_${tempId}`;

                usageRecords.unshift({
                    id: tempId,
                    ...routeData,
                    status: 'em_uso',
                    approvalStatus: 'pendente',
                    offline: true,
                    tempId: tempId
                });

                await updatePendingCount();
                showToast('Rota salva offline, será sincronizada', 'warning');
            }
        }

        // Iniciar rastreamento GPS para esta viagem
        if (newUsageId) {
            const gpsStarted = await startGPSTracking(newUsageId, vehicleId);
            if (!gpsStarted) {
                // Se GPS falhar após criar rota, avisar usuário mas não bloquear
                console.warn('⚠️ Rota criada mas GPS não iniciou');
                showToast('Rota criada, mas GPS não pôde ser iniciado', 'warning');
            } else {
                console.log('✅ GPS iniciado para viagem ID:', newUsageId);
            }
        }

        // Atualizar dados da tela (sem reinicializar GPS)
        if (!isOfflineMode) {
            await refreshUsageForDriver();
        }

        // ⚠️ NÃO chamar loadDataFromAPI() pois ele reinicializa o sistema
        // e pode resetar o estado do GPS. GPS já está ativo.

        // Atualizar apenas os dados necessários sem tocar no GPS
        vehicles = (await apiGetVehicles()).data || [];
        destinations = (await apiGetDestinations()).data || [];

        closeNewRouteModal();
        loadStats();
        loadRoutes();

        showToast('Rota iniciada com sucesso!');
    } catch (e) {
        // Mensagem de erro específica (incluindo erros de GPS)
        console.error('❌ Erro ao criar rota:', e);
        alert(e.message || 'Erro ao iniciar rota');
    }
}

function removeIncidentPhoto() {
    const input = document.getElementById('routeIncidentPhoto');
    const preview = document.getElementById('incidentPhotoPreview');
    const btnRemove = document.getElementById('btnRemoveIncidentPhoto');
    if (input) input.value = '';
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    if (btnRemove) btnRemove.style.display = 'none';
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Abrir modal finalizar
function openFinalizeModal(routeId) {
    const route = usageRecords.find(r => r.id === routeId);
    if (!route) return;

    const vehicle = vehicles.find(v => v.id === route.vehicleId);
    const destination = destinations.find(d => d.id === route.destinationId);

    const modal = document.getElementById('finalizeRouteModal');
    modal.classList.add('active');
    modal.style.display = 'flex';

    document.getElementById('finalizeRouteId').value = routeId;

    // Preencher resumo
    const summary = document.getElementById('routeSummary');
    summary.innerHTML = `
        <div class="route-summary-item">
            <span class="route-summary-label">Veículo:</span>
            <span class="route-summary-value">${vehicle ? vehicle.plate : 'N/A'}</span>
        </div>
        <div class="route-summary-item">
            <span class="route-summary-label">Destino:</span>
            <span class="route-summary-value">${destination ? destination.name : 'N/A'}</span>
        </div>
        <div class="route-summary-item">
            <span class="route-summary-label">Saída:</span>
            <span class="route-summary-value">${formatDateTime(route.departure)}</span>
        </div>
        <div class="route-summary-item">
            <span class="route-summary-label">KM Saída:</span>
            <span class="route-summary-value">${route.kmDeparture.toLocaleString()} km</span>
        </div>
    `;

    // Sugerir KM atual (pode ser editado)
    document.getElementById('routeKmFinal').value = '';
    document.getElementById('routeKmFinal').min = route.kmDeparture;
}

// Fechar modal de finalização
function closeFinalizeRouteModal() {
    const modal = document.getElementById('finalizeRouteModal');
    modal.classList.remove('active');
    setTimeout(function() {
        modal.style.display = 'none';
    }, 300);
}

// Finalizar rota
async function finalizeRoute() {
    const routeId = parseInt(document.getElementById('finalizeRouteId').value);
    const kmReturn = parseInt(document.getElementById('routeKmFinal').value);

    const route = usageRecords.find(r => r.id === routeId);
    if (!route) return;

    try {
        // Parar GPS se estiver rastreando esta rota
        if (currentUsageId === routeId) {
            await stopGPSTracking();
        }

        // Backend valida kmReturn > kmDeparture; enviar finalize
        await apiFinalizeUsage(routeId, {
            returnTime: toSqlDateTime(new Date()),
            kmReturn
        });

        // Recarregar dados
        await Promise.all([refreshUsageForDriver(), loadDataFromAPI()]);
        closeFinalizeRouteModal();
        loadStats();
        loadRoutes();

        showToast('Rota finalizada com sucesso!');
    } catch (e) {
        alert(e.message || 'Erro ao finalizar rota');
    }
}

// Utilitários
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(minutes) {
    if (!minutes) return '-';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
}

function showToast(message, type = 'success') {
    // Criar toast simples com tipos diferentes
    const toast = document.createElement('div');

    // Definir cor baseada no tipo
    let backgroundColor = 'rgba(16, 185, 129, 0.95)'; // Verde (success)
    if (type === 'error') {
        backgroundColor = 'rgba(239, 68, 68, 0.95)'; // Vermelho
    } else if (type === 'info') {
        backgroundColor = 'rgba(59, 130, 246, 0.95)'; // Azul
    } else if (type === 'warning') {
        backgroundColor = 'rgba(245, 158, 11, 0.95)'; // Amarelo
    }

    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${backgroundColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Função já definida globalmente (logout)

// Converter Date para formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
function toSqlDateTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// ===========================
// FUNÇÕES DE INSPEÇÃO
// ===========================

// Abrir modal de inspeção
async function openInspectionModal() {
    console.log('Abrindo modal de inspeção...');

    // Limpar formulário
    document.getElementById('inspectionForm').reset();
    document.getElementById('checklistContainer').innerHTML =
        '<div class="loading-checklist"><p>Selecione o tipo de inspeção para carregar o checklist...</p></div>';
    document.getElementById('inspectionStatusSummary').style.display = 'none';

    // Carregar templates se ainda não carregados
    if (templatesArray.length === 0) {
        await loadInspectionTemplates();
    }

    // Verificar se há rota ativa e preencher veículo
    const activeRoutes = usageRecords.filter(u => u.status === 'em_uso');
    if (activeRoutes.length > 0) {
        const activeRoute = activeRoutes[0];
        const vehicleSelect = document.getElementById('inspectionVehicle');
        vehicleSelect.innerHTML = `<option value="${activeRoute.vehicleId}" selected>${activeRoute.vehiclePlate || 'Veículo da rota'}</option>`;
        vehicleSelect.disabled = true;

        // Preencher KM se disponível
        if (activeRoute.departureKm) {
            document.getElementById('inspectionKm').value = activeRoute.departureKm;
        }
    } else {
        // Se não há rota ativa, carregar todos os veículos
        await loadVehiclesForInspection();
    }

    // Preencher ID do motorista
    document.getElementById('inspectionDriverId').value = currentDriver.id;

    // Exibir modal
    document.getElementById('inspectionModal').classList.add('active');
}

// Fechar modal de inspeção
function closeInspectionModal() {
    document.getElementById('inspectionModal').classList.remove('active');
}

// Carregar templates de inspeção
async function loadInspectionTemplates() {
    try {
        const response = await fetch(`${API_URL}/inspections/templates`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            templatesArray = data.data || [];
            console.log(`${templatesArray.length} templates carregados`);
        }
    } catch (error) {
        console.error('Erro ao carregar templates:', error);
        showToast('Erro ao carregar templates de inspeção', 'error');
    }
}

// Carregar veículos para inspeção
async function loadVehiclesForInspection() {
    const select = document.getElementById('inspectionVehicle');
    select.innerHTML = '<option value="">Selecione o veículo</option>';

    for (const vehicle of vehicles) {
        if (vehicle.ativo || vehicle.status === 'disponivel') {
            const option = document.createElement('option');
            option.value = vehicle.id;
            // Adicionar KM atual como data attribute
            option.dataset.km = vehicle.km_atual || vehicle.currentKm || 0;

            // Texto base do veículo
            let vehicleText = `${vehicle.placa || vehicle.plate} - ${vehicle.modelo || vehicle.model}`;

            // Adicionar indicador visual de status de inspeção
            if (typeof apiCheckInspectionCompliance === 'function' && !isOfflineMode) {
                try {
                    const response = await apiCheckInspectionCompliance(vehicle.id);
                    if (response && response.success) {
                        if (!response.compliant) {
                            if (response.status === 'overdue' || response.status === 'never_inspected') {
                                vehicleText += ' 🔴 INSPEÇÃO VENCIDA';
                                option.style.color = '#ff6b6b';
                                option.style.backgroundColor = '#3a2828';
                            } else if (response.status === 'due_soon') {
                                vehicleText += ' 🟡 Inspeção próxima';
                                option.style.color = '#ffa94d';
                                option.style.backgroundColor = '#3a3228';
                            }
                        } else {
                            vehicleText += ' 🟢';
                        }
                    }
                } catch (err) {
                    console.error('Erro ao verificar inspeção:', err);
                }
            }

            option.textContent = vehicleText;
            select.appendChild(option);
        }
    }

    select.disabled = false;
}

// Carregar KM do veículo selecionado
function loadVehicleKm() {
    const select = document.getElementById('inspectionVehicle');
    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption && selectedOption.dataset.km) {
        document.getElementById('inspectionKm').value = selectedOption.dataset.km;
    }
}

// Carregar template de inspeção selecionado
async function loadInspectionTemplate() {
    const tipo = document.getElementById('inspectionType').value;

    if (!tipo) {
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Selecione o tipo de inspeção...</p></div>';
        document.getElementById('inspectionStatusSummary').style.display = 'none';
        return;
    }

    currentInspectionType = tipo;

    // Buscar template correto
    const template = templatesArray.find(t => (t.tipo || t.type) === tipo);

    if (!template) {
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Template não encontrado!</p></div>';
        return;
    }

    document.getElementById('inspectionTemplateId').value = template.id;

    try {
        // Buscar itens do template
        const response = await fetch(`${API_URL}/inspections/templates/${template.id}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success && (data.data.itens || data.data.items)) {
            checklistItens = data.data.itens || data.data.items;
            renderInspectionChecklist();
        } else {
            document.getElementById('checklistContainer').innerHTML =
                '<div class="loading-checklist"><p>Erro ao carregar checklist</p></div>';
        }
    } catch (error) {
        console.error('Erro ao carregar template:', error);
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Erro ao carregar checklist</p></div>';
    }
}

// Renderizar checklist de inspeção
function renderInspectionChecklist() {
    const container = document.getElementById('checklistContainer');

    if (checklistItens.length === 0) {
        container.innerHTML = '<div class="loading-checklist"><p>Nenhum item no template</p></div>';
        return;
    }

    // Agrupar por categoria
    const categorias = {};
    checklistItens.forEach(item => {
        const categoria = item.categoria || item.category;
        if (!categorias[categoria]) {
            categorias[categoria] = [];
        }
        categorias[categoria].push(item);
    });

    let html = '<div class="checklist-mobile">';

    Object.keys(categorias).forEach(categoria => {
        html += `
            <div class="checklist-categoria">
                <h4 class="categoria-titulo">${formatarCategoria(categoria)}</h4>
                <div class="checklist-itens">
        `;

        categorias[categoria].forEach(item => {
            const nomeItem = item.item || item.nome || '';
            const descricaoItem = item.description || item.descricao || '';
            const obrigatorio = item.obrigatorio || item.required;

            let textoItem = nomeItem || descricaoItem || 'Item sem descrição';

            html += `
                <div class="checklist-item" data-item-id="${item.id}">
                    <div class="item-info">
                        <span class="item-nome">${textoItem}</span>
                        ${obrigatorio ? '<span class="badge-required">*</span>' : ''}
                    </div>
                    <div class="item-controles">
                        <select class="item-status" onchange="updateInspectionStatus()">
                            <option value="conforme">Conforme</option>
                            <option value="nao_conforme">Não Conforme</option>
                            <option value="alerta">Alerta</option>
                        </select>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Mostrar resumo de status
    document.getElementById('inspectionStatusSummary').style.display = 'flex';
    updateInspectionStatus();
}

// Atualizar resumo de status da inspeção
function updateInspectionStatus() {
    const itens = document.querySelectorAll('.checklist-item');
    let conformes = 0;
    let naoConformes = 0;
    let alertas = 0;

    itens.forEach(item => {
        const status = item.querySelector('.item-status').value;
        if (status === 'conforme') conformes++;
        else if (status === 'nao_conforme') naoConformes++;
        else if (status === 'alerta') alertas++;
    });

    document.getElementById('itemsConformes').textContent = conformes;
    document.getElementById('itemsNaoConformes').textContent = naoConformes;
    document.getElementById('itemsAlertas').textContent = alertas;
}

// Formatar data e hora para SQL
function formatDateTimeForSQL(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Enviar inspeção
async function submitInspection() {
    try {
        // Validar campos obrigatórios
        const tipo = document.getElementById('inspectionType').value;
        const veiculoId = document.getElementById('inspectionVehicle').value;
        const motoristaId = document.getElementById('inspectionDriverId').value;
        const templateId = document.getElementById('inspectionTemplateId').value;
        const kmVeiculo = document.getElementById('inspectionKm').value;
        const observacoesGerais = document.getElementById('inspectionObservations').value;

        if (!tipo || !veiculoId || !kmVeiculo) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Coletar itens do checklist
        const itensInspecao = [];
        document.querySelectorAll('.checklist-item').forEach(itemDiv => {
            const itemId = itemDiv.dataset.itemId;
            const status = itemDiv.querySelector('.item-status').value;

            itensInspecao.push({
                itemTemplateId: parseInt(itemId),
                status: status,
                observation: null
            });
        });

        // Montar payload
        const payload = {
            vehicleId: parseInt(veiculoId),
            driverId: parseInt(motoristaId),
            templateId: parseInt(templateId),
            type: tipo,
            inspectionDate: formatDateTimeForSQL(new Date()),
            km: parseInt(kmVeiculo),
            generalObservations: observacoesGerais || null,
            items: itensInspecao
        };

        console.log('Enviando inspeção:', payload);

        // Enviar para o backend
        const response = await fetch(`${API_URL}/inspections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showToast('Inspeção salva com sucesso!', 'success');
            closeInspectionModal();
        } else {
            showToast(data.message || 'Erro ao salvar inspeção', 'error');
        }

    } catch (error) {
        console.error('Erro ao salvar inspeção:', error);

        // Se offline, salvar localmente
        if (!navigator.onLine) {
            // TODO: Implementar salvamento offline
            showToast('Modo offline: inspeção será enviada quando conexão voltar', 'warning');
            closeInspectionModal();
        } else {
            showToast('Erro ao salvar inspeção', 'error');
        }
    }
}

// Formatar nome da categoria
function formatarCategoria(categoria) {
    const categorias = {
        'pneus': 'Pneus',
        'fluidos': 'Fluidos',
        'seguranca': 'Segurança',
        'motor': 'Motor',
        'eletrica': 'Sistema Elétrico',
        'documentos': 'Documentação',
        'carroceria': 'Carroceria',
        'interior': 'Interior'
    };

    return categorias[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

// ===========================
// SPEED DIAL FAB
// ===========================

function initSpeedDialFAB() {
    const fabContainer = document.querySelector('.fab-container');
    const fabMain = document.getElementById('fabMain');
    const fabBackdrop = document.getElementById('fabBackdrop');
    const fabSecondaryButtons = document.querySelectorAll('.fab-secondary');

    if (!fabContainer || !fabMain || !fabBackdrop) {
        console.error('Speed Dial FAB elements not found');
        return;
    }

    // Toggle Speed Dial menu
    fabMain.addEventListener('click', () => {
        fabContainer.classList.toggle('active');
    });

    // Fechar ao clicar no backdrop
    fabBackdrop.addEventListener('click', () => {
        fabContainer.classList.remove('active');
    });

    // Ações dos botões secundários
    fabSecondaryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;

            // Fechar Speed Dial
            fabContainer.classList.remove('active');

            // Executar ação
            if (action === 'route') {
                openNewRouteModal();
            } else if (action === 'expense') {
                openExpenseModal();
            } else if (action === 'inspection') {
                openInspectionModal();
            }
        });
    });
}

// ===========================
// MODAL DE DESPESAS
// ===========================

function openExpenseModal() {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');

    if (!modal || !form) {
        console.error('Expense modal elements not found');
        return;
    }

    // Resetar formulário
    form.reset();

    // Auto-preencher veículo da rota ativa
    await populateExpenseVehicle();

    // Auto-preencher data/hora atual
    const now = new Date();
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        dateInput.value = now.toISOString().slice(0, 16);
    }

    // Categoria padrão: abastecimento
    const categorySelect = document.getElementById('expenseCategory');
    if (categorySelect) {
        categorySelect.value = 'abastecimento';
        toggleExpenseFields();
    }

    // Bind dos listeners de cálculo automático
    bindExpenseListeners();

    // Mostrar modal
    modal.classList.add('active');
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function populateExpenseVehicle() {
    const vehicleSelect = document.getElementById('expenseVehicle');
    if (!vehicleSelect) return;

    // Buscar rotas ativas do motorista
    const activeRoutes = usageRecords.filter(r =>
        r.driverId === currentDriver?.id &&
        r.status === 'em_uso'
    );

    if (activeRoutes.length > 0) {
        // Pegar a primeira rota ativa
        const activeRoute = activeRoutes[0];
        const vehicle = vehicles.find(v => v.id === activeRoute.vehicleId);

        if (vehicle) {
            let vehicleText = `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`;

            // Adicionar indicador visual de status de inspeção
            if (typeof apiCheckInspectionCompliance === 'function' && !isOfflineMode) {
                try {
                    const response = await apiCheckInspectionCompliance(vehicle.id);
                    if (response && response.success) {
                        if (!response.compliant) {
                            if (response.status === 'overdue' || response.status === 'never_inspected') {
                                vehicleText += ' 🔴';
                            } else if (response.status === 'due_soon') {
                                vehicleText += ' 🟡';
                            }
                        } else {
                            vehicleText += ' 🟢';
                        }
                    }
                } catch (err) {
                    console.error('Erro ao verificar inspeção:', err);
                }
            }

            vehicleSelect.innerHTML = `
                <option value="${vehicle.id}" selected>
                    ${vehicleText}
                </option>
            `;
            vehicleSelect.disabled = true;
        }
    } else {
        vehicleSelect.innerHTML = '<option value="">Nenhum veículo em uso</option>';
        vehicleSelect.disabled = true;
    }
}

function toggleExpenseFields() {
    const category = document.getElementById('expenseCategory')?.value;
    const fuelFields = document.getElementById('fuelFields');
    const totalInput = document.getElementById('expenseTotal');
    const totalHelper = document.getElementById('expenseTotalHelper');

    if (category === 'abastecimento') {
        // Mostrar campos de combustível
        if (fuelFields) fuelFields.style.display = 'flex';

        // Tornar total readonly (calculado automaticamente)
        if (totalInput) {
            totalInput.readOnly = true;
            totalInput.placeholder = 'Calculado automaticamente';
        }

        if (totalHelper) {
            totalHelper.textContent = 'Calculado automaticamente (litros × preço)';
        }
    } else {
        // Esconder campos de combustível
        if (fuelFields) fuelFields.style.display = 'none';

        // Tornar total editável
        if (totalInput) {
            totalInput.readOnly = false;
            totalInput.placeholder = 'R$ 0,00';
        }

        if (totalHelper) {
            totalHelper.textContent = 'Digite o valor da despesa';
        }

        // Limpar campos de combustível
        const litersInput = document.getElementById('expenseLiters');
        const priceInput = document.getElementById('expensePricePerLiter');
        if (litersInput) litersInput.value = '';
        if (priceInput) priceInput.value = '';
    }
}

function bindExpenseListeners() {
    const litersInput = document.getElementById('expenseLiters');
    const priceInput = document.getElementById('expensePricePerLiter');
    const totalInput = document.getElementById('expenseTotal');

    if (!litersInput || !priceInput || !totalInput) return;

    // Função para calcular total
    const calculateTotal = () => {
        const category = document.getElementById('expenseCategory')?.value;
        if (category !== 'abastecimento') return;

        const liters = parseFloat(litersInput.value) || 0;
        const priceStr = priceInput.value.replace(/[^\d,]/g, '').replace(',', '.');
        const price = parseFloat(priceStr) || 0;

        const total = liters * price;
        totalInput.value = formatCurrency(total);
    };

    // Formatar preço enquanto digita
    priceInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length === 0) {
            e.target.value = '';
            calculateTotal();
            return;
        }

        value = parseInt(value).toString();
        const length = value.length;

        if (length <= 2) {
            value = 'R$ 0,' + value.padStart(2, '0');
        } else {
            const cents = value.slice(-2);
            const reais = value.slice(0, -2);
            value = 'R$ ' + reais + ',' + cents;
        }

        e.target.value = value;
        calculateTotal();
    });

    // Calcular ao mudar litros
    litersInput.addEventListener('input', calculateTotal);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

async function submitExpense() {
    const vehicleId = parseInt(document.getElementById('expenseVehicle')?.value);
    const category = document.getElementById('expenseCategory')?.value;
    const date = document.getElementById('expenseDate')?.value;
    const km = document.getElementById('expenseKm')?.value;
    const liters = document.getElementById('expenseLiters')?.value;
    const priceStr = document.getElementById('expensePricePerLiter')?.value;
    const totalStr = document.getElementById('expenseTotal')?.value;
    const notes = document.getElementById('expenseNotes')?.value;

    // Validações
    if (!vehicleId) {
        showToast('Nenhum veículo disponível. Inicie uma rota primeiro.', 'error');
        return;
    }

    if (!category) {
        showToast('Selecione uma categoria', 'error');
        return;
    }

    if (!date) {
        showToast('Informe a data e hora', 'error');
        return;
    }

    // Validar KM se informado
    if (km) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const currentKm = parseInt(km);

        if (vehicle && currentKm < vehicle.currentKm) {
            showToast('KM não pode ser menor que o KM atual do veículo', 'error');
            return;
        }
    }

    // Preparar dados
    const expenseData = {
        vehicleId,
        category,
        date: toSqlDateTime(new Date(date)),
        currentKm: km ? parseInt(km) : null,
        notes: notes || null
    };

    // Se for abastecimento, incluir litros e preço
    if (category === 'abastecimento') {
        if (!liters || !priceStr) {
            showToast('Informe os litros e o preço por litro', 'error');
            return;
        }

        const price = parseFloat(priceStr.replace(/[^\d,]/g, '').replace(',', '.'));
        expenseData.liters = parseFloat(liters);
        expenseData.pricePerLiter = price;
        expenseData.totalValue = expenseData.liters * expenseData.pricePerLiter;
    } else {
        // Para outras categorias, usar valor total informado
        if (!totalStr) {
            showToast('Informe o valor total da despesa', 'error');
            return;
        }

        const total = parseFloat(totalStr.replace(/[^\d,]/g, '').replace(',', '.'));
        expenseData.totalValue = total;
    }

    try {
        const response = await apiCreateExpense(expenseData);

        if (response.success) {
            showToast('Despesa registrada com sucesso!', 'success');
            closeExpenseModal();

            // Recarregar dados se necessário
            // await loadRoutes();
        } else {
            showToast(response.message || 'Erro ao registrar despesa', 'error');
        }
    } catch (error) {
        console.error('Erro ao registrar despesa:', error);
        showToast('Erro ao registrar despesa', 'error');
    }
}

// Adicionar função global para API de despesas (se não existir em api.js)
async function apiCreateExpense(expenseData) {
    try {
        const response = await fetch('http://localhost:5000/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(expenseData)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===========================
// OFFLINE SUPPORT FUNCTIONS
// ===========================

/**
 * Atualizar contador de itens pendentes
 */
async function updatePendingCount() {
    try {
        const counts = await offlineDB.getPendingCount();
        pendingCount = counts.total;

        // Atualizar badge visual
        updateOfflineBadge(counts);

        return counts;
    } catch (error) {
        console.error('[Offline] Erro ao atualizar contador:', error);
        return { total: 0 };
    }
}

/**
 * Atualizar badge de itens pendentes
 */
function updateOfflineBadge(counts) {
    const badge = document.getElementById('offlinePendingBadge');
    if (!badge) return;

    if (counts.total > 0) {
        badge.textContent = counts.total;
        badge.style.display = 'flex';
        badge.title = `${counts.routes} rotas, ${counts.gps} GPS, ${counts.expenses} despesas, ${counts.finalizations} finalizações`;
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Atualizar indicador de status offline/online
 */
function updateOfflineIndicator(online) {
    const indicator = document.getElementById('offlineIndicator');
    if (!indicator) return;

    if (online) {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        indicator.innerHTML = `
            <svg width="16" height="16" fill="currentColor">
                <circle cx="8" cy="8" r="6" fill="#10b981"/>
            </svg>
            <span>Online</span>
        `;
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        indicator.innerHTML = `
            <svg width="16" height="16" fill="currentColor">
                <circle cx="8" cy="8" r="6" fill="#ef4444"/>
            </svg>
            <span>Offline - ${pendingCount} pendentes</span>
        `;
    }
}

/**
 * Inicializar suporte offline
 */
async function initOfflineSupport() {
    console.log('[Offline] Initializing offline support...');

    // Inicializar IndexedDB
    try {
        await offlineDB.init();
        console.log('[Offline] IndexedDB initialized');
    } catch (error) {
        console.error('[Offline] Error initializing IndexedDB:', error);
        return;
    }

    // Inicializar Sync Manager
    try {
        await syncManager.init();
        console.log('[Offline] Sync Manager initialized');
    } catch (error) {
        console.error('[Offline] Error initializing Sync Manager:', error);
    }

    // Listeners para eventos de sincronização
    syncManager.on('online', async () => {
        console.log('[Offline] Device is online, updating UI');
        isOfflineMode = false;
        updateOfflineIndicator(true);

        // Atualizar dados do cache
        await loadCachedData();
    });

    syncManager.on('offline', () => {
        console.log('[Offline] Device is offline, switching to offline mode');
        isOfflineMode = true;
        updateOfflineIndicator(false);
    });

    syncManager.on('syncCompleted', async (result) => {
        console.log('[Offline] Sync completed:', result);
        showToast(`${result.totalSynced} itens sincronizados`, 'success');

        // Atualizar contador
        await updatePendingCount();

        // Recarregar dados
        await refreshUsageForDriver();
        loadStats();
        loadRoutes();
    });

    syncManager.on('syncFailed', (error) => {
        console.error('[Offline] Sync failed:', error);
        showToast('Erro ao sincronizar dados', 'error');
    });

    // Atualizar contador inicial
    await updatePendingCount();

    // Atualizar indicador inicial
    updateOfflineIndicator(navigator.onLine);

    // Atualizar contador periodicamente
    offlineIndicatorUpdater = setInterval(async () => {
        await updatePendingCount();
    }, 30000); // A cada 30 segundos

    console.log('[Offline] Offline support initialized');
}

/**
 * Carregar dados do cache quando offline
 */
async function loadCachedData() {
    try {
        // Carregar veículos do cache
        const cachedVehicles = await offlineDB.getCachedVehicles();
        if (cachedVehicles.length > 0) {
            vehicles = cachedVehicles;
            console.log('[Offline] Loaded vehicles from cache:', vehicles.length);
        }

        // Carregar destinos do cache
        const cachedDestinations = await offlineDB.getCachedDestinations();
        if (cachedDestinations.length > 0) {
            destinations = cachedDestinations;
            console.log('[Offline] Loaded destinations from cache:', destinations.length);
        }

        // Carregar rotas do cache
        const cachedUsage = await offlineDB.getCachedUsageRecords(currentDriver.id);
        if (cachedUsage.length > 0) {
            usageRecords = cachedUsage.map(normalizeUsageRecord);
            console.log('[Offline] Loaded usage records from cache:', usageRecords.length);
        }

        // Mesclar com dados pendentes
        const pendingRoutes = await offlineDB.getPendingRoutes();
        if (pendingRoutes.length > 0) {
            usageRecords = [...pendingRoutes.map(r => ({
                ...r,
                id: r.tempId,
                status: 'em_uso',
                approvalStatus: 'pendente',
                offline: true
            })), ...usageRecords];
        }

    } catch (error) {
        console.error('[Offline] Error loading cached data:', error);
    }
}

/**
 * Salvar dados no cache
 */
async function cacheCurrentData() {
    try {
        // Cache de veículos
        if (vehicles.length > 0) {
            await offlineDB.cacheVehicles(vehicles);
        }

        // Cache de destinos
        if (destinations.length > 0) {
            await offlineDB.cacheDestinations(destinations);
        }

        // Cache de rotas
        if (usageRecords.length > 0) {
            await offlineDB.cacheUsageRecords(usageRecords);
        }

        console.log('[Offline] Data cached successfully');
    } catch (error) {
        console.error('[Offline] Error caching data:', error);
    }
}
