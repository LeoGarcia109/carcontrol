// GPS Tracking Module for Dashboard
// Gerenciamento de rastreamento GPS em tempo real

let gpsMap = null;
let routeHistoryMap = null;
let vehicleMarkers = {};
let updateInterval = null;
let currentRouteData = null; // Armazena dados completos da rota selecionada

// Inicializar mapa de rastreamento GPS
function initGPSMap() {
    if (!document.getElementById('gpsMap')) {
        console.warn('Elemento do mapa GPS não encontrado');
        return;
    }

    // Inicializar mapa centrado no Brasil (Brasília)
    gpsMap = L.map('gpsMap').setView([-15.7942, -47.8822], 4);

    // Adicionar camada de tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(gpsMap);

    console.log('Mapa GPS inicializado');
}

// Inicializar mapa de histórico de rotas
function initRouteHistoryMap() {
    if (!document.getElementById('routeHistoryMap')) {
        console.warn('Elemento do mapa de histórico não encontrado');
        return;
    }

    // Inicializar mapa centrado no Brasil
    routeHistoryMap = L.map('routeHistoryMap').setView([-15.7942, -47.8822], 4);

    // Adicionar camada de tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(routeHistoryMap);

    console.log('Mapa de histórico inicializado');
}

// Criar ícone customizado para veículo
function createVehicleIcon(color = '#3b82f6') {
    return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
            <div style="position: relative;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M5 11V17C5 17.5523 5.44772 18 6 18H7C7.55228 18 8 17.5523 8 17V16M19 11H21M19 11V17C19 17.5523 18.5523 18 18 18H17C16.4477 18 16 17.5523 16 17V16M8 16H16M8 16C8 17.1046 7.10457 18 6 18C4.89543 18 4 17.1046 4 16C4 14.8954 4.89543 14 6 14C7.10457 14 8 14.8954 8 16ZM16 16C16 17.1046 16.8954 18 18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div style="position: absolute; top: -8px; right: -8px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; animation: pulse 2s infinite;"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

// Atualizar marcadores de veículos no mapa
async function updateVehicleMarkers() {
    if (!gpsMap) {
        console.warn('Mapa GPS não inicializado');
        return;
    }

    try {
        // Buscar veículos ativos da API
        const data = await apiGetActiveVehicles();
        console.log('📡 Resposta da API /gps/active:', data);

        const vehicles = data.vehicles || [];
        console.log(`🚗 Atualizando ${vehicles.length} veículos ativos no mapa`);

        if (vehicles.length > 0) {
            console.log('🔍 Primeiro veículo:', vehicles[0]);
        }

        // Limpar marcadores antigos que não existem mais
        Object.keys(vehicleMarkers).forEach(vehicleId => {
            const stillActive = vehicles.find(v => v.vehicleId == vehicleId);
            if (!stillActive) {
                gpsMap.removeLayer(vehicleMarkers[vehicleId]);
                delete vehicleMarkers[vehicleId];
            }
        });

        // Atualizar ou criar marcadores para veículos ativos
        vehicles.forEach(vehicle => {
            const { vehicleId, plate, model, latitude, longitude, driverName, timestamp, speed } = vehicle;

            console.log(`📍 Processando veículo ${plate}:`, {
                vehicleId,
                latitude,
                longitude,
                driverName
            });

            if (!latitude || !longitude) {
                console.warn(`⚠️ Veículo ${plate} sem coordenadas GPS`);
                return;
            }

            const position = [parseFloat(latitude), parseFloat(longitude)];
            console.log(`✅ Posição válida para ${plate}:`, position);

            // Se o marcador já existe, atualizar posição
            if (vehicleMarkers[vehicleId]) {
                console.log(`🔄 Atualizando marcador existente de ${plate}`);
                vehicleMarkers[vehicleId].setLatLng(position);
                vehicleMarkers[vehicleId].setPopupContent(createPopupContent(vehicle));
            } else {
                // Criar novo marcador
                console.log(`➕ Criando novo marcador para ${plate}`);
                const marker = L.marker(position, {
                    icon: createVehicleIcon('#3b82f6')
                }).addTo(gpsMap);

                marker.bindPopup(createPopupContent(vehicle));
                vehicleMarkers[vehicleId] = marker;
                console.log(`✨ Marcador criado com sucesso para ${plate}`);
            }
        });

        // Ajustar zoom para mostrar todos os veículos
        if (vehicles.length > 0 && Object.keys(vehicleMarkers).length > 0) {
            const group = L.featureGroup(Object.values(vehicleMarkers));
            gpsMap.fitBounds(group.getBounds().pad(0.1));
        }

        // Atualizar lista de veículos ativos
        updateActiveVehiclesList(vehicles);

    } catch (error) {
        console.error('Erro ao atualizar marcadores de veículos:', error);
    }
}

// Criar conteúdo do popup do marcador
function createPopupContent(vehicle) {
    const { plate, model, driverName, timestamp, speed, accuracy } = vehicle;

    const timeAgo = timestamp ? getTimeAgo(new Date(timestamp)) : 'Desconhecido';
    const speedText = speed ? `${Math.round(speed * 3.6)} km/h` : 'N/A';
    const accuracyText = accuracy ? `±${Math.round(accuracy)}m` : 'N/A';

    return `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
                <strong>${plate}</strong>
            </h4>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Modelo:</strong> ${model || 'N/A'}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Motorista:</strong> ${driverName || 'N/A'}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Velocidade:</strong> ${speedText}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Precisão:</strong> ${accuracyText}
            </p>
            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">
                <em>Atualizado ${timeAgo}</em>
            </p>
        </div>
    `;
}

// Atualizar lista de veículos ativos
function updateActiveVehiclesList(vehicles) {
    const container = document.getElementById('activeVehiclesList');
    if (!container) return;

    if (vehicles.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Nenhum veículo ativo no momento</p>';
        return;
    }

    container.innerHTML = vehicles.map(vehicle => {
        const { plate, model, driverName, timestamp, speed } = vehicle;
        const timeAgo = timestamp ? getTimeAgo(new Date(timestamp)) : 'Desconhecido';
        const speedText = speed ? `${Math.round(speed * 3.6)} km/h` : '-';

        return `
            <div class="stat-card" style="cursor: pointer;" onclick="focusOnVehicle(${vehicle.vehicleId})">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0; font-size: 18px; color: #ffffff;">${plate}</h4>
                        <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.85); font-size: 14px;">${model}</p>
                    </div>
                    <div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        EM ROTA
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <p style="margin: 3px 0; color: rgba(255, 255, 255, 0.75); font-size: 13px;">
                        👤 ${driverName || 'N/A'}
                    </p>
                    <p style="margin: 3px 0; color: rgba(255, 255, 255, 0.75); font-size: 13px;">
                        ⚡ ${speedText}
                    </p>
                    <p style="margin: 3px 0; color: rgba(255, 255, 255, 0.6); font-size: 12px;">
                        🕒 ${timeAgo}
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

// Focar no veículo específico
function focusOnVehicle(vehicleId) {
    const marker = vehicleMarkers[vehicleId];
    if (marker) {
        gpsMap.setView(marker.getLatLng(), 16);
        marker.openPopup();
    }
}

// Calcular tempo decorrido
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins === 1) return 'há 1 minuto';
    if (diffMins < 60) return `há ${diffMins} minutos`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'há 1 hora';
    if (diffHours < 24) return `há ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'há 1 dia';
    return `há ${diffDays} dias`;
}

// Carregar histórico de rotas para o select
async function loadRouteHistoryOptions() {
    try {
        const response = await apiGetUsageRecords();
        const usageRecords = response.data || [];

        // Filtrar apenas viagens finalizadas
        const completedTrips = usageRecords.filter(r => r.status === 'finalizado');

        const select = document.getElementById('routeHistorySelect');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione uma viagem finalizada</option>';

        completedTrips.forEach(trip => {
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            const driver = drivers.find(d => d.id === trip.driverId);
            const destination = destinations.find(d => d.id === trip.destinationId);

            const date = new Date(trip.departureTime).toLocaleDateString('pt-BR');
            const plate = vehicle ? vehicle.plate : 'N/A';
            const driverName = driver ? driver.name : 'N/A';
            const destName = destination ? destination.name : 'N/A';

            const option = document.createElement('option');
            option.value = trip.id;
            option.textContent = `${date} - ${plate} - ${driverName} → ${destName}`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar opções de histórico:', error);
    }
}

// ================================================================
// FUNÇÕES DE CÁLCULO DE ESTATÍSTICAS DE ROTA
// ================================================================

// Converter graus para radianos
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Calcular distância entre dois pontos GPS usando fórmula de Haversine (retorna km)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calcular estatísticas da rota a partir dos pontos GPS
function calculateRouteStats(points) {
    if (!points || points.length < 2) {
        return {
            distancia_total: 0,
            duracao_minutos: 0,
            velocidade_media: 0
        };
    }

    // Calcular distância total usando fórmula de Haversine
    let distanciaTotal = 0;
    for (let i = 1; i < points.length; i++) {
        const lat1 = parseFloat(points[i-1].latitude);
        const lon1 = parseFloat(points[i-1].longitude);
        const lat2 = parseFloat(points[i].latitude);
        const lon2 = parseFloat(points[i].longitude);

        distanciaTotal += haversineDistance(lat1, lon1, lat2, lon2);
    }

    // Calcular duração (diferença entre primeiro e último timestamp)
    const inicio = new Date(points[0].timestamp);
    const fim = new Date(points[points.length - 1].timestamp);
    const duracaoMinutos = (fim - inicio) / (1000 * 60);

    // Calcular velocidade média
    const velocidadeMedia = duracaoMinutos > 0 ? (distanciaTotal / (duracaoMinutos / 60)) : 0;

    return {
        distancia_total: distanciaTotal,
        duracao_minutos: duracaoMinutos,
        velocidade_media: velocidadeMedia
    };
}

// ================================================================
// CARREGAR HISTÓRICO DE ROTA
// ================================================================

// Carregar e exibir histórico de rota
async function loadRouteHistory() {
    const select = document.getElementById('routeHistorySelect');
    const usageId = select.value;

    const mapDiv = document.getElementById('routeHistoryMap');
    const infoDiv = document.getElementById('routeHistoryInfo');

    if (!usageId) {
        mapDiv.style.display = 'none';
        infoDiv.style.display = 'none';
        return;
    }

    try {
        // Buscar histórico de rota da API
        const data = await apiGetRouteHistory(usageId);
        console.log('📍 Dados recebidos:', data);
        console.log('📍 Pontos GPS:', data.points);
        const points = data.points || [];

        if (points.length === 0) {
            alert('Não há pontos GPS registrados para esta viagem');
            return;
        }

        // Mostrar elementos
        mapDiv.style.display = 'block';
        infoDiv.style.display = 'block';

        // Inicializar mapa se necessário
        if (!routeHistoryMap) {
            initRouteHistoryMap();
        }

        // Limpar camadas anteriores
        routeHistoryMap.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                routeHistoryMap.removeLayer(layer);
            }
        });

        // Criar array de coordenadas
        const coordinates = points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);

        // Desenhar rota
        const polyline = L.polyline(coordinates, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7
        }).addTo(routeHistoryMap);

        // Adicionar marcadores de início e fim
        if (coordinates.length > 0) {
            // Marcador de início (verde)
            L.marker(coordinates[0], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(routeHistoryMap).bindPopup('Início da viagem');

            // Marcador de fim (vermelho)
            L.marker(coordinates[coordinates.length - 1], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(routeHistoryMap).bindPopup('Fim da viagem');
        }

        // ⚡ CRUCIAL: Forçar recálculo do tamanho e ajustar zoom
        // Isso resolve tiles parciais/cinzas do Leaflet e garante zoom correto
        setTimeout(() => {
            routeHistoryMap.invalidateSize();
            // Ajustar zoom APÓS invalidateSize para usar dimensões corretas
            routeHistoryMap.fitBounds(polyline.getBounds().pad(0.1));
        }, 100);

        // Exibir informações da rota
        // Se history null, calcular estatísticas a partir dos pontos GPS
        const history = data.history || calculateRouteStats(points);

        // Formatar valores para exibição
        const totalPontos = data.totalPoints || points.length;
        const distancia = history.distancia_total ? history.distancia_total.toFixed(2) + ' km' : 'N/A';
        const duracao = history.duracao_minutos ? Math.round(history.duracao_minutos) + ' min' : 'N/A';
        const velocidade = history.velocidade_media ? Math.round(history.velocidade_media) + ' km/h' : 'N/A';

        infoDiv.innerHTML = `
            <div class="stat-card">
                <h4 style="color: #ffffff; margin: 0 0 15px 0;">Informações da Rota</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div>
                        <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0;">Total de Pontos</p>
                        <p style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 5px 0 0 0;">${totalPontos}</p>
                    </div>
                    <div>
                        <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0;">Distância Total</p>
                        <p style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 5px 0 0 0;">${distancia}</p>
                    </div>
                    <div>
                        <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0;">Duração</p>
                        <p style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 5px 0 0 0;">${duracao}</p>
                    </div>
                    <div>
                        <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0;">Velocidade Média</p>
                        <p style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 5px 0 0 0;">${velocidade}</p>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar histórico de rota:', error);
        alert('Erro ao carregar histórico de rota');
    }
}

// Iniciar atualização automática do mapa
function startAutoUpdate() {
    // Atualizar imediatamente
    updateVehicleMarkers();

    // Configurar atualização a cada 10 segundos
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    updateInterval = setInterval(() => {
        updateVehicleMarkers();
    }, 180000); // 3 minutos (180 segundos)

    console.log('Atualização automática do mapa GPS iniciada (3 minutos)');
}

// Parar atualização automática
function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('Atualização automática do mapa GPS parada');
    }
}

// Expor funções globalmente
window.focusOnVehicle = focusOnVehicle;
window.loadRouteHistory = loadRouteHistory;

// ================================================================
// TAB SYSTEM - GERENCIAMENTO DE ABAS
// ================================================================

// Inicializar tab system
function initGPSTabs() {
    const tabButtons = document.querySelectorAll('.gps-tab-btn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchGPSTab(tabName);
        });
    });

    console.log('✅ Tab system inicializado');
}

// Trocar aba
function switchGPSTab(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);
    console.log('🔍 DEBUG - Verificando elemento tab-' + tabName);
    console.log('🔍 DEBUG - Panel existe?', document.getElementById(`tab-${tabName}`) !== null);
    console.log('🔍 DEBUG - Button existe?', document.querySelector(`[data-tab="${tabName}"]`) !== null);

    // Desativar todas as abas e botões
    document.querySelectorAll('.gps-tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });

    document.querySelectorAll('.gps-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ativar aba selecionada
    const panel = document.getElementById(`tab-${tabName}`);
    const button = document.querySelector(`[data-tab="${tabName}"]`);

    if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
        console.log('✅ DEBUG - Panel ativado');
    } else {
        console.error('❌ DEBUG - Panel NÃO encontrado!');
    }

    if (button) {
        button.classList.add('active');
        console.log('✅ DEBUG - Button ativado');
    } else {
        console.error('❌ DEBUG - Button NÃO encontrado!');
    }

    // Forçar recálculo dos mapas após troca de aba
    setTimeout(() => {
        console.log('⏰ DEBUG - Timeout executado para tab:', tabName);
        console.log('⏰ DEBUG - É history?', tabName === 'history');

        if (tabName === 'realtime' && gpsMap) {
            gpsMap.invalidateSize();
            console.log('✅ Mapa tempo real redimensionado');
        } else if (tabName === 'history') {
            console.log('📍 DEBUG - Entrando no bloco history');
            if (routeHistoryMap) {
                routeHistoryMap.invalidateSize();
                console.log('✅ Mapa histórico redimensionado');
            } else {
                initRouteHistoryMap();
                console.log('✅ Mapa histórico inicializado');
            }
            console.log('📍 DEBUG - Chamando loadRouteList()...');
            loadRouteList();
        }
    }, 100);
}

// ================================================================
// ROUTE HISTORY SIDEBAR
// ================================================================

// Carregar lista de rotas para sidebar
async function loadRouteList() {
    console.log('🚀 DEBUG - loadRouteList() CHAMADA');

    try {
        console.log('📋 Carregando lista de rotas para sidebar...');
        const response = await apiGetUsageRecords();

        console.log('🔍 DEBUG - Response completa:', response);
        console.log('🔍 DEBUG - Response.success:', response.success);
        console.log('🔍 DEBUG - Response.data:', response.data);

        if (response.success) {
            const routes = response.data || [];
            console.log('🔍 DEBUG - Total de rotas recebidas da API:', routes.length);
            console.log('🔍 DEBUG - Primeira rota:', routes[0]);

            // Log detalhado dos status de todas as rotas
            const statusCount = {};
            routes.forEach(r => {
                statusCount[r.status] = (statusCount[r.status] || 0) + 1;
            });
            console.log('🔍 DEBUG - Contagem por status:', statusCount);

            // Filtrar apenas rotas com status 'finalizado' (ENUM do banco de dados)
            const finalized = routes.filter(r => r.status === 'finalizado');
            console.log(`✅ ${finalized.length} rotas finalizadas encontradas (de ${routes.length} totais)`);

            if (finalized.length > 0) {
                console.log('🔍 DEBUG - Primeiras 3 rotas finalizadas:', finalized.slice(0, 3));
            }

            renderRouteSidebar(finalized);
        } else {
            console.error('❌ Erro ao carregar rotas:', response.message);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar lista de rotas:', error);
    }
}

// Renderizar cards de rotas no sidebar
function renderRouteSidebar(routes) {
    const sidebar = document.getElementById('routeSidebar');

    if (!sidebar) {
        console.warn('⚠️ Sidebar não encontrado');
        return;
    }

    if (routes.length === 0) {
        sidebar.innerHTML = '<p style="text-align: center; color: var(--gray-500); margin-top: 20px;">Nenhuma viagem finalizada</p>';
        return;
    }

    sidebar.innerHTML = routes.map(route => {
        // Compatibilidade camelCase e snake_case
        const plate = route.vehiclePlate || route.vehicle_plate || route.placa || 'N/A';
        const driver = route.driverName || route.driver_name || route.motorista || 'N/A';
        // API retorna departureTime/returnTime (camelCase)
        const saida = route.departureTime || route.data_hora_saida || route.dataHoraSaida;
        const retorno = route.returnTime || route.data_hora_retorno || route.dataHoraRetorno;

        const saidaFormatted = saida ? formatDateTime(saida) : 'N/A';
        const retornoFormatted = retorno ? formatDateTime(retorno) : 'N/A';

        console.log(`🔍 DEBUG - Renderizando card rota #${route.id}:`, { plate, driver, saida, retorno });

        // Preparar dados da rota para data-attribute
        const routeJson = JSON.stringify(route);

        return `
            <div class="route-card" data-route="${routeJson.replace(/"/g, '&quot;')}" onclick="selectRouteFromSidebar(${route.id}, this, JSON.parse(this.dataset.route))">
                <div class="route-card-header">
                    <strong>${plate}</strong>
                    <span class="badge badge-success">Finalizado</span>
                </div>
                <div class="route-card-body">
                    <p>Motorista: ${driver}</p>
                    <p>Saída: ${saidaFormatted}</p>
                    <p>Retorno: ${retornoFormatted}</p>
                </div>
            </div>
        `;
    }).join('');

    console.log(`✅ ${routes.length} route cards renderizados`);
}

// Selecionar rota do sidebar e exibir no mapa
function selectRouteFromSidebar(usageId, element, routeData = null) {
    console.log(`🎯 Rota selecionada: ${usageId}`);

    // Armazenar dados completos da rota
    currentRouteData = routeData;
    console.log('📦 Dados da rota armazenados:', currentRouteData);

    // Remover active de todos os cards
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.remove('active');
    });

    // Adicionar active ao card clicado
    if (element) {
        element.classList.add('active');
    }

    // Carregar rota no mapa
    loadRouteHistoryFromSidebar(usageId);
}

