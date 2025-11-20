// ================================================================
// Módulo de Integração com API Backend - CarControl
// ================================================================
console.log('📦 API module loaded');

// URL base da API - Detecta ambiente automaticamente
const API_URL = (function() {
    // Em produção (via Nginx proxy), usar caminho relativo /api
    // Em desenvolvimento local, usar http://localhost:5000
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const url = isProduction ? '/api' : 'http://localhost:5000';
    console.log('🌐 Ambiente:', isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');
    console.log('🌐 API URL:', url);
    return url;
})();

/**
 * Função genérica para fazer requisições à API
 * @param {string} endpoint - Endpoint da API (ex: '/drivers', '/vehicles')
 * @param {object} options - Opções do fetch (method, body, headers, etc)
 * @returns {Promise<object>} - Resposta da API em JSON
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const fullUrl = `${API_URL}${endpoint}`;
        console.log(`🔵 API Request: ${options.method || 'GET'} ${fullUrl}`);

        const response = await fetch(fullUrl, {
            ...options,
            credentials: 'include', // Importante para enviar/receber cookies de sessão
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        console.log(`🟢 API Response: ${response.status} ${response.statusText} - ${endpoint}`);

        const contentType = response.headers.get('content-type') || '';
        const responseText = await response.text();
        const isJsonResponse = contentType.includes('application/json');

        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}`;

            if (isJsonResponse && responseText) {
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    console.error(`🔴 API Error Data:`, errorData);
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
            } else if (responseText) {
                errorMessage = sanitizeResponseText(responseText) || response.statusText || errorMessage;
            } else {
                errorMessage = response.statusText || errorMessage;
            }

            // Se erro 401 (Unauthorized), redirecionar para login
            if (response.status === 401) {
                // Evitar redirecionar em tentativas de login
                const isLoginAttempt = (endpoint === '/auth/login');
                if (!isLoginAttempt) {
                    console.log('🔴 Sessão expirada, redirecionando para login...');
                    window.location.href = 'index.html';
                    throw new Error('Sessão expirada');
                }
            }

            throw new Error(errorMessage);
        }

        if (!responseText) {
            return {};
        }

        if (!isJsonResponse) {
            const snippet = sanitizeResponseText(responseText).slice(0, 120);
            throw new Error(`Resposta inválida da API: ${snippet || 'conteúdo inesperado'}`);
        }

        let jsonData;
        try {
            jsonData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`🔴 Erro ao parsear JSON (${endpoint}):`, parseError, responseText);
            throw new Error('Resposta JSON inválida da API');
        }

        console.log(`✅ API Success:`, endpoint, jsonData.success ? '✓' : '✗');
        return jsonData;
    } catch (error) {
        console.error(`🔴 Erro na requisição ${endpoint}:`, error);
        throw error;
    }
}

function sanitizeResponseText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ================================================================
// Funções de Autenticação
// ================================================================

/**
 * Fazer login na API
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - Dados do usuário logado
 */
async function apiLogin(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

/**
 * Fazer logout
 */
async function apiLogout() {
    return await apiRequest('/auth/logout', {
        method: 'POST'
    });
}

/**
 * Obter perfil do usuário autenticado
 * @returns {Promise<object>} - Dados do usuário
 */
async function apiGetProfile() {
    return await apiRequest('/auth/profile');
}

/**
 * Verificar se está autenticado
 * @returns {Promise<boolean>}
 */
async function apiCheckAuth() {
    try {
        await apiRequest('/auth/check');
        return true;
    } catch (error) {
        return false;
    }
}

// ================================================================
// Funções de Motoristas (Drivers)
// ================================================================

/**
 * Listar todos os motoristas
 * @returns {Promise<array>}
 */
async function apiGetDrivers() {
    const response = await apiRequest('/drivers');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Buscar motorista por ID
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiGetDriver(id) {
    const response = await apiRequest(`/drivers/${id}`);
    return response.data;
}

/**
 * Criar novo motorista
 * @param {object} driverData - Dados do motorista (name, cnh, cnhExpiry, phone, email, password, photo, etc)
 * @returns {Promise<object>}
 */
async function apiCreateDriver(driverData) {
    return await apiRequest('/drivers', {
        method: 'POST',
        body: JSON.stringify(driverData)
    });
}

/**
 * Atualizar motorista
 * @param {number} id
 * @param {object} driverData
 * @returns {Promise<object>}
 */
async function apiUpdateDriver(id, driverData) {
    return await apiRequest(`/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(driverData)
    });
}

/**
 * Deletar motorista (soft delete)
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiDeleteDriver(id) {
    return await apiRequest(`/drivers/${id}`, {
        method: 'DELETE'
    });
}

// ================================================================
// Funções de Veículos (Vehicles)
// ================================================================

/**
 * Listar todos os veículos
 * @returns {Promise<array>}
 */
async function apiGetVehicles() {
    const response = await apiRequest('/vehicles');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Buscar veículo por ID
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiGetVehicle(id) {
    const response = await apiRequest(`/vehicles/${id}`);
    return response.data;
}

/**
 * Criar novo veículo
 * @param {object} vehicleData - Dados do veículo (plate, brand, model, year, currentKm, photo, etc)
 * @returns {Promise<object>}
 */
async function apiCreateVehicle(vehicleData) {
    return await apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData)
    });
}

/**
 * Atualizar veículo
 * @param {number} id
 * @param {object} vehicleData
 * @returns {Promise<object>}
 */
async function apiUpdateVehicle(id, vehicleData) {
    return await apiRequest(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(vehicleData)
    });
}

/**
 * Deletar veículo (soft delete)
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiDeleteVehicle(id) {
    return await apiRequest(`/vehicles/${id}`, {
        method: 'DELETE'
    });
}

// ================================================================
// Funções de Uso de Veículos (Usage)
// ================================================================

/**
 * Listar todos os registros de uso
 * @returns {Promise<array>}
 */
async function apiGetUsageRecords() {
    const response = await apiRequest('/usage');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Listar registros de uso ativos (em andamento)
 * @returns {Promise<array>}
 */
async function apiGetActiveUsage() {
    const response = await apiRequest('/usage/active');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Criar novo registro de uso
 * @param {object} usageData - Dados do uso (vehicleId, driverId, departure, kmDeparture, route, etc)
 * @returns {Promise<object>}
 */
async function apiCreateUsage(usageData) {
    return await apiRequest('/usage', {
        method: 'POST',
        body: JSON.stringify(usageData)
    });
}

/**
 * Finalizar uso de veículo
 * @param {number} id
 * @param {object} returnData - { kmReturn }
 * @returns {Promise<object>}
 */
async function apiFinalizeUsage(id, returnData) {
    return await apiRequest(`/usage/finalize/${id}`, {
        method: 'POST',
        body: JSON.stringify(returnData)
    });
}

/**
 * Deletar registro de uso
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiDeleteUsage(id) {
    return await apiRequest(`/usage/${id}`, {
        method: 'DELETE'
    });
}

/**
 * Aprovar registro de uso
 * @param {number} id
 * @param {object} data - opcional: { returnTime, kmReturn }
 */
async function apiApproveUsage(id, data = {}) {
    return await apiRequest(`/usage/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Rejeitar registro de uso
 * @param {number} id
 * @param {object} payload - { reason }
 */
async function apiRejectUsage(id, payload) {
    return await apiRequest(`/usage/reject/${id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

// ================================================================
// Funções de Manutenção (Maintenance)
// ================================================================

/**
 * Listar todos os registros de manutenção
 * @returns {Promise<array>}
 */
async function apiGetMaintenance() {
    const response = await apiRequest('/maintenance');
    return response; // Retornar o objeto completo com {success, data, count}
}

// ================================================================
// Funções de Despesas (Expenses)
// ================================================================

async function apiGetExpenses() {
    const response = await apiRequest('/expenses');
    return response;
}

async function apiCreateExpense(expenseData) {
    return await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
    });
}

async function apiDeleteExpense(id) {
    return await apiRequest(`/expenses/${id}`, { method: 'DELETE' });
}

/**
 * Listar alertas de manutenção
 * @returns {Promise<array>}
 */
async function apiGetMaintenanceAlerts() {
    const response = await apiRequest('/maintenance/alerts');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Criar novo registro de manutenção
 * @param {object} maintenanceData - Dados da manutenção (vehicleId, type, date, km, value, description, etc)
 * @returns {Promise<object>}
 */
async function apiCreateMaintenance(maintenanceData) {
    return await apiRequest('/maintenance', {
        method: 'POST',
        body: JSON.stringify(maintenanceData)
    });
}

/**
 * Deletar registro de manutenção
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiDeleteMaintenance(id) {
    return await apiRequest(`/maintenance/${id}`, {
        method: 'DELETE'
    });
}

// ================================================================
// Funções de Destinos (Destinations)
// ================================================================

/**
 * Listar todos os destinos
 * @returns {Promise<object>}
 */
async function apiGetDestinations() {
    const response = await apiRequest('/destinations');
    return response; // Retornar o objeto completo com {success, data, count}
}

/**
 * Buscar destino por ID
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiGetDestination(id) {
    const response = await apiRequest(`/destinations/${id}`);
    return response.data;
}

/**
 * Criar novo destino
 * @param {object} destinationData - Dados do destino (nome, endereco, distancia_km, etc)
 * @returns {Promise<object>}
 */
async function apiCreateDestination(destinationData) {
    return await apiRequest('/destinations', {
        method: 'POST',
        body: JSON.stringify(destinationData)
    });
}

/**
 * Atualizar destino
 * @param {number} id
 * @param {object} destinationData
 * @returns {Promise<object>}
 */
async function apiUpdateDestination(id, destinationData) {
    return await apiRequest(`/destinations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(destinationData)
    });
}

/**
 * Deletar destino (soft delete)
 * @param {number} id
 * @returns {Promise<object>}
 */
async function apiDeleteDestination(id) {
    return await apiRequest(`/destinations/${id}`, {
        method: 'DELETE'
    });
}

// ================================================================
// Funções de Dashboard
// ================================================================

/**
 * Obter estatísticas do dashboard
 * @returns {Promise<object>} - { totalVehicles, totalDrivers, totalUsage, alerts, etc }
 */
async function apiGetDashboardStats() {
    const response = await apiRequest('/dashboard/stats');
    return response.data || {};
}

// ================================================================
// Funções de GPS Tracking
// ================================================================

/**
 * Enviar localização GPS do veículo
 * @param {object} gpsData - { vehicleId, driverId, usageId, latitude, longitude, accuracy, speed, heading }
 * @returns {Promise<object>}
 */
async function apiSendGPS(gpsData) {
    return await apiRequest('/gps/update', {
        method: 'POST',
        body: JSON.stringify(gpsData)
    });
}

/**
 * Obter veículos ativos com última localização
 * @returns {Promise<object>} - { vehicles: [...], count: number }
 */
async function apiGetActiveVehicles() {
    const response = await apiRequest('/gps/active');
    return response.data || { vehicles: [], count: 0 };
}

/**
 * Obter histórico de rota de uma viagem
 * @param {number} usageId
 * @returns {Promise<object>} - { points: [...], totalPoints: number, history: {...} }
 */
async function apiGetRouteHistory(usageId) {
    console.log('🔍 apiGetRouteHistory chamado com usageId:', usageId);
    console.log('🔍 URL completa:', `${API_URL}/gps/history/${usageId}`);
    const response = await apiRequest(`/gps/history/${usageId}`);
    console.log('✅ Resposta da API:', response);
    return response.data || { points: [], totalPoints: 0, history: null };
}

/**
 * Parar rastreamento GPS de uma viagem
 * @param {number} usageId
 * @returns {Promise<object>}
 */
async function apiStopGPS(usageId) {
    return await apiRequest('/gps/stop', {
        method: 'POST',
        body: JSON.stringify({ usageId })
    });
}

/**
 * Obter localização de um veículo específico
 * @param {number} vehicleId
 * @returns {Promise<object>}
 */
async function apiGetVehicleLocation(vehicleId) {
    const response = await apiRequest(`/gps/vehicle/${vehicleId}`);
    return response.data || null;
}

// ================================================================
// Inspeções - Compliance
// ================================================================

/**
 * Verificar conformidade de inspeção de um veículo
 * @param {number} vehicleId - ID do veículo
 * @returns {Promise<Object>} Dados de conformidade
 */
async function apiCheckInspectionCompliance(vehicleId) {
    const response = await apiRequest(`/inspections/compliance/${vehicleId}`);
    return response;
}

/**
 * Obter status de inspeção de todos os veículos
 * @returns {Promise<Object>} Status de inspeção da frota
 */
async function apiGetVehicleInspectionStatus() {
    const response = await apiRequest('/inspections/vehicle-status');
    return response;
}

// ================================================================
// Funções Utilitárias
// ================================================================

/**
 * Mostrar mensagem de erro ao usuário
 * @param {string} message
 */
function showError(message) {
    alert(`Erro: ${message}`);
    console.error(message);
}

/**
 * Mostrar mensagem de sucesso ao usuário
 * @param {string} message
 */
function showSuccess(message) {
    alert(message);
    console.log(message);
}
