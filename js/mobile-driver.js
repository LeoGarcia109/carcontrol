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
        }, 180000); // Atualizar a cada 3 minutos (180 segundos)

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
        // Enviar para o servidor
        await apiSendGPS(gpsData);
        console.log('GPS enviado:', {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            accuracy: Math.round(coords.accuracy) + 'm'
        });

        lastGpsPosition = {
            latitude: coords.latitude,
            longitude: coords.longitude
        };
        lastGpsTimestamp = currentTimestamp;

        // Atualizar indicador visual
        updateGPSIndicator(true);

    } catch (error) {
        console.error('Erro ao enviar GPS:', error);
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

    // Carregar dados da API (veículos, rotas, destinos)
    await loadDataFromAPI();

    // Resolver motorista atual preferindo a API (usa motorista_id da sessão)
    try {
        if (user.motorista_id) {
            const apiDriver = await apiGetDriver(user.motorista_id);
            if (apiDriver) {
                currentDriver = apiDriver;
            }
        }
    } catch (e) {
        console.warn('Falha ao carregar motorista pela API, tentando localStorage...', e);
    }

    // Fallback: tentar localizar motorista pela API via email (caso não tenha motorista_id)
    if (!currentDriver && user.email) {
        try {
            const allDrivers = await apiGetDrivers();
            const list = allDrivers.data || [];
            currentDriver = list.find(d => d.email === user.email) || null;
        } catch (_) {}
    }

    if (!currentDriver) {
        alert('Motorista não encontrado no sistema. Entre em contato com o administrador.');
        logout();
        return;
    }

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

    // Tornar funções acessíveis para onclick handlers
    // IMPORTANTE: NÃO sobrescrever logout - usar a do auth.js
    window.openNewRouteModal = openNewRouteModal;
    window.closeNewRouteModal = closeNewRouteModal;
    window.filterRoutes = filterRoutes;
    window.closeFinalizeRouteModal = closeFinalizeRouteModal;
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
    try {
        const [vehResp, destResp, drvResp] = await Promise.all([
            apiGetVehicles(),
            apiGetDestinations(),
            apiGetDrivers()
        ]);
        vehicles = vehResp.data || [];
        destinations = destResp.data || [];
        drivers = drvResp.data || [];
    } catch (e) {
        console.error('Erro ao carregar dados base:', e);
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

        option.textContent = `${vehicle.plate} - ${vehicle.model}${maintenanceIndicator}`;
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

        // Enviar para API e criar registro de uso
        const response = await apiCreateUsage({
            vehicleId,
            driverId: currentDriver.id,
            departureTime: toSqlDateTime(new Date()),
            kmDeparture,
            destinationId,
            notes: notes || null,
            incidentPhoto: incidentPhoto || null
        });

        // Obter o ID da nova viagem criada
        const newUsageId = response.data?.id || response.id;

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
        await refreshUsageForDriver();

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