// Carregar histórico de rota no mapa (versão sidebar)
async function loadRouteHistoryFromSidebar(usageId) {
    try {
        console.log(`📡 Carregando histórico da rota ${usageId}...`);

        // apiGetRouteHistory() JÁ retorna response.data diretamente
        // Retorno: {points: [...], totalPoints: number, history: {...}}
        const data = await apiGetRouteHistory(usageId);
        console.log('📍 Dados retornados:', data);

        const points = data.points || [];
        console.log(`📍 ${points.length} pontos GPS recebidos`, points[0]);

        if (points.length === 0) {
            showAlert('Nenhum ponto GPS registrado para esta viagem', 'warning');
            return;
        }

        // Limpar mapa
        if (routeHistoryMap) {
            routeHistoryMap.eachLayer(layer => {
                if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                    routeHistoryMap.removeLayer(layer);
                }
            });
        }

        // Desenhar rota
        const latLngs = points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);
        const polyline = L.polyline(latLngs, {
            color: '#667eea',
            weight: 4,
            opacity: 0.8
        }).addTo(routeHistoryMap);

        // Marcadores início/fim
        const start = latLngs[0];
        const end = latLngs[latLngs.length - 1];

        L.marker(start, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #10b981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚀</div>',
                iconSize: [30, 30]
            })
        }).addTo(routeHistoryMap).bindPopup('<strong>Início da viagem</strong>');

        L.marker(end, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏁</div>',
                iconSize: [30, 30]
            })
        }).addTo(routeHistoryMap).bindPopup('<strong>Fim da viagem</strong>');

        // Ajustar zoom
        setTimeout(() => {
            routeHistoryMap.invalidateSize();
            routeHistoryMap.fitBounds(polyline.getBounds().pad(0.1));
            console.log('✅ Zoom ajustado para rota');
        }, 100);

        // Exibir card flutuante com informações
        displayRouteInfoOverlay(data);

    } catch (error) {
        console.error('❌ Erro ao carregar rota:', error);
        showAlert('Erro ao carregar rota', 'danger');
    }
}

// Exibir card flutuante sobre o mapa
function displayRouteInfoOverlay(data) {
    const overlay = document.getElementById('routeInfoOverlay');

    if (!overlay) {
        console.warn('⚠️ Overlay não encontrado');
        return;
    }

    const points = data.points || [];
    const history = data.history || calculateRouteStats(points);
    const usage = data.usage || {}; // Dados da viagem da API

    // Fallback: usar currentRouteData se usage não estiver disponível
    const routeData = usage.destination ? usage : (currentRouteData || {});

    const totalPontos = data.totalPoints || points.length;
    const distancia = history.distancia_total ? history.distancia_total.toFixed(2) + ' km' : 'N/A';

    // Priorizar duração do banco de dados (usage ou currentRouteData)
    let duracao = 'N/A';
    if (usage.departureTime && usage.returnTime) {
        // Calcular duração a partir de timestamps da API
        const saida = new Date(usage.departureTime).getTime();
        const retorno = new Date(usage.returnTime).getTime();
        const minutos = Math.round((retorno - saida) / 1000 / 60);
        duracao = minutos + ' min';
    } else if (routeData.departureTime && routeData.returnTime) {
        // Fallback para currentRouteData
        const saida = new Date(routeData.departureTime).getTime();
        const retorno = new Date(routeData.returnTime).getTime();
        const minutos = Math.round((retorno - saida) / 1000 / 60);
        duracao = minutos + ' min';
    } else if (history.duracao_minutos || history.durationMinutes) {
        // Fallback para dados do histórico
        duracao = Math.round(history.duracao_minutos || history.durationMinutes) + ' min';
    }

    const velocidade = history.velocidade_media ? Math.round(history.velocidade_media) + ' km/h' : 'N/A';

    // Obter destino (priorizar API, fallback para currentRouteData)
    const destino = usage.destination || routeData.destination || routeData.destino || 'N/A';

    console.log('🔍 DEBUG Overlay - usage:', usage);
    console.log('🔍 DEBUG Overlay - destino:', destino);

    overlay.innerHTML = `
        <div class="route-stat-item">
            <span class="route-stat-label">Pontos:</span>
            <span class="route-stat-value">${totalPontos}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Distância:</span>
            <span class="route-stat-value">${distancia}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Duração:</span>
            <span class="route-stat-value">${duracao}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Vel. Média:</span>
            <span class="route-stat-value">${velocidade}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Destino:</span>
            <span class="route-stat-value">${destino}</span>
        </div>
    `;

    overlay.style.display = 'block';
    console.log('✅ Overlay de informações exibido com destino:', destino);
}

// Expor novas funções globalmente
window.initGPSTabs = initGPSTabs;
window.switchGPSTab = switchGPSTab;
window.selectRouteFromSidebar = selectRouteFromSidebar;
