// Sistema Principal - Controle de Veículos
// Gerenciamento de dados em localStorage para demonstração
// Em produção, substitua por chamadas para backend/API

// Dados iniciais (podem ser expandidos conforme necessário)
let vehicles = [];
let drivers = [];
let usageRecords = [];
let maintenanceRecords = [];
let destinations = [];
let expenses = [];
let expenseListenersBound = false;

// Variáveis do mapa GPS do dashboard
let dashboardGpsMap = null;
let dashboardVehicleMarkers = {};

// Função para inicializar o sistema
async function initSystem() {
    try {
        // Verificar se usuário está logado via API
        const currentUser = await loadCurrentUser();

        if (!currentUser) {
            console.log('Usuário não autenticado, redirecionando...');
            window.location.href = 'index.html';
            return;
        }

        console.log('Usuário autenticado:', currentUser);

        // Configurar interface baseada no tipo de usuário
        setupUserInterface(currentUser);

        // Carregar dados da API
        // Primeiro: carregar dados de referência (veículos, motoristas, destinos)
        await loadVehiclesTable();
        await loadDriversTable();
        await loadDestinationsTable();
        // Depois: carregar dados que dependem das referências (uso, manutenção, despesas)
        await loadUsageTable();
        await loadMaintenanceTable();
        await loadExpensesTable();

        // Atualizar dashboard e alertas
        await updateDashboardStats();
        loadAlerts();

        // Popular selects de destinos
        populateDestinationSelects();

        // Popular filtros de uso de veículos e atualizar KPIs
        populateUsageFilterSelects();
        updateUsageKPIs();
        updateRankings();

        // Inicializar gráficos
        initCharts();

        // Inicializar mapa GPS do dashboard
        setTimeout(() => {
            initDashboardGpsMap();
            updateDashboardMapMarkers();
        }, 500);

        // Atualizar mapa a cada 30 segundos
        setInterval(updateDashboardMapMarkers, 30000);

        // Restaurar estado da sidebar
        restoreSidebarState();

        // Configurar formulários
        setupEventListeners();

        // Alertas de manutenção são exibidos apenas na seção "Alertas" e no Dashboard
        // checkAndDisplayMaintenanceAlerts(); // REMOVIDO - seção #maintenanceAlerts foi removida

    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        showAlert('Erro ao carregar dados do sistema', 'danger');
    }
}

// Função para configurar interface baseada no tipo de usuário
function setupUserInterface(user) {
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.header');
    
    // Configurar badge de role
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
        roleBadge.className = `user-role-badge role-${user.role}`;
        roleBadge.textContent = user.role === 'admin' ? 'Admin' : 
                               user.role === 'user' ? 'Usuário' : 'Motorista';
    }

    // Configurar classe CSS para o dashboard
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
        dashboard.classList.add(user.role);
    }
    
    if (user.role === 'motorista') {
        // Ocultar seções que motoristas não devem ver
        const sectionsToHide = ['cadastros', 'manutencao'];
        sectionsToHide.forEach(sectionId => {
            const navLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
            if (navLink) {
                navLink.parentElement.style.display = 'none';
            }
        });

        // Modificar header para motorista
        if (header) {
            const welcomeMsg = document.getElementById('welcomeMessage');
            if (welcomeMsg) {
                welcomeMsg.textContent = `Bem-vindo, ${user.name} (Motorista)`;
            }
        }

        // Adicionar botão de alterar senha para motoristas
        addChangePasswordButton();

        // Ocultar botões de ações administrativas na tabela de motoristas
        setTimeout(() => {
            const driverActionButtons = document.querySelectorAll('#driversTableBody .btn');
            driverActionButtons.forEach(btn => {
                btn.style.display = 'none';
            });
        }, 100);
    }
}

// Função para carregar dados de exemplo
function loadSampleData() {
    // Verificar se já existem dados no localStorage antes de adicionar exemplos
    const hasStoredData = localStorage.getItem('vehicles') ||
                          localStorage.getItem('drivers') ||
                          localStorage.getItem('usageRecords');

    // Só adicionar dados de exemplo se NÃO houver NADA no localStorage E arrays estiverem vazios
    if (!hasStoredData && vehicles.length === 0) {
        vehicles = [
            {
                id: 1,
                plate: 'ABC-1234',
                brand: 'Fiat',
                model: 'Uno',
                year: 2020,
                initialKm: 40000,
                currentKm: 45000,
                maintenanceKmInterval: 10000,
                maintenanceTimeInterval: 6,
                lastMaintenanceKm: 40000,
                lastMaintenanceDate: '2024-10-01',
                nextMaintenanceKm: 50000,
                nextMaintenanceDate: '2025-04-01',
                status: 'disponivel',
                createdAt: '2024-01-15T10:00:00.000Z'
            },
            {
                id: 2,
                plate: 'DEF-5678',
                brand: 'Chevrolet',
                model: 'Onix',
                year: 2021,
                initialKm: 28000,
                currentKm: 32000,
                maintenanceKmInterval: 12000,
                maintenanceTimeInterval: 6,
                lastMaintenanceKm: 30000,
                lastMaintenanceDate: '2024-09-15',
                nextMaintenanceKm: 42000,
                nextMaintenanceDate: '2025-03-15',
                status: 'em-uso',
                createdAt: '2024-02-20T14:30:00.000Z'
            },
            {
                id: 3,
                plate: 'GHI-9012',
                brand: 'Volkswagen',
                model: 'Gol',
                year: 2019,
                initialKm: 55000,
                currentKm: 62000,
                maintenanceKmInterval: 5000,
                maintenanceTimeInterval: 3,
                lastMaintenanceKm: 60000,
                lastMaintenanceDate: '2024-10-15',
                nextMaintenanceKm: 65000,
                nextMaintenanceDate: '2025-01-15',
                status: 'manutencao',
                createdAt: '2024-03-10T09:15:00.000Z'
            }
        ];
    }

    if (!hasStoredData && drivers.length === 0) {
        drivers = [
            {
                id: 1,
                name: 'João Silva Santos',
                cnh: '12345678901',
                cnhExpiry: '2025-12-15',
                phone: '(11) 99999-1111',
                email: 'joao.silva@empresa.com',
                status: 'ativo',
                createdAt: '2024-01-10T08:00:00.000Z'
            },
            {
                id: 2,
                name: 'Maria Oliveira',
                cnh: '98765432109',
                cnhExpiry: '2025-11-20',
                phone: '(11) 98888-2222',
                email: 'maria.oliveira@empresa.com',
                status: 'ativo',
                createdAt: '2024-01-12T10:30:00.000Z'
            },
            {
                id: 3,
                name: 'Pedro Costa',
                cnh: '45678912345',
                cnhExpiry: '2026-03-10',
                phone: '(11) 97777-3333',
                email: 'pedro.costa@empresa.com',
                status: 'ativo',
                createdAt: '2024-02-05T15:45:00.000Z'
            }
        ];
    }

    if (!hasStoredData && usageRecords.length === 0) {
        usageRecords = [
            {
                id: 1,
                vehicleId: 1,
                driverId: 1,
                departure: '2024-11-01T08:00:00',
                kmDeparture: 44500,
                return: '2024-11-01T17:00:00',
                kmReturn: 44750,
                route: 'Centro - Zona Norte - Retorno',
                status: 'finalizado',
                createdAt: '2024-11-01T08:00:00.000Z'
            },
            {
                id: 2,
                vehicleId: 2,
                driverId: 2,
                departure: '2024-11-01T09:30:00',
                kmDeparture: 31500,
                route: 'Entrega de documentos - Centro Empresarial',
                status: 'em-uso',
                createdAt: '2024-11-01T09:30:00.000Z'
            }
        ];
    }

    if (!hasStoredData && maintenanceRecords.length === 0) {
        maintenanceRecords = [
            {
                id: 1,
                vehicleId: 3,
                type: 'revisão',
                date: '2024-10-15',
                km: 60000,
                value: 850.50,
                description: 'Revisão completa - troca de óleo, filtros e velas',
                createdAt: '2024-10-15T14:00:00.000Z'
            },
            {
                id: 2,
                vehicleId: 1,
                type: 'pneus',
                date: '2024-09-20',
                km: 43000,
                value: 1200.00,
                description: 'Troca dos 4 pneus',
                createdAt: '2024-09-20T11:30:00.000Z'
            }
        ];
    }

    if (!hasStoredData && destinations.length === 0) {
        destinations = [
            {
                id: 1,
                name: 'Centro - Matriz',
                distanceKm: 15,
                createdAt: '2024-01-10T08:00:00.000Z'
            },
            {
                id: 2,
                name: 'Aeroporto Internacional',
                distanceKm: 45,
                createdAt: '2024-01-10T08:00:00.000Z'
            },
            {
                id: 3,
                name: 'Filial - Zona Norte',
                distanceKm: 22,
                createdAt: '2024-01-10T08:00:00.000Z'
            },
            {
                id: 4,
                name: 'Filial - Zona Sul',
                distanceKm: 18,
                createdAt: '2024-01-10T08:00:00.000Z'
            },
            {
                id: 5,
                name: 'Fornecedor ABC',
                distanceKm: 35,
                createdAt: '2024-01-10T08:00:00.000Z'
            }
        ];
    }

    // Só salvar dados de exemplo se foram realmente criados (primeira execução)
    if (!hasStoredData) {
        saveDataToStorage();

        // Criar usuários para os motoristas de exemplo
        drivers.forEach(driver => {
            if (!getUserByMotoristaId(driver.id)) {
                createMotoristaUser(driver);
            }
        });
    }
}

// REMOVIDO: Funções de localStorage não são mais necessárias
// Os dados agora são carregados da API em tempo real
// Mantidas as variáveis globais apenas para cache em memória durante a sessão

// Funções vazias para manter compatibilidade temporária
function saveDataToStorage() {
    // Dados agora são salvos automaticamente na API via PUT/POST
}

function loadSampleData() {
    // Backend já tem dados de exemplo
}

// Função para navegar entre seções
// Função para toggle da sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    // Salvar estado no localStorage
    localStorage.setItem('sidebarCollapsed', isCollapsed);

    // Atualizar gráficos após a transição para ajustar ao novo tamanho
    setTimeout(() => {
        updateAllCharts();
    }, 300);

    // Reinicializar ícones Lucide após toggle
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 50);
}

// Função para restaurar estado da sidebar
function restoreSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const sidebar = document.getElementById('sidebar');

    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
    }
}

function showSection(sectionId) {
    console.log('Mostrando seção:', sectionId);

    // Ocultar todas as seções
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar seção selecionada
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        console.log('Seção ativada:', sectionId);

        // Se for a seção de despesas, recarregar os dados
        if (sectionId === 'despesas') {
            loadExpensesTable();
        }

        // Se for a seção de rastreamento GPS, inicializar mapa
        if (sectionId === 'rastreamento') {
            setTimeout(() => {
                if (typeof initGPSMap === 'function' && !gpsMap) {
                    initGPSMap();
                    initRouteHistoryMap();
                }
                if (typeof initGPSTabs === 'function') {
                    initGPSTabs();
                }
                if (typeof startAutoUpdate === 'function') {
                    startAutoUpdate();
                }
                if (typeof loadRouteHistoryOptions === 'function') {
                    loadRouteHistoryOptions();
                }
            }, 100);
        } else {
            // Parar atualização automática quando sair da seção
            if (typeof stopAutoUpdate === 'function') {
                stopAutoUpdate();
            }
        }
    } else {
        console.error('Seção não encontrada:', sectionId);
    }

    // Atualizar navegação ativa
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');

    // Recarregar dados da seção se necessário
    if (sectionId === 'dashboard') {
        updateDashboardStats();
    }
}

// Função para controlar navegação entre tabs de Cadastros
function showCadastroTab(tabId) {
    console.log('Mostrando tab de cadastro:', tabId);

    // Ocultar todas as tabs de cadastro
    const tabs = document.querySelectorAll('.cadastro-tab-panel');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Mostrar tab selecionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
        console.log('Tab ativada:', tabId);
    } else {
        console.error('Tab não encontrada:', tabId);
    }

    // Atualizar botões de tab ativos
    const tabButtons = document.querySelectorAll('.cadastro-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Marcar botão ativo (busca pelo onclick que contém o tabId)
    const activeButton = document.querySelector(`.cadastro-tab-btn[onclick="showCadastroTab('${tabId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Função para abrir modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';

        // Resetar formulários apenas se não houver ID (modo novo)
        if (modalId === 'vehicleModal' && !document.getElementById('vehicleId').value) {
            resetVehicleForm();
        }
        if (modalId === 'driverModal' && !document.getElementById('driverId').value) {
            resetDriverForm();
        }
        if (modalId === 'maintenanceModal' && !document.getElementById('maintenanceId').value) {
            resetMaintenanceForm();
        }

        // Preencher selects com dados existentes
        if (modalId === 'usageModal' || modalId === 'maintenanceModal') {
            populateVehicleSelect();
            populateDriverSelect();
        }
    }
}

// Função para fechar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Limpar formulário
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Função para configurar event listeners
function setupEventListeners() {
    // Formulário de veículo
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addVehicle();
        });
    }

    // Formulário de motorista
    const driverForm = document.getElementById('driverForm');
    if (driverForm) {
        driverForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addDriver();
        });
    }

    // Formulário de uso
    const usageForm = document.getElementById('usageForm');
    if (usageForm) {
        // Criar nova função listener
        const usageSubmitHandler = function(e) {
            e.preventDefault();
            addUsageRecord();
        };

        // Remover listener anterior se existir
        if (usageForm._submitHandler) {
            usageForm.removeEventListener('submit', usageForm._submitHandler);
        }

        // Armazenar referência e adicionar novo listener
        usageForm._submitHandler = usageSubmitHandler;
        usageForm.addEventListener('submit', usageSubmitHandler);
    }

    // Formulário de manutenção
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addMaintenanceRecord();
        });
    }

    // Formulário de destinos
    const destinationForm = document.getElementById('destinationForm');
    if (destinationForm) {
        destinationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addDestination();
        });
    }

    // Adicionar validação em tempo real aos campos
    setupFormValidation();
}

// Função para configurar validação em tempo real
function setupFormValidation() {
    // Validação de placa
    const plateInput = document.getElementById('vehiclePlate');
    if (plateInput) {
        plateInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            validatePlate(this);
        });
    }

    // Validação de CNH
    const cnhInput = document.getElementById('driverCnh');
    if (cnhInput) {
        cnhInput.addEventListener('input', function() {
            validateCNH(this);
        });
    }

    // Validação de telefone
    const phoneInput = document.getElementById('driverPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = formatPhone(this.value);
        });
    }

    // Validação de email
    const emailInput = document.getElementById('driverEmail');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            validateEmail(this);
        });
    }

    // Validação de quilometragem
    const kmInputs = ['vehicleKm', 'usageKmDeparture', 'maintenanceKm'];
    kmInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    });
}

// Função para validar placa
function validatePlate(input) {
    const plate = input.value;
    const plateRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

    if (plate.length === 7) {
        if (plateRegex.test(plate)) {
            input.style.borderColor = 'var(--success-color)';
            showFieldMessage(input, 'Placa válida', 'success');
        } else {
            input.style.borderColor = 'var(--danger-color)';
            showFieldMessage(input, 'Formato inválido (AAA0000)', 'error');
        }
    } else {
        input.style.borderColor = 'var(--gray-300)';
        hideFieldMessage(input);
    }
}

// Função para validar CNH
function validateCNH(input) {
    const cnh = input.value.replace(/\D/g, '');

    if (cnh.length === 11) {
        if (isValidCNH(cnh)) {
            input.style.borderColor = 'var(--success-color)';
            showFieldMessage(input, 'CNH válida', 'success');
        } else {
            input.style.borderColor = 'var(--danger-color)';
            showFieldMessage(input, 'CNH inválida', 'error');
        }
    } else {
        input.style.borderColor = 'var(--gray-300)';
        hideFieldMessage(input);
    }
}

// Função para validar CNH (algoritmo básico)
function isValidCNH(cnh) {
    // Implementação básica - em produção, usar algoritmo completo
    return cnh.length === 11 && !/^(\d)\1+$/.test(cnh);
}

// Função para formatar telefone
function formatPhone(value) {
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 11) {
        if (phone.length <= 2) return phone;
        if (phone.length <= 6) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
        if (phone.length <= 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
        return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return value;
}

// Função para validar email
function validateEmail(input) {
    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email.length > 0) {
        if (emailRegex.test(email)) {
            input.style.borderColor = 'var(--success-color)';
            showFieldMessage(input, 'Email válido', 'success');
        } else {
            input.style.borderColor = 'var(--danger-color)';
            showFieldMessage(input, 'Email inválido', 'error');
        }
    } else {
        input.style.borderColor = 'var(--gray-300)';
        hideFieldMessage(input);
    }
}

// Função para mostrar mensagem de campo
function showFieldMessage(input, message, type) {
    hideFieldMessage(input);

    const messageDiv = document.createElement('div');
    messageDiv.className = `field-message field-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 4px;
        margin-top: 2px;
        z-index: 10;
    `;

    if (type === 'success') {
        messageDiv.style.background = 'var(--success-color)';
        messageDiv.style.color = 'white';
    } else {
        messageDiv.style.background = 'var(--danger-color)';
        messageDiv.style.color = 'white';
    }

    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(messageDiv);

    // Auto-hide after 3 seconds
    setTimeout(() => hideFieldMessage(input), 3000);
}

// Função para esconder mensagem de campo
function hideFieldMessage(input) {
    const existing = input.parentNode.querySelector('.field-message');
    if (existing) {
        existing.remove();
    }
}

// === GERENCIAMENTO DE VEÍCULOS ===

// Flag global para prevenir submissões duplas
let isSubmittingVehicle = false;

async function addVehicle() {
    // Prevenir submissões duplas
    if (isSubmittingVehicle) {
        console.log('Submissão já em andamento, ignorando...');
        return;
    }

    const form = document.getElementById('vehicleForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    isSubmittingVehicle = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Salvando...';

    try {
        const plate = document.getElementById('vehiclePlate').value.trim();
        const brand = document.getElementById('vehicleBrand').value.trim();
        const model = document.getElementById('vehicleModel').value.trim();
        const year = parseInt(document.getElementById('vehicleYear').value);
        const km = parseInt(document.getElementById('vehicleKm').value);
        const status = document.getElementById('vehicleStatus').value;

        if (!plate || !brand || !model || !year || isNaN(km)) {
            showAlert('Por favor, preencha todos os campos obrigatórios!', 'danger');
            isSubmittingVehicle = false;
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        if (plate.length !== 7) {
            showAlert('Placa deve ter 7 caracteres!', 'danger');
            isSubmittingVehicle = false;
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        const vehicleId = document.getElementById('vehicleId').value;
        const isEditing = vehicleId !== '';

        const vehicleData = {
            plate: plate.toUpperCase(),
            brand: brand,
            model: model,
            year: year,
            currentKm: km,
            status: status,
            photo: currentVehiclePhoto || null
        };

        let response;
        if (isEditing) {
            response = await apiUpdateVehicle(vehicleId, vehicleData);
        } else {
            if (year < 1900 || year > new Date().getFullYear() + 1) {
                showAlert('Ano do veículo inválido!', 'danger');
                isSubmittingVehicle = false;
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.textContent = 'Salvar';
                return;
            }
            response = await apiCreateVehicle(vehicleData);
        }

        if (response.success) {
            showAlert(response.message || (isEditing ? 'Veículo atualizado!' : 'Veículo cadastrado!'), 'success');
            await loadVehiclesTable();
            resetVehicleForm();
            closeModal('vehicleModal');
            await updateDashboardStats();
        } else {
            showAlert(response.error || 'Erro ao salvar veículo', 'danger');
        }

    } catch (error) {
        console.error('Erro ao cadastrar veículo:', error);
        showAlert(error.message || 'Erro ao cadastrar veículo', 'danger');
    } finally {
        isSubmittingVehicle = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Salvar';
    }
}

async function loadVehiclesTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    if (!tbody) return;

    try {
        const response = await apiGetVehicles();
        if (!response.success) {
            showAlert('Erro ao carregar veículos', 'danger');
            return;
        }

        vehicles = response.data || [];
        tbody.innerHTML = '';

        vehicles.forEach(vehicle => {
            const row = tbody.insertRow();
            const photo = vehicle.photo || vehicle.foto;
            const brand = vehicle.brand || vehicle.marca;
            const model = vehicle.model || vehicle.modelo;
            const plate = vehicle.plate || vehicle.placa;
            const year = vehicle.year || vehicle.ano;
            const km = vehicle.currentKm || vehicle.km_atual || 0;
            const status = vehicle.status;

            // Formatar a foto com data URL se existir
            let photoSrc = '';
            if (photo) {
                const photoType = vehicle.photo_type || 'jpeg';
                photoSrc = photo.startsWith('data:') ? photo : `data:image/${photoType};base64,${photo}`;
            }

            const photoHtml = photo ?
                `<img src="${photoSrc}" alt="${brand} ${model}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 2px solid #ddd;">` :
                `<div style="width: 60px; height: 45px; border-radius: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">🚗</div>`;

            row.innerHTML = `
                <td style="text-align: center;">${photoHtml}</td>
                <td>${plate}</td>
                <td>${brand} ${model}</td>
                <td>${year}</td>
                <td><span class="status-badge ${getStatusClass(status)}">${getStatusText(status)}</span></td>
                <td>${km.toLocaleString()} km</td>
                <td>
                    <button class="btn-icon" onclick="editVehicle(${vehicle.id})" title="Editar veículo">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteVehicle(${vehicle.id})" title="Excluir veículo">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar veículos:', error);
        showAlert('Erro ao carregar veículos', 'danger');
    }
}

async function editVehicle(id) {
    try {
        const vehicle = await apiGetVehicle(id);
        document.getElementById('vehicleId').value = vehicle.id;
        document.getElementById('vehiclePlate').value = vehicle.plate || vehicle.placa;
        document.getElementById('vehicleBrand').value = vehicle.brand || vehicle.marca;
        document.getElementById('vehicleModel').value = vehicle.model || vehicle.modelo;
        document.getElementById('vehicleYear').value = vehicle.year || vehicle.ano;
        document.getElementById('vehicleKm').value = vehicle.currentKm || vehicle.km_atual;
        document.getElementById('vehicleStatus').value = vehicle.status;

        const preview = document.getElementById('vehiclePhotoPreview');
        const photo = vehicle.photo || vehicle.foto;
        if (photo) {
            // Formatar a foto com data URL se necessário
            const photoType = vehicle.photo_type || 'jpeg';
            const photoSrc = photo.startsWith('data:') ? photo : `data:image/${photoType};base64,${photo}`;
            currentVehiclePhoto = photo;
            preview.innerHTML = `<img src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover;">`;
            document.getElementById('removeVehiclePhotoBtn').style.display = 'inline-block';
        } else {
            currentVehiclePhoto = null;
            preview.innerHTML = '<span style="color: #999;">Sem foto</span>';
            document.getElementById('removeVehiclePhotoBtn').style.display = 'none';
        }

        document.getElementById('vehicleModalTitle').textContent = 'Editar Veículo';
        openModal('vehicleModal');
    } catch (error) {
        console.error('Erro ao editar veículo:', error);
        showAlert('Erro ao carregar dados do veículo', 'danger');
    }
}

async function deleteVehicle(id) {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
        try {
            const response = await apiDeleteVehicle(id);
            if (response.success) {
                showAlert('Veículo removido com sucesso!', 'success');
                await loadVehiclesTable();
                await updateDashboardStats();
            } else {
                showAlert(response.error || 'Erro ao excluir veículo', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir veículo:', error);
            showAlert('Erro ao excluir veículo', 'danger');
        }
    }
}

// === FUNÇÕES DE FOTO DO VEÍCULO ===

// Variável global para armazenar a foto do veículo em base64
let currentVehiclePhoto = null;

// Função para preview da foto do veículo
function previewVehiclePhoto(event) {
    const file = event.target.files[0];
    if (file) {
        // Verificar tamanho do arquivo (máx 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showAlert('Arquivo muito grande! Máximo 2MB', 'danger');
            event.target.value = '';
            return;
        }

        // Verificar tipo do arquivo
        if (!file.type.startsWith('image/')) {
            showAlert('Por favor, selecione apenas arquivos de imagem', 'danger');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            currentVehiclePhoto = e.target.result;
            const preview = document.getElementById('vehiclePhotoPreview');
            preview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;

            // Mostrar botão remover
            document.getElementById('removeVehiclePhotoBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
}

// Função para remover foto do veículo
function removeVehiclePhoto() {
    currentVehiclePhoto = null;
    document.getElementById('vehiclePhoto').value = '';
    document.getElementById('vehiclePhotoPreview').innerHTML = '<span style="color: #999;">Sem foto</span>';
    document.getElementById('removeVehiclePhotoBtn').style.display = 'none';
}

// Função para resetar formulário de veículo
function resetVehicleForm() {
    document.getElementById('vehicleId').value = '';
    document.getElementById('vehiclePlate').value = '';
    document.getElementById('vehicleBrand').value = '';
    document.getElementById('vehicleModel').value = '';
    document.getElementById('vehicleYear').value = '';
    document.getElementById('vehicleKm').value = '';
    document.getElementById('vehicleStatus').value = 'disponivel';
    document.getElementById('vehicleModalTitle').textContent = 'Novo Veículo';

    // Resetar foto
    removeVehiclePhoto();
}

// === FUNÇÕES DE FOTO DO MOTORISTA ===

// Variável global para armazenar a foto em base64
let currentDriverPhoto = null;

// Função para preview da foto do motorista
function previewDriverPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        // Verificar tamanho do arquivo (máx 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showAlert('Arquivo muito grande! Máximo 2MB', 'danger');
            event.target.value = '';
            return;
        }

        // Verificar tipo do arquivo
        if (!file.type.startsWith('image/')) {
            showAlert('Por favor, selecione apenas arquivos de imagem', 'danger');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            currentDriverPhoto = e.target.result;
            const preview = document.getElementById('driverPhotoPreview');
            preview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;

            // Mostrar botão remover
            document.getElementById('removeDriverPhotoBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
}

// Função para remover foto do motorista
function removeDriverPhoto() {
    currentDriverPhoto = null;
    document.getElementById('driverPhoto').value = '';
    document.getElementById('driverPhotoPreview').innerHTML = '<span style="color: #999;">Sem foto</span>';
    document.getElementById('removeDriverPhotoBtn').style.display = 'none';
}

// === GERENCIAMENTO DE MOTORISTAS ===

async function addDriver() {
    const form = document.getElementById('driverForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Adicionar estado de loading
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Salvando...';

    try {
        const name = document.getElementById('driverName').value.trim();
        const cnh = document.getElementById('driverCnh').value.replace(/\D/g, '');
        const cnhExpiry = document.getElementById('driverCnhExpiry').value;
        const phone = document.getElementById('driverPhone').value.replace(/\D/g, '');
        const email = document.getElementById('driverEmail').value.trim();
        const password = document.getElementById('driverPassword').value;
        const passwordConfirm = document.getElementById('driverPasswordConfirm').value;

        // Verificar se é edição ou criação
        const driverId = document.getElementById('driverId').value;
        const isEditing = driverId !== '';

        // Validações
        if (!name || !cnh || !cnhExpiry || !phone || !email) {
            showAlert('Por favor, preencha todos os campos obrigatórios!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Email inválido!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        // Validar senha apenas na criação ou se foi alterada
        if (!isEditing || password) {
            if (!password || password.length < 6) {
                showAlert('Senha deve ter no mínimo 6 caracteres!', 'danger');
                submitBtn.classList.remove('loading');
                submitBtn.textContent = 'Salvar';
                return;
            }

            if (password !== passwordConfirm) {
                showAlert('As senhas não coincidem!', 'danger');
                submitBtn.classList.remove('loading');
                submitBtn.textContent = 'Salvar';
                return;
            }
        }

        if (cnh.length !== 11) {
            showAlert('CNH deve ter 11 dígitos!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        if (!isValidCNH(cnh)) {
            showAlert('CNH inválida!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        const expiryDate = new Date(cnhExpiry);
        const today = new Date();

        if (expiryDate <= today) {
            showAlert('Data de validade da CNH deve ser futura!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        if (!isEditing && (phone.length < 10 || phone.length > 11)) {
            showAlert('Telefone deve ter 10 ou 11 dígitos!', 'danger');
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Salvar';
            return;
        }

        // Preparar dados do motorista
        const driverData = {
            name: name,
            cnh: cnh,
            cnhExpiry: cnhExpiry,
            phone: formatPhone(phone),
            email: email,
            photo: currentDriverPhoto || null
        };

        // Adicionar senha apenas na criação ou se foi alterada
        if (!isEditing || password) {
            driverData.password = password;
        }

        let response;
        if (isEditing) {
            // MODO EDIÇÃO - Atualizar motorista existente
            response = await apiUpdateDriver(driverId, driverData);
        } else {
            // MODO CRIAÇÃO - Novo motorista
            response = await apiCreateDriver(driverData);
        }

        if (response.success) {
            showAlert(response.message || (isEditing ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!'), 'success');
            await loadDriversTable();
            resetDriverForm();
            closeModal('driverModal');
            await updateDashboardStats();
        } else {
            showAlert(response.error || 'Erro ao salvar motorista', 'danger');
        }

    } catch (error) {
        console.error('Erro ao cadastrar motorista:', error);
        showAlert(error.message || 'Erro ao cadastrar motorista. Tente novamente.', 'danger');
    } finally {
        // Remover estado de loading
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Salvar';
    }
}

// Função para mostrar sucesso com credenciais
function showSuccessWithCredentials(driver, username, password) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>✅ Motorista Cadastrado com Sucesso!</h3>
            <div class="alert alert-success mb-3">
                <strong>O motorista ${driver.name} foi cadastrado com sucesso!</strong>
            </div>
            <div class="credentials-box">
                <h4>🔑 Credenciais de Acesso</h4>
                <div class="credential-item">
                    <label>Usuário:</label>
                    <input type="text" value="${username}" readonly onclick="this.select()">
                </div>
                <div class="credential-item">
                    <label>Senha:</label>
                    <input type="text" value="${password}" readonly onclick="this.select()">
                </div>
                <p class="text-muted">
                    <strong>Importante:</strong> Estas são as credenciais de login para o motorista acessar o sistema.
                    O motorista pode alterar sua senha através do botão "Alterar Senha" no dashboard.
                </p>
            </div>
            <div class="mt-3">
                <button class="btn btn-primary" onclick="copyCredentials('${username}', '${password}')">
                    📋 Copiar Credenciais
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    Fechar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Função para copiar credenciais
function copyCredentials(username, password) {
    const text = `Credenciais de acesso:\n\nUsuário: ${username}\nSenha: ${password}`;
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Credenciais copiadas para a área de transferência!', 'success');
    }).catch(() => {
        // Fallback para navegadores que não suportam clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('Credenciais copiadas para a área de transferência!', 'success');
    });
}

async function loadDriversTable() {
    const tbody = document.getElementById('driversTableBody');
    if (!tbody) return;

    try {
        // Carregar motoristas da API
        const response = await apiGetDrivers();
        if (!response.success) {
            showAlert('Erro ao carregar motoristas', 'danger');
            return;
        }

        drivers = response.data || [];
        tbody.innerHTML = '';

        drivers.forEach(driver => {
            const daysUntilExpiry = getDaysUntilExpiry(driver.cnhExpiry || driver.cnh_expiry);

            // Calcular KM total do motorista
            const totalKm = calculateDriverUsage(driver.id);

            // Badge compacta para Status CNH
            let cnhBadgeClass, cnhBadgeText;
            if (daysUntilExpiry < 0) {
                cnhBadgeClass = 'cnh-danger';
                cnhBadgeText = 'Vencida';
            } else if (daysUntilExpiry < 30) {
                cnhBadgeClass = 'cnh-warning';
                cnhBadgeText = `${daysUntilExpiry}d`;
            } else if (daysUntilExpiry < 90) {
                cnhBadgeClass = 'cnh-warning-90';
                cnhBadgeText = `${daysUntilExpiry}d`;
            } else {
                cnhBadgeClass = 'cnh-valid';
                cnhBadgeText = 'Válida';
            }

            // Badge para status ativo/inativo
            const isActive = driver.status === 'ativo' || driver.ativo === 1;
            const statusBadge = isActive ?
                '<span class="compact-badge driver-active">Ativo</span>' :
                '<span class="compact-badge driver-inactive">Inativo</span>';

            // Foto do motorista
            const photo = driver.photo || driver.foto;
            let photoSrc = '';
            if (photo) {
                const photoType = driver.photo_type || 'jpeg';
                photoSrc = photo.startsWith('data:') ? photo : `data:image/${photoType};base64,${photo}`;
            }
            const photoHtml = photo ?
                `<img src="${photoSrc}" alt="${driver.name || driver.nome}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">` :
                `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${(driver.name || driver.nome).charAt(0).toUpperCase()}</div>`;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td style="text-align: center;">${photoHtml}</td>
                <td>${driver.name || driver.nome}</td>
                <td>${driver.cnh}</td>
                <td>${formatDate(driver.cnhExpiry || driver.cnh_expiry)}</td>
                <td><span class="compact-badge ${cnhBadgeClass}">${cnhBadgeText}</span></td>
                <td>${totalKm.toLocaleString('pt-BR')} km</td>
                <td>${driver.phone || driver.telefone}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-icon" onclick="editDriver(${driver.id})" title="Editar motorista">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteDriver(${driver.id})" title="Excluir motorista">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </td>
            `;
        });

        // KPIs dos motoristas agora são exibidos apenas no Dashboard
        // updateDriversKPIs(); // REMOVIDO - cards KPI movidos para o Dashboard

    } catch (error) {
        console.error('Erro ao carregar motoristas:', error);
        showAlert('Erro ao carregar motoristas', 'danger');
    }
}

// Função updateDriversKPIs() REMOVIDA
// Os KPIs de motoristas agora são atualizados via updateDashboardStats() no Dashboard principal

// Função para mostrar credenciais do usuário
function showUserCredentials(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    const user = getUserByMotoristaId(driverId);
    
    if (!driver || !user) {
        showAlert('Usuário não encontrado!', 'danger');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>🔑 Credenciais de ${driver.name}</h3>
            <div class="credentials-box">
                <div class="credential-item">
                    <label>Usuário:</label>
                    <input type="text" value="${user.username}" readonly onclick="this.select()">
                </div>
                <div class="credential-item">
                    <label>Senha:</label>
                    <input type="text" value="${user.password}" readonly onclick="this.select()">
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-primary" onclick="copyCredentials('${user.username}', '${user.password}')">
                    📋 Copiar Credenciais
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    Fechar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Função para criar usuário para motorista existente
function createUserForDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    // Verificar se já tem usuário
    if (getUserByMotoristaId(driverId)) {
        showAlert('Este motorista já possui acesso ao sistema!', 'warning');
        return;
    }

    // Criar usuário
    const { username, password } = createMotoristaUser(driver);
    
    showAlert('Acesso criado com sucesso!', 'success');
    
    // Recarregar tabela
    loadDriversTable();
}

async function editDriver(id) {
    try {
        // Usar cache local quando possível
        let driver = drivers.find(d => d.id === id);
        if (!driver) {
            driver = await apiGetDriver(id);
        }
        if (!driver) {
            throw new Error('Motorista não encontrado');
        }

        // Preencher o formulário com os dados do motorista
        document.getElementById('driverId').value = driver.id;
        document.getElementById('driverName').value = driver.name || driver.nome || '';
        document.getElementById('driverCnh').value = driver.cnh || '';
        document.getElementById('driverCnhExpiry').value = driver.cnhExpiry || driver.cnh_expiry || '';
        document.getElementById('driverPhone').value = driver.phone || driver.telefone || '';
        document.getElementById('driverEmail').value = driver.email || '';

        // Limpar campos de senha (deixar vazio para não alterar)
        document.getElementById('driverPassword').value = '';
        document.getElementById('driverPasswordConfirm').value = '';

        // Preencher foto se existir
        const photo = driver.photo || driver.foto;
        if (photo) {
            currentDriverPhoto = photo;
            const preview = document.getElementById('driverPhotoPreview');
            const photoType = driver.photo_type || 'jpeg';
            const photoSrc = (typeof photo === 'string' && photo.startsWith('data:')) ? photo : `data:image/${photoType};base64,${photo}`;
            preview.innerHTML = `<img src="${photoSrc}" style="width: 100%; height: 100%; object-fit: cover;">`;
            document.getElementById('removeDriverPhotoBtn').style.display = 'inline-block';
        } else {
            removeDriverPhoto();
        }

        // Mudar título do modal
        document.getElementById('driverModalTitle').textContent = 'Editar Motorista';

        // Abrir o modal
        openModal('driverModal');

    } catch (error) {
        console.error('Erro ao editar motorista:', error);
        showAlert(error.message || 'Erro ao carregar dados do motorista', 'danger');
    }
}

async function deleteDriver(id) {
    const driver = drivers.find(d => d.id === id);
    const driverName = driver ? (driver.name || driver.nome) : '';

    if (confirm('Tem certeza que deseja excluir este motorista?\n\n⚠️ Isso também removerá o acesso do motorista ao sistema.')) {
        try {
            const response = await apiDeleteDriver(id);

            if (response.success) {
                showAlert(`Motorista ${driverName} removido com sucesso!`, 'success');
                await loadDriversTable();
                await updateDashboardStats();
            } else {
                showAlert(response.error || 'Erro ao excluir motorista', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir motorista:', error);
            showAlert('Erro ao excluir motorista', 'danger');
        }
    }
}

// Função para resetar formulário de motorista
function resetDriverForm() {
    document.getElementById('driverId').value = '';
    document.getElementById('driverName').value = '';
    document.getElementById('driverCnh').value = '';
    document.getElementById('driverCnhExpiry').value = '';
    document.getElementById('driverPhone').value = '';
    document.getElementById('driverEmail').value = '';
    document.getElementById('driverPassword').value = '';
    document.getElementById('driverPasswordConfirm').value = '';
    document.getElementById('driverModalTitle').textContent = 'Novo Motorista';

    // Resetar foto
    removeDriverPhoto();
}

// === CONTROLE DE USO DE VEÍCULOS ===

async function addUsageRecord() {
    const form = document.getElementById('usageForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Salvando...';
    }
    const vehicleId = parseInt(document.getElementById('usageVehicle').value);
    const driverId = parseInt(document.getElementById('usageDriver').value);
    const departure = document.getElementById('usageDeparture').value;
    const kmDeparture = parseInt(document.getElementById('usageKmDeparture').value);
    const destinationId = parseInt(document.getElementById('usageDestination').value);

    // Validações
    if (!destinationId) {
        showAlert('Por favor, selecione um destino', 'danger');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText || 'Salvar';
        }
        return;
    }

    // Validar KM mínimo
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        const kmAtual = vehicle.currentKm || vehicle.km_atual || 0;
        if (kmDeparture < kmAtual) {
            showAlert(`KM de saída não pode ser menor que o KM atual do veículo (${kmAtual} km)`, 'danger');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.textContent = originalText || 'Salvar';
            }
            return;
        }
    }

    // Converter datetime-local (YYYY-MM-DDTHH:MM) para MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const departureFormatted = departure ? departure.replace('T', ' ') + ':00' : '';

    // Processar intercorrência
    const hasIncident = document.getElementById('usageHasIncident').checked;
    let incidentNotes = null;
    let incidentPhoto = null;

    if (hasIncident) {
        const notesField = document.getElementById('usageIncidentNotes');
        const photoField = document.getElementById('usageIncidentPhoto');

        incidentNotes = notesField.value.trim() || null;

        // Processar imagem se foi selecionada
        if (photoField.files && photoField.files[0]) {
            const file = photoField.files[0];

            // Validar tamanho (5MB máximo)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('A imagem deve ter no máximo 5MB', 'danger');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    submitBtn.textContent = originalText || 'Salvar';
                }
                return;
            }

            // Converter para base64
            try {
                incidentPhoto = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } catch (error) {
                showAlert('Erro ao processar imagem', 'danger');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    submitBtn.textContent = originalText || 'Salvar';
                }
                return;
            }
        }
    }

    try {
        const usageData = {
            vehicleId: vehicleId,
            driverId: driverId,
            departureTime: departureFormatted,
            kmDeparture: kmDeparture,
            destinationId: destinationId,
            incidentNotes: incidentNotes,
            incidentPhoto: incidentPhoto
        };

        const response = await apiCreateUsage(usageData);

        if (response.success) {
            showAlert(response.message || 'Registro de uso criado com sucesso!', 'success');
            await loadUsageTable();
            await loadVehiclesTable();
            closeModal('usageModal');
            resetUsageForm();
            await updateDashboardStats();
        } else {
            showAlert(response.message || 'Erro ao criar registro de uso', 'danger');
        }
    } catch (error) {
        console.error('Erro ao criar uso:', error);
        showAlert(error.message || 'Erro ao criar registro de uso', 'danger');
    }
    finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText || 'Salvar';
        }
    }
}

// Atualizar valor mínimo de KM ao selecionar veículo
function updateKmMin() {
    const vehicleId = document.getElementById('usageVehicle').value;
    const kmInput = document.getElementById('usageKmDeparture');

    if (!vehicleId || !kmInput) {
        return;
    }

    const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));

    if (vehicle) {
        const kmAtual = vehicle.currentKm || vehicle.km_atual || 0;
        kmInput.min = kmAtual;
        kmInput.value = kmAtual; // Preencher com o valor atual
        kmInput.placeholder = `Mínimo: ${kmAtual} km`;

        // Adicionar tooltip visual
        const label = kmInput.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            label.innerHTML = `KM Saída: <small style="color: #666;">(Atual: ${kmAtual} km)</small>`;
        }
    }
}

// Toggle campos de intercorrência
function toggleIncidentFields() {
    const checkbox = document.getElementById('usageHasIncident');
    const fields = document.getElementById('incidentFields');

    if (checkbox && fields) {
        fields.style.display = checkbox.checked ? 'block' : 'none';

        // Se desmarcar, limpar os campos
        if (!checkbox.checked) {
            const notesField = document.getElementById('usageIncidentNotes');
            const photoField = document.getElementById('usageIncidentPhoto');
            if (notesField) notesField.value = '';
            if (photoField) photoField.value = '';
        }
    }
}

async function loadUsageTable(filteredRecords = null) {
    const tbody = document.getElementById('usageTableBody');
    if (!tbody) return;

    try {
        let records;

        if (filteredRecords !== null) {
            // Usar registros filtrados se fornecidos
            records = filteredRecords;
        } else {
            // Carregar todos os registros da API
            const response = await apiGetUsageRecords();
            if (!response.success) {
                showAlert('Erro ao carregar registros de uso', 'danger');
                return;
            }
            usageRecords = response.data || [];
            records = usageRecords;
        }

        tbody.innerHTML = '';

        records.forEach(record => {
            const vehicle = vehicles.find(v => v.id === record.vehicleId || v.id === record.veiculo_id);
            const driver = drivers.find(d => d.id === record.driverId || d.id === record.motorista_id);
            const destination = destinations.find(dest => dest.id === record.destinationId || dest.id === record.destino_id);

            // Handle both camelCase and snake_case from API
            const kmDeparture = record.kmDeparture || record.km_saida;
            const kmReturn = record.kmReturn || record.km_retorno;
            const distance = kmReturn ? (kmReturn - kmDeparture) : '-';

            // Duração formatada (calcula se não vier do backend)
            let duration = '-';
            const depRaw = record.departureTime || record.data_hora_saida;
            const retRaw = record.returnTime || record.data_hora_retorno;
            if (record.duration || record.duracao) {
                duration = formatDuration(record.duration || record.duracao);
            } else if (depRaw && retRaw) {
                const dep = new Date(depRaw);
                const ret = new Date(retRaw);
                const mins = Math.round((ret - dep) / (1000 * 60));
                if (Number.isFinite(mins) && mins >= 0) {
                    duration = formatDuration(mins);
                }
            }

            // Aprovação badge e botões
            let approvalBadge = '';
            let approvalButtons = '';

            const approvalStatus = record.approvalStatus || record.status_aprovacao || 'pendente';
            const status = record.status || 'em-uso';

            if (approvalStatus === 'pendente') {
                approvalBadge = '<span class="status-badge status-pending">⏳ Pendente</span>';
                // Permitir aprovar tanto finalizadas quanto em uso (admin pode encerrar ao aprovar)
                if (status === 'finalizado' || status === 'em-uso') {
                    approvalButtons = `
                        <button class="btn btn-success btn-sm" onclick="approveUsage(${record.id})" title="Aprovar">✓</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUsage(${record.id})" title="Rejeitar">✗</button>
                    `;
                }
            } else if (approvalStatus === 'aprovado') {
                approvalBadge = '<span class="status-badge status-approved">✅ Aprovada</span>';
            } else if (approvalStatus === 'rejeitado') {
                approvalBadge = '<span class="status-badge status-rejected">❌ Rejeitada</span>';
            }

            const departure = record.departureTime || record.data_hora_saida;
            const returnTime = record.returnTime || record.data_hora_retorno;

            const cost = record.costApprox || record.custo_aproximado;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${vehicle ? (vehicle.model || vehicle.modelo) : 'Veículo não encontrado'}</td>
                <td>${vehicle ? (vehicle.plate || vehicle.placa) : '-'}</td>
                <td>${driver ? (driver.name || driver.nome) : 'Motorista não encontrado'}</td>
                <td>${destination ? (destination.name || destination.nome) + ((destination.distanceKm || destination.distancia_km) ? ' (' + (destination.distanceKm || destination.distancia_km) + ' km)' : '') : (record.route || record.destino || 'Destino não encontrado')}</td>
                <td>${formatDateTime(departure)}</td>
                <td>${returnTime ? formatDateTime(returnTime) : '-'}</td>
                <td style="text-align: center;">${duration}</td>
                <td style="text-align: center;">${typeof distance === 'number' ? distance.toLocaleString() + ' km' : '-'}</td>
                <td style="text-align: center;">${(cost || cost === 0) ? 'R$ ' + Number(cost).toFixed(2) : '-'}</td>
                <td style="text-align: center;">${(record.notes || record.observacoes || record.incidentPhoto) ? `<button class=\"btn btn-secondary btn-sm\" title=\"Ver intercorrência\" onclick=\"showIncident(${record.id})\">🛈</button>` : '-'}</td>
                <td style="text-align: center;">
                    ${approvalBadge}
                    ${approvalButtons}
                </td>
                <td style="text-align: center;">
                    ${status === 'em-uso' ?
                        `<button class="btn btn-success" onclick="finalizeUsage(${record.id})">Finalizar</button>` :
                        ''
                    }
                    <button class="btn btn-danger" onclick="deleteUsageRecord(${record.id})">Excluir</button>
                </td>
            `;
        });

        // Atualizar rankings após carregar dados
        updateRankings();
    } catch (error) {
        console.error('Erro ao carregar tabela de uso:', error);
        showAlert('Erro ao carregar registros de uso', 'danger');
    }
}

// Variáveis para controle de ordenação da tabela de uso
let usageSortColumn = 'departure';
let usageSortOrder = 'desc'; // 'asc' ou 'desc'

// Função para ordenar tabela de uso de veículos
function sortUsageTable(column) {
    // Alternar ordem se clicar na mesma coluna
    if (usageSortColumn === column) {
        usageSortOrder = usageSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        usageSortColumn = column;
        usageSortOrder = 'desc'; // Padrão: mais recente primeiro
    }

    // Ordenar os registros
    const sortedRecords = [...usageRecords].sort((a, b) => {
        let valueA, valueB;

        if (column === 'departure') {
            valueA = a.departureTime || a.data_hora_saida || '';
            valueB = b.departureTime || b.data_hora_saida || '';
        } else if (column === 'return') {
            valueA = a.returnTime || a.data_hora_retorno || '';
            valueB = b.returnTime || b.data_hora_retorno || '';
        }

        // Tratar valores vazios
        if (!valueA && !valueB) return 0;
        if (!valueA) return 1;  // Valores vazios vão para o final
        if (!valueB) return -1;

        // Comparação de datas
        const dateA = new Date(valueA);
        const dateB = new Date(valueB);

        if (usageSortOrder === 'asc') {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });

    // Atualizar ícones de ordenação
    document.querySelectorAll('#usageTable .sort-icon').forEach(icon => {
        icon.textContent = '⇅';
    });

    const currentHeader = document.querySelector(`#usageTable th[onclick="sortUsageTable('${column}')"] .sort-icon`);
    if (currentHeader) {
        currentHeader.textContent = usageSortOrder === 'asc' ? '↑' : '↓';
    }

    // Recarregar tabela com registros ordenados
    loadUsageTable(sortedRecords);
}

// Função para formatar duração
function formatDuration(minutes) {
    if (!minutes) return '-';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
}

// Aprovar uso de veículo (finaliza se estiver em uso)
async function approveUsage(id) {
    const record = usageRecords.find(r => r.id === id);
    if (!record) {
        showAlert('Registro não encontrado', 'danger');
        return;
    }

    const status = record.status || 'em-uso';
    if (!confirm('Confirma a aprovação desta rota?')) return;

    try {
        let payload = {};
        if (status === 'em-uso') {
            const kmDeparture = record.kmDeparture || record.km_saida || 0;
            const input = prompt('Quilometragem de retorno (para encerrar a viagem):');
            if (input === null) return; // cancelado
            const kmReturn = parseInt(input, 10);
            if (!Number.isFinite(kmReturn) || kmReturn < kmDeparture) {
                showAlert('Quilometragem de retorno inválida', 'danger');
                return;
            }
            payload = { returnTime: toSqlDateTime(new Date()), kmReturn };
        }

        const resp = await apiApproveUsage(id, payload);
        if (!resp.success) {
            showAlert(resp.message || 'Erro ao aprovar rota', 'danger');
            return;
        }

        await loadUsageTable();
        await loadVehiclesTable();
        updateUsageKPIs();
        showAlert('Rota aprovada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao aprovar rota:', error);
        showAlert(error.message || 'Erro ao aprovar rota', 'danger');
    }
}

// Rejeitar uso de veículo
async function rejectUsage(id) {
    const record = usageRecords.find(r => r.id === id);
    if (!record) {
        showAlert('Registro não encontrado', 'danger');
        return;
    }

    const motivo = prompt('Motivo da rejeição (opcional):');
    if (motivo !== null) { // null significa que cancelou
        try {
            const response = await apiRejectUsage(id, { reason: (motivo || '').trim() || null });
            if (!response.success) {
                showAlert(response.message || 'Erro ao rejeitar rota', 'danger');
                return;
            }
            await loadUsageTable();
            showAlert('Rota rejeitada!', 'danger');
        } catch (error) {
            console.error('Erro ao rejeitar rota:', error);
            showAlert('Erro ao rejeitar rota', 'danger');
        }
    }
}

async function finalizeUsage(id) {
    const record = usageRecords.find(r => r.id === id);
    if (!record) {
        showAlert('Registro não encontrado', 'danger');
        return;
    }

    const kmDeparture = record.kmDeparture || record.km_saida;
    const kmReturn = parseInt(prompt('Quilometragem de retorno:'));

    if (!kmReturn || kmReturn < kmDeparture) {
        alert('Quilometragem inválida! Deve ser maior ou igual à quilometragem de saída.');
        return;
    }

    try {
        const response = await apiFinalizeUsage(id, { 
            returnTime: toSqlDateTime(new Date()),
            kmReturn 
        });

        if (response.success) {
            showAlert(response.message || 'Uso de veículo finalizado com sucesso!', 'success');
            await loadUsageTable();
            await loadVehiclesTable();
            updateUsageKPIs();
        } else {
            showAlert(response.message || 'Erro ao finalizar uso', 'danger');
        }
    } catch (error) {
        console.error('Erro ao finalizar uso:', error);
        showAlert(error.message || 'Erro ao finalizar uso', 'danger');
    }
}

async function deleteUsageRecord(id) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        try {
            const response = await apiDeleteUsage(id);

            if (response.success) {
                showAlert(response.message || 'Registro de uso excluído com sucesso!', 'success');
                await loadUsageTable();
                await loadVehiclesTable();
                await updateDashboardStats();
            } else {
                showAlert(response.message || 'Erro ao excluir registro', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir registro de uso:', error);
            showAlert(error.message || 'Erro ao excluir registro', 'danger');
        }
    }
}

// Exibir modal de intercorrência
function showIncident(id) {
    const record = usageRecords.find(r => r.id === id);
    if (!record) {
        showAlert('Registro não encontrado', 'danger');
        return;
    }

    const notes = record.notes || record.observacoes || '-';
    const photoBase64 = record.incidentPhoto || record.intercorrencia_photo;
    const photoType = record.incidentPhotoType || record.intercorrencia_photo_type || 'jpeg';

    const notesEl = document.getElementById('incidentNotes');
    if (notesEl) notesEl.textContent = notes && notes.trim() ? notes : '-';

    const photoBlock = document.getElementById('incidentPhotoBlock');
    const photoEl = document.getElementById('incidentPhoto');
    if (photoBase64 && photoEl && photoBlock) {
        photoEl.src = `data:image/${photoType};base64,${photoBase64}`;
        photoBlock.style.display = 'block';
    } else if (photoBlock) {
        photoBlock.style.display = 'none';
    }

    openModal('incidentModal');
}

function resetUsageForm() {
    document.getElementById('usageVehicle').value = '';
    document.getElementById('usageDriver').value = '';
    document.getElementById('usageDeparture').value = '';
    document.getElementById('usageKmDeparture').value = '';
    document.getElementById('usageDestination').value = '';

    // Limpar campos de intercorrência
    const incidentCheckbox = document.getElementById('usageHasIncident');
    const incidentNotes = document.getElementById('usageIncidentNotes');
    const incidentPhoto = document.getElementById('usageIncidentPhoto');
    const incidentFields = document.getElementById('incidentFields');

    if (incidentCheckbox) incidentCheckbox.checked = false;
    if (incidentNotes) incidentNotes.value = '';
    if (incidentPhoto) incidentPhoto.value = '';
    if (incidentFields) incidentFields.style.display = 'none';
}

// === CONTROLE DE MANUTENÇÃO ===

// === DESPESAS / ABASTECIMENTO ===

async function loadExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) {
        console.error('Tabela de despesas não encontrada');
        return;
    }

    console.log('Carregando despesas...');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Carregando despesas...</td></tr>';

    try {
        const resp = await apiGetExpenses();
        console.log('Resposta completa da API de despesas:', JSON.stringify(resp, null, 2));

        if (!resp || !resp.success) {
            const errorMsg = resp?.message || resp?.error || 'Erro ao carregar despesas';
            console.error('Erro na resposta:', errorMsg);
            showAlert(errorMsg, 'danger');
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Erro: ${errorMsg}</td></tr>`;
            return;
        }

        expenses = resp.data || [];
        console.log(`Despesas carregadas com sucesso: ${expenses.length} registros`);

        tbody.innerHTML = '';

        if (expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nenhuma despesa registrada</td></tr>';
            updateExpenseKPIs(); // Atualizar KPIs mesmo sem despesas
            populateExpenseFilters(); // Preencher filtros mesmo sem despesas
            return;
        }

        // Atualizar KPIs após carregar despesas
        updateExpenseKPIs();

        // Preencher dropdowns de filtros
        populateExpenseFilters();

        expenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDateTime(e.date || e.data)}</td>
                <td>${e.vehiclePlate || e.placa || ''} ${e.vehicleModel ? (' - ' + e.vehicleModel) : ''}</td>
                <td>${e.category || e.categoria}</td>
                <td>${e.currentKm != null ? e.currentKm : '-'}</td>
                <td>${e.liters != null ? Number(e.liters).toFixed(2) : '-'}</td>
                <td>${e.pricePerLiter != null ? 'R$ ' + Number(e.pricePerLiter).toFixed(2) : '-'}</td>
                <td>${e.totalValue != null ? 'R$ ' + Number(e.totalValue).toFixed(2) : '-'}</td>
                <td>${e.notes || ''}</td>
                <td style="text-align:center;">
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao carregar despesas:', err);
        showAlert('Erro ao carregar despesas', 'danger');
    }
}

function resetExpenseForm() {
    const sel = document.getElementById('expenseVehicle');
    if (sel) {
        sel.innerHTML = '<option value="">Selecione</option>';
        vehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.plate || v.placa} - ${v.model || v.modelo}`;
            sel.appendChild(opt);
        });
    }
    document.getElementById('expenseCategory').value = 'abastecimento';
    document.getElementById('expenseDate').value = '';
    document.getElementById('expenseKm').value = '';
    document.getElementById('expenseLiters').value = '';
    document.getElementById('expensePricePerLiter').value = '';
    document.getElementById('expenseTotal').value = '';
    document.getElementById('expenseNotes').value = '';
    toggleExpenseFields();

    bindExpenseListeners();
}

function toggleExpenseFields() {
    const cat = document.getElementById('expenseCategory').value;
    const fuel = document.getElementById('fuelFields');
    if (fuel) fuel.style.display = (cat === 'abastecimento') ? 'flex' : 'none';

    // Tornar o total editável apenas quando NÃO for abastecimento
    const totalEl = document.getElementById('expenseTotal');
    if (totalEl) {
        if (cat === 'abastecimento') {
            totalEl.readOnly = true;
            totalEl.placeholder = 'R$ 0,00 (auto)';
        } else {
            totalEl.readOnly = false;
            totalEl.placeholder = 'Informe o valor total';
        }
    }
}

async function addExpense() {
    try {
        const vehicleId = parseInt(document.getElementById('expenseVehicle').value);
        const category = document.getElementById('expenseCategory').value;
        const dateInput = document.getElementById('expenseDate').value;
        if (!dateInput) {
            showAlert('Informe a data e hora da despesa', 'danger');
            return;
        }
        const date = new Date(dateInput);
        const currentKm = document.getElementById('expenseKm').value ? parseInt(document.getElementById('expenseKm').value) : null;
        const litersRaw = document.getElementById('expenseLiters').value;
        const priceRaw = document.getElementById('expensePricePerLiter').value;
        const liters = litersRaw ? parseFloat(litersRaw.replace(',', '.')) : null;
        const pricePerLiter = priceRaw ? Number(parseCurrencyBR(priceRaw).toFixed(2)) : null;
        let totalValue = document.getElementById('expenseTotal').value ? parseCurrencyBR(document.getElementById('expenseTotal').value) : null;
        const notes = document.getElementById('expenseNotes').value || null;

        if (!vehicleId || !category) {
            showAlert('Preencha os campos obrigatórios', 'danger');
            return;
        }

        // Validar KM mínimo com KM atual do veículo
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const vKm = vehicle ? (vehicle.currentKm || vehicle.km_atual || 0) : 0;
        const kmNum = currentKm != null ? currentKm : null;
        if (kmNum != null && kmNum < vKm) {
            showAlert(`KM não pode ser menor que o KM atual do veículo (${vKm}).`, 'danger');
            return;
        }

        // Regras específicas para abastecimento
        if (category === 'abastecimento') {
            if (liters == null || liters <= 0) {
                showAlert('Informe a quantidade de litros', 'danger');
                return;
            }
            if (pricePerLiter == null || pricePerLiter <= 0) {
                showAlert('Informe o preço por litro', 'danger');
                return;
            }
        }

        const payload = {
            vehicleId,
            category,
            date: toSqlDateTime(date),
            currentKm,
            liters,
            pricePerLiter,
            totalValue: (category === 'abastecimento') ? (liters && pricePerLiter ? Number((liters * pricePerLiter).toFixed(2)) : null) : totalValue,
            notes
        };

        const resp = await apiCreateExpense(payload);
        if (!resp.success) {
            showAlert(resp.message || 'Erro ao salvar despesa', 'danger');
            return;
        }
        closeModal('expenseModal');
        await loadExpensesTable();
        showAlert('Despesa salva com sucesso!', 'success');
    } catch (err) {
        console.error('Erro ao salvar despesa:', err);
        showAlert('Erro ao salvar despesa', 'danger');
    }
}

function bindExpenseListeners() {
    if (expenseListenersBound) return;
    expenseListenersBound = true;

    const litersEl = document.getElementById('expenseLiters');
    const priceEl = document.getElementById('expensePricePerLiter');
    const totalEl = document.getElementById('expenseTotal');
    const catEl = document.getElementById('expenseCategory');
    const vehEl = document.getElementById('expenseVehicle');
    const kmEl = document.getElementById('expenseKm');

    const recalc = () => {
        if (!litersEl || !priceEl || !totalEl) return;
        const cat = document.getElementById('expenseCategory')?.value || 'abastecimento';
        if (cat !== 'abastecimento') return; // somente calcula automaticamente para abastecimento
        const liters = parseFloat((litersEl.value || '0').replace(',', '.')) || 0;
        const price = parseCurrencyBR(priceEl.value || '');
        const total = liters * (price || 0);
        totalEl.value = total > 0 ? formatCurrencyBR2Dec(total) : '';
    };

    if (litersEl) litersEl.addEventListener('input', recalc);
    if (priceEl) {
        priceEl.addEventListener('input', recalc);
        priceEl.addEventListener('blur', () => {
            const val = parseCurrencyBR(priceEl.value || '');
            priceEl.value = val ? formatCurrencyBR2Dec(val) : '';
            recalc();
        });
    }

    // Formatar total ao sair quando for manual (não abastecimento)
    if (totalEl) {
        totalEl.addEventListener('blur', () => {
            const cat = document.getElementById('expenseCategory')?.value || 'abastecimento';
            if (cat !== 'abastecimento') {
                const val = parseCurrencyBR(totalEl.value || '');
                totalEl.value = val ? formatCurrencyBR2Dec(val) : '';
            }
        });
    }
    if (catEl) catEl.addEventListener('change', () => {
        toggleExpenseFields();
        recalc();
    });
    if (vehEl && kmEl) {
        const setKmMin = () => {
            const vid = parseInt(vehEl.value);
            const v = vehicles.find(x => x.id === vid);
            const minKm = v ? (v.currentKm || v.km_atual || 0) : 0;
            kmEl.min = String(minKm);
            if (!kmEl.value || parseInt(kmEl.value) < minKm) {
                kmEl.value = minKm ? String(minKm) : '';
            }
            kmEl.placeholder = minKm ? `>= ${minKm}` : 'Opcional';
        };
        vehEl.addEventListener('change', setKmMin);
        setKmMin();
    }
}

// Utilitários de moeda BR
function parseCurrencyBR(str) {
    if (!str) return 0;
    // Remove R$, espaços e pontos de milhar; troca vírgula por ponto
    const cleaned = String(str)
        .replace(/[^0-9.,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
}

function formatCurrencyBR2Dec(value) {
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    } catch (_) {
        return 'R$ ' + (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
    }
}

function formatCurrencyBR4Dec(value) {
    // Formata como R$ x,xxxx (4 casas) para preço por litro
    try {
        const v = Number(value);
        const parts = v.toFixed(4).split('.');
        const intPart = parts[0];
        const decPart = parts[1];
        const intBR = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return 'R$ ' + intBR + ',' + decPart;
    } catch (_) {
        return 'R$ ' + value;
    }
}

// Função para atualizar KPIs de despesas
function updateExpenseKPIs() {
    const monthTotal = document.getElementById('expenseMonthTotal');
    const fuelTotal = document.getElementById('expenseFuelTotal');
    const maintenanceTotal = document.getElementById('expenseMaintenanceTotal');
    const avgConsumption = document.getElementById('expenseAvgConsumption');

    if (!monthTotal || !fuelTotal || !maintenanceTotal || !avgConsumption) {
        return;
    }

    // Obter mês e ano atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar despesas do mês atual
    const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date || e.data);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });

    // Calcular totais
    let totalMonth = 0;
    let totalFuel = 0;
    let totalMaintenance = 0;
    let totalLiters = 0;
    let totalKmFuel = 0;
    let fuelCount = 0;

    monthExpenses.forEach(e => {
        const value = e.totalValue || 0;
        totalMonth += value;

        if (e.category === 'abastecimento') {
            totalFuel += value;
            if (e.liters) totalLiters += parseFloat(e.liters);
            if (e.currentKm) {
                totalKmFuel += e.currentKm;
                fuelCount++;
            }
        } else if (e.category === 'manutencao') {
            totalMaintenance += value;
        }
    });

    // Calcular média de consumo
    let avgConsumptionValue = '-- L/100km';
    if (fuelCount > 1 && totalLiters > 0) {
        // Encontrar menor e maior km para calcular distância percorrida
        const fuelExpenses = monthExpenses.filter(e => e.category === 'abastecimento' && e.currentKm);
        if (fuelExpenses.length > 1) {
            const kms = fuelExpenses.map(e => e.currentKm).sort((a, b) => a - b);
            const distance = kms[kms.length - 1] - kms[0];
            if (distance > 0) {
                const consumption = (totalLiters / distance) * 100;
                avgConsumptionValue = consumption.toFixed(1) + ' L/100km';
            }
        }
    }

    // Atualizar elementos
    monthTotal.textContent = 'R$ ' + totalMonth.toFixed(2).replace('.', ',');
    fuelTotal.textContent = 'R$ ' + totalFuel.toFixed(2).replace('.', ',');
    maintenanceTotal.textContent = 'R$ ' + totalMaintenance.toFixed(2).replace('.', ',');
    avgConsumption.textContent = avgConsumptionValue;

    // Adicionar animação de atualização
    const kpiValues = document.querySelectorAll('#despesas .kpi-value');
    kpiValues.forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = 'fadeInUp 0.3s ease-out';
        }, 10);
    });
}

// Função para filtrar despesas
function filterExpenses() {
    const periodFilter = document.getElementById('expenseFilterPeriod');
    const vehicleFilter = document.getElementById('expenseFilterVehicle');
    const driverFilter = document.getElementById('expenseFilterDriver');
    const categoryFilter = document.getElementById('expenseFilterCategory');
    const startDateFilter = document.getElementById('expenseFilterStartDate');
    const endDateFilter = document.getElementById('expenseFilterEndDate');
    const customDateGroup = document.getElementById('expenseFilterCustomDate');

    if (!periodFilter) return;

    // Mostrar/ocultar campos de data personalizada
    if (periodFilter.value === 'custom' && customDateGroup) {
        customDateGroup.style.display = 'flex';
    } else if (customDateGroup) {
        customDateGroup.style.display = 'none';
    }

    // Obter filtros ativos
    const filters = {
        period: periodFilter.value,
        vehicle: vehicleFilter?.value || '',
        driver: driverFilter?.value || '',
        category: categoryFilter?.value || '',
        startDate: startDateFilter?.value || '',
        endDate: endDateFilter?.value || ''
    };

    // Filtrar array de despesas
    let filteredExpenses = [...expenses];

    // Filtrar por período
    if (filters.period && filters.period !== 'custom') {
        const now = new Date();
        let startDate = new Date();

        switch(filters.period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(1);
                break;
            case 'last30':
                startDate.setDate(now.getDate() - 30);
                break;
            case 'last90':
                startDate.setDate(now.getDate() - 90);
                break;
            case 'year':
                startDate.setMonth(0, 1);
                break;
        }

        filteredExpenses = filteredExpenses.filter(e => {
            const expenseDate = new Date(e.date || e.data);
            return expenseDate >= startDate && expenseDate <= now;
        });
    }

    // Filtrar por data personalizada
    if (filters.period === 'custom') {
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredExpenses = filteredExpenses.filter(e => {
                const expenseDate = new Date(e.date || e.data);
                return expenseDate >= startDate;
            });
        }
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            filteredExpenses = filteredExpenses.filter(e => {
                const expenseDate = new Date(e.date || e.data);
                return expenseDate <= endDate;
            });
        }
    }

    // Filtrar por veículo
    if (filters.vehicle) {
        filteredExpenses = filteredExpenses.filter(e =>
            e.vehicleId == filters.vehicle
        );
    }

    // Filtrar por motorista
    if (filters.driver) {
        // Por enquanto, vamos filtrar por notas ou criar associação futura
        filteredExpenses = filteredExpenses.filter(e =>
            e.driverId == filters.driver
        );
    }

    // Filtrar por categoria
    if (filters.category) {
        filteredExpenses = filteredExpenses.filter(e =>
            e.category === filters.category
        );
    }

    // Atualizar tabela com despesas filtradas
    renderExpensesTable(filteredExpenses);

    // Atualizar KPIs com dados filtrados
    updateFilteredKPIs(filteredExpenses);
}

// Função para limpar filtros
function clearExpenseFilters() {
    // Resetar valores dos filtros
    const periodFilter = document.getElementById('expenseFilterPeriod');
    const vehicleFilter = document.getElementById('expenseFilterVehicle');
    const driverFilter = document.getElementById('expenseFilterDriver');
    const categoryFilter = document.getElementById('expenseFilterCategory');
    const startDateFilter = document.getElementById('expenseFilterStartDate');
    const endDateFilter = document.getElementById('expenseFilterEndDate');
    const customDateGroup = document.getElementById('expenseFilterCustomDate');

    if (periodFilter) periodFilter.value = 'month';
    if (vehicleFilter) vehicleFilter.value = '';
    if (driverFilter) driverFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (startDateFilter) startDateFilter.value = '';
    if (endDateFilter) endDateFilter.value = '';
    if (customDateGroup) customDateGroup.style.display = 'none';

    // Recarregar tabela completa
    renderExpensesTable(expenses);
    updateExpenseKPIs();
}

// Função para renderizar tabela de despesas
function renderExpensesTable(expensesToRender) {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    if (!expensesToRender || expensesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nenhuma despesa encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    expensesToRender.forEach((expense, index) => {
        const date = expense.date || expense.data;
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const categoryMap = {
            'abastecimento': 'Abastecimento',
            'pedagio': 'Pedágio',
            'estacionamento': 'Estacionamento',
            'manutencao': 'Manutenção',
            'outros': 'Outros'
        };

        const categoryDisplay = categoryMap[expense.category] || expense.category || 'N/A';
        const vehicleInfo = expense.vehiclePlate || 'N/A';
        const km = expense.currentKm || 'N/A';
        const liters = expense.liters ? expense.liters.toFixed(2) + 'L' : 'N/A';
        const pricePerLiter = expense.pricePerLiter ? 'R$ ' + expense.pricePerLiter.toFixed(2) : 'N/A';
        const total = expense.totalValue ? 'R$ ' + expense.totalValue.toFixed(2).replace('.', ',') : 'N/A';
        const notes = expense.notes || expense.observacoes || '-';

        tbody.innerHTML += `
            <tr>
                <td>${expense.id}</td>
                <td>${vehicleInfo}</td>
                <td>${categoryDisplay}</td>
                <td>${formattedDate}</td>
                <td>${km}</td>
                <td>${liters}</td>
                <td>${pricePerLiter}</td>
                <td>${total}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense(${expense.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Função para atualizar KPIs com dados filtrados
function updateFilteredKPIs(filteredExpenses) {
    const monthTotal = document.getElementById('expenseMonthTotal');
    const fuelTotal = document.getElementById('expenseFuelTotal');
    const maintenanceTotal = document.getElementById('expenseMaintenanceTotal');
    const avgConsumption = document.getElementById('expenseAvgConsumption');

    if (!monthTotal || !fuelTotal || !maintenanceTotal || !avgConsumption) {
        return;
    }

    // Calcular totais com base nas despesas filtradas
    let total = 0;
    let totalFuel = 0;
    let totalMaintenance = 0;
    let totalLiters = 0;
    let totalKmFuel = 0;
    let fuelCount = 0;

    filteredExpenses.forEach(e => {
        const value = e.totalValue || 0;
        total += value;

        if (e.category === 'abastecimento') {
            totalFuel += value;
            if (e.liters && e.currentKm) {
                totalLiters += e.liters;
                totalKmFuel += e.currentKm;
                fuelCount++;
            }
        } else if (e.category === 'manutencao') {
            totalMaintenance += value;
        }
    });

    // Calcular consumo médio
    let avgConsumptionValue = 'N/A';
    if (fuelCount > 1 && totalLiters > 0) {
        const kmPerLiter = totalKmFuel / totalLiters;
        avgConsumptionValue = kmPerLiter.toFixed(2) + ' km/L';
    }

    // Atualizar valores
    monthTotal.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
    fuelTotal.textContent = 'R$ ' + totalFuel.toFixed(2).replace('.', ',');
    maintenanceTotal.textContent = 'R$ ' + totalMaintenance.toFixed(2).replace('.', ',');
    avgConsumption.textContent = avgConsumptionValue;
}

// Função para exportar despesas
function exportExpenses() {
    // Obter despesas visíveis na tabela (já filtradas)
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0 || rows[0].cells.length === 1) {
        showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }

    // Criar CSV
    let csv = 'ID,Veículo,Categoria,Data/Hora,KM,Litros,Preço/L,Total\n';

    rows.forEach(row => {
        if (row.cells.length > 1) {
            const rowData = [];
            for (let i = 0; i < row.cells.length - 1; i++) { // Ignorar coluna de ações
                let cellData = row.cells[i].textContent.trim();
                // Adicionar aspas se contiver vírgula
                if (cellData.includes(',')) {
                    cellData = `"${cellData}"`;
                }
                rowData.push(cellData);
            }
            csv += rowData.join(',') + '\n';
        }
    });

    // Baixar arquivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `despesas_${date}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Despesas exportadas com sucesso!', 'success');
}

// Função para preencher dropdowns de filtros
function populateExpenseFilters() {
    // Preencher dropdown de veículos
    const vehicleFilter = document.getElementById('expenseFilterVehicle');
    if (vehicleFilter && vehicles.length > 0) {
        // Limpar opções existentes (mantendo "Todos")
        vehicleFilter.innerHTML = '<option value="">Todos</option>';

        // Adicionar veículos
        vehicles.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = `${v.placa || v.plate} - ${v.modelo || v.model}`;
            vehicleFilter.appendChild(option);
        });
    }

    // Preencher dropdown de motoristas
    const driverFilter = document.getElementById('expenseFilterDriver');
    if (driverFilter && drivers.length > 0) {
        // Limpar opções existentes (mantendo "Todos")
        driverFilter.innerHTML = '<option value="">Todos</option>';

        // Adicionar motoristas
        drivers.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.nome || d.name;
            driverFilter.appendChild(option);
        });
    }
}

async function deleteExpense(id) {
    if (!confirm('Confirmar exclusão da despesa?')) return;
    try {
        const resp = await apiDeleteExpense(id);
        if (!resp.success) {
            showAlert(resp.message || 'Erro ao excluir despesa', 'danger');
            return;
        }
        await loadExpensesTable();
        showAlert('Despesa excluída!', 'success');
    } catch (err) {
        console.error('Erro ao excluir despesa:', err);
        showAlert('Erro ao excluir despesa', 'danger');
    }
}

async function addMaintenanceRecord() {
    const vehicleId = parseInt(document.getElementById('maintenanceVehicle').value);
    const type = document.getElementById('maintenanceType').value;
    const date = document.getElementById('maintenanceDate').value;
    const km = parseInt(document.getElementById('maintenanceKm').value);
    const value = parseFloat(document.getElementById('maintenanceValue').value);
    const description = document.getElementById('maintenanceDescription').value;

    // Verificar se é edição ou criação
    const maintenanceId = document.getElementById('maintenanceId').value;
    const isEditing = maintenanceId !== '';

    try {
        const maintenanceData = {
            vehicleId,
            type,
            date,
            km,
            value,
            description
        };

        let response;
        if (isEditing) {
            // TODO: Implementar endpoint de UPDATE no backend
            // response = await apiUpdateMaintenance(maintenanceId, maintenanceData);

            // Temporário: atualizar localmente
            const record = maintenanceRecords.find(r => r.id == maintenanceId);
            if (record) {
                record.vehicleId = vehicleId;
                record.type = type;
                record.date = date;
                record.km = km;
                record.value = value;
                record.description = description;
                record.updatedAt = new Date().toISOString();
            }
            showAlert('Manutenção atualizada com sucesso! (Aguardando implementação do backend)', 'success');
            await loadMaintenanceTable();
        } else {
            // Criar novo registro via API
            response = await apiCreateMaintenance(maintenanceData);

            if (response.success) {
                showAlert(response.message || 'Manutenção cadastrada com sucesso!', 'success');
                await loadMaintenanceTable();
            } else {
                showAlert(response.message || 'Erro ao cadastrar manutenção', 'danger');
            }
        }

        await loadVehiclesTable();
        resetMaintenanceForm();
        closeModal('maintenanceModal');
        await updateDashboardStats();

    } catch (error) {
        console.error('Erro ao cadastrar manutenção:', error);
        showAlert(error.message || 'Erro ao cadastrar manutenção', 'danger');
    }
}

async function loadMaintenanceTable() {
    const tbody = document.getElementById('maintenanceTableBody');
    if (!tbody) return;

    try {
        const response = await apiGetMaintenance();
        if (!response.success) {
            showAlert('Erro ao carregar manutenções', 'danger');
            return;
        }

        maintenanceRecords = response.data || [];
        tbody.innerHTML = '';

        maintenanceRecords.forEach(record => {
            const vehicle = vehicles.find(v => v.id === (record.vehicleId || record.veiculo_id));

            // Handle both camelCase and snake_case from API
            const type = record.type || record.tipo;
            const date = record.date || record.data;
            const km = record.km || record.quilometragem;
            const value = record.value || record.valor;
            const description = record.description || record.descricao;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${vehicle ? (vehicle.plate || vehicle.placa) : 'Veículo não encontrado'}</td>
                <td>${getMaintenanceTypeText(type)}</td>
                <td>${formatDate(date)}</td>
                <td>${km ? km.toLocaleString() : '0'} km</td>
                <td>R$ ${value ? value.toFixed(2) : '0.00'}</td>
                <td>${description || ''}</td>
                <td>
                    <button class="btn-icon" onclick="editMaintenance(${record.id})" title="Editar manutenção">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteMaintenance(${record.id})" title="Excluir manutenção">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar manutenções:', error);
        showAlert('Erro ao carregar manutenções', 'danger');
    }
}

function editMaintenance(id) {
    const record = maintenanceRecords.find(r => r.id === id);
    if (!record) return;

    // Preencher o formulário com os dados da manutenção
    document.getElementById('maintenanceId').value = record.id;
    document.getElementById('maintenanceVehicle').value = record.vehicleId;
    document.getElementById('maintenanceType').value = record.type;
    document.getElementById('maintenanceDate').value = record.date;
    document.getElementById('maintenanceKm').value = record.km;
    document.getElementById('maintenanceValue').value = record.value;
    document.getElementById('maintenanceDescription').value = record.description;

    // Mudar título do modal
    document.getElementById('maintenanceModalTitle').textContent = 'Editar Manutenção';

    // Abrir o modal
    openModal('maintenanceModal');
}

async function deleteMaintenance(id) {
    if (confirm('Tem certeza que deseja excluir este registro de manutenção?')) {
        try {
            const response = await apiDeleteMaintenance(id);

            if (response.success) {
                showAlert(response.message || 'Manutenção excluída com sucesso!', 'success');
                await loadMaintenanceTable();
                await updateDashboardStats();
            } else {
                showAlert(response.message || 'Erro ao excluir manutenção', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir manutenção:', error);
            showAlert(error.message || 'Erro ao excluir manutenção', 'danger');
        }
    }
}

// Função para resetar formulário de manutenção
function resetMaintenanceForm() {
    document.getElementById('maintenanceId').value = '';
    document.getElementById('maintenanceVehicle').value = '';
    document.getElementById('maintenanceType').value = 'revisão';
    document.getElementById('maintenanceDate').value = '';
    document.getElementById('maintenanceKm').value = '';
    document.getElementById('maintenanceValue').value = '';
    document.getElementById('maintenanceDescription').value = '';
    document.getElementById('maintenanceModalTitle').textContent = 'Nova Manutenção';
}

// === GERENCIAMENTO DE DESTINOS ===

async function addDestination() {
    const name = document.getElementById('destinationName').value.trim();
    const distance = parseFloat(document.getElementById('destinationDistance').value);

    // Validações
    if (!name) {
        showAlert('Por favor, preencha o nome do destino', 'danger');
        return;
    }

    if (!distance || distance <= 0) {
        showAlert('Por favor, informe uma distância válida', 'danger');
        return;
    }

    // Verificar se é edição ou criação
    const destinationId = document.getElementById('destinationId').value;
    const isEditing = destinationId !== '';

    try {
        const destinationData = {
            name: name,
            // API espera 'distance' (não 'distanceKm')
            distance: distance
        };

        let response;
        if (isEditing) {
            response = await apiUpdateDestination(destinationId, destinationData);
        } else {
            response = await apiCreateDestination(destinationData);
        }

        if (response.success) {
            showAlert(response.message || 'Destino salvo com sucesso!', 'success');
            await loadDestinationsTable();
            populateDestinationSelects();
            closeModal('destinationModal');
            resetDestinationForm();
        } else {
            showAlert(response.message || 'Erro ao salvar destino', 'danger');
        }
    } catch (error) {
        console.error('Erro ao salvar destino:', error);
        showAlert(error.message || 'Erro ao salvar destino', 'danger');
    }
}

async function loadDestinationsTable() {
    const tbody = document.getElementById('destinationsTableBody');
    if (!tbody) return;

    try {
        const response = await apiGetDestinations();
        if (!response.success) {
            showAlert('Erro ao carregar destinos', 'danger');
            return;
        }

        destinations = response.data || [];
        tbody.innerHTML = '';

        if (destinations.length === 0) {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                    Nenhum destino cadastrado. Clique em "Novo Destino" para adicionar.
                </td>
            `;
            return;
        }

        destinations.forEach(destination => {
            const row = tbody.insertRow();

            // Handle both camelCase and snake_case
            const name = destination.name || destination.nome;
            const distanceKm = (destination.distanceKm ?? destination.distancia_km ?? destination.distance);
            const createdAt = destination.createdAt || destination.created_at;

            const createdDate = createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '-';

            row.innerHTML = `
                <td>${name}</td>
                <td>${distanceKm != null ? distanceKm + ' km' : '-'}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn-icon" onclick="editDestination(${destination.id})" title="Editar destino">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteDestination(${destination.id})" title="Excluir destino">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar destinos:', error);
        showAlert('Erro ao carregar destinos', 'danger');
    }
}

function editDestination(id) {
    const destination = destinations.find(d => d.id === id);
    if (!destination) return;

    // Preencher o formulário
    document.getElementById('destinationId').value = destination.id;
    document.getElementById('destinationName').value = destination.name;
    document.getElementById('destinationDistance').value = destination.distanceKm ?? destination.distancia_km ?? destination.distance ?? '';

    // Mudar título do modal
    document.getElementById('destinationModalTitle').textContent = 'Editar Destino';

    // Abrir o modal
    openModal('destinationModal');
}

async function deleteDestination(id) {
    // Verificar se o destino está sendo usado em algum registro de uso
    const usedInRecords = usageRecords.some(r => (r.destinationId || r.destino_id) === id);

    if (usedInRecords) {
        if (!confirm('Este destino está sendo usado em registros de uso. Tem certeza que deseja excluí-lo?')) {
            return;
        }
    } else {
        if (!confirm('Tem certeza que deseja excluir este destino?')) {
            return;
        }
    }

    try {
        const response = await apiDeleteDestination(id);

        if (response.success) {
            showAlert(response.message || 'Destino excluído com sucesso!', 'success');
            await loadDestinationsTable();
            populateDestinationSelects();
        } else {
            showAlert(response.message || 'Erro ao excluir destino', 'danger');
        }
    } catch (error) {
        console.error('Erro ao excluir destino:', error);
        showAlert(error.message || 'Erro ao excluir destino', 'danger');
    }
}

function resetDestinationForm() {
    document.getElementById('destinationId').value = '';
    document.getElementById('destinationName').value = '';
    document.getElementById('destinationDistance').value = '';
    document.getElementById('destinationModalTitle').textContent = 'Novo Destino';
}

function populateDestinationSelects() {
    const select = document.getElementById('usageDestination');
    if (!select) return;

    // Limpar opções existentes exceto a primeira
    select.innerHTML = '<option value="">Selecione o destino</option>';

    // Adicionar destinos ordenados por nome
    const sortedDestinations = [...destinations].sort((a, b) => a.name.localeCompare(b.name));

    sortedDestinations.forEach(destination => {
        const option = document.createElement('option');
        option.value = destination.id;
        const dkm = (destination.distanceKm ?? destination.distancia_km ?? destination.distance);
        option.textContent = dkm != null ? `${destination.name} (${dkm} km)` : `${destination.name}`;
        select.appendChild(option);
    });
}

// === FILTROS E KPIs DE USO DE VEÍCULOS ===

function updateUsageKPIs() {
    // Calculate total trips
    const totalTrips = usageRecords.length;
    document.getElementById('kpiTotalTrips').textContent = totalTrips;

    // Calculate active vs completed trips
    const activeTrips = usageRecords.filter(r => r.status === 'em-uso').length;
    const completedTrips = usageRecords.filter(r => r.status === 'finalizado').length;
    document.getElementById('kpiActiveTrips').textContent = activeTrips;
    document.getElementById('kpiCompletedTrips').textContent = completedTrips;

    // Calculate total distance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecords = usageRecords.filter(r => {
        const departureTime = r.departureTime || r.data_hora_saida;
        const departureDate = new Date(departureTime);
        return departureDate >= thirtyDaysAgo && r.kmReturn;
    });

    const totalDistance = recentRecords.reduce((sum, r) => sum + (r.kmReturn - r.kmDeparture), 0);
    
    document.getElementById('kpiTotalDistance').textContent = totalDistance.toLocaleString('pt-BR') + ' km';

    // Find most popular destination
    const destinationCounts = {};
    usageRecords.forEach(r => {
        if (r.destinationId) {
            destinationCounts[r.destinationId] = (destinationCounts[r.destinationId] || 0) + 1;
        }
    });

    let popularDestinationId = null;
    let maxCount = 0;
    for (const destId in destinationCounts) {
        if (destinationCounts[destId] > maxCount) {
            maxCount = destinationCounts[destId];
            popularDestinationId = parseInt(destId);
        }
    }

    if (popularDestinationId) {
        const destination = destinations.find(d => d.id === popularDestinationId);
        document.getElementById('kpiPopularDestination').textContent = destination ? destination.name : '-';
        document.getElementById('kpiPopularDestinationCount').textContent = maxCount + ' viagens';
    } else {
        document.getElementById('kpiPopularDestination').textContent = '-';
        document.getElementById('kpiPopularDestinationCount').textContent = '0 viagens';
    }

    // Find most used vehicle
    const vehicleCounts = {};
    usageRecords.forEach(r => {
        if (r.vehicleId) {
            vehicleCounts[r.vehicleId] = (vehicleCounts[r.vehicleId] || 0) + 1;
        }
    });

    let mostUsedVehicleId = null;
    let maxVehicleCount = 0;
    for (const vehId in vehicleCounts) {
        if (vehicleCounts[vehId] > maxVehicleCount) {
            maxVehicleCount = vehicleCounts[vehId];
            mostUsedVehicleId = parseInt(vehId);
        }
    }

    if (mostUsedVehicleId) {
        const vehicle = vehicles.find(v => v.id === mostUsedVehicleId);
        if (vehicle) {
            const brand = vehicle.brand || vehicle.marca;
            const model = vehicle.model || vehicle.modelo;
            const vehicleName = `${brand} ${model}`;

            document.getElementById('kpiMostUsedVehicle').textContent = vehicleName;
            document.getElementById('kpiMostUsedVehicleCount').textContent = vehicle.plate;
        } else {
            document.getElementById('kpiMostUsedVehicle').textContent = '-';
            document.getElementById('kpiMostUsedVehicleCount').textContent = '-';
        }
    } else {
        document.getElementById('kpiMostUsedVehicle').textContent = '-';
        document.getElementById('kpiMostUsedVehicleCount').textContent = 'Nenhuma viagem';
    }
}

// === RANKINGS TOP 5 ===
function updateRankings() {
    // Ranking de Veículos
    const vehicleUsage = {};
    usageRecords.forEach(record => {
        const vehicleId = record.vehicleId || record.veiculo_id;
        if (vehicleId) {
            vehicleUsage[vehicleId] = (vehicleUsage[vehicleId] || 0) + 1;
        }
    });

    const topVehicles = Object.entries(vehicleUsage)
        .map(([id, count]) => {
            const vehicle = vehicles.find(v => v.id === parseInt(id));
            const totalKm = calculateVehicleUsage(parseInt(id));
            return { vehicle, count, totalKm };
        })
        .filter(item => item.vehicle)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const vehicleContainer = document.getElementById('rankingVehicles');
    if (vehicleContainer) {
        if (topVehicles.length === 0) {
            vehicleContainer.innerHTML = '<div class="ranking-empty">Nenhuma viagem registrada</div>';
        } else {
            vehicleContainer.innerHTML = topVehicles.map(item => {
                const model = item.vehicle.model || item.vehicle.modelo;
                const plate = item.vehicle.plate || item.vehicle.placa;
                const photo = item.vehicle.photo || item.vehicle.foto;

                // Formatar foto base64
                let photoSrc = 'https://via.placeholder.com/45';
                if (photo) {
                    const photoType = item.vehicle.photo_type || item.vehicle.tipo_foto || 'jpeg';
                    photoSrc = photo.startsWith('data:') ? photo : `data:image/${photoType};base64,${photo}`;
                }

                return `
                    <div class="ranking-item">
                        <img src="${photoSrc}" alt="${model}" class="ranking-photo" onerror="this.src='https://via.placeholder.com/45'">
                        <div class="ranking-info">
                            <div class="ranking-name">${model}</div>
                            <div class="ranking-detail">Placa: ${plate}</div>
                            <div class="ranking-detail">KM: ${item.totalKm.toLocaleString('pt-BR')} km</div>
                        </div>
                        <div class="ranking-count">${item.count}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // Ranking de Motoristas
    const driverUsage = {};
    usageRecords.forEach(record => {
        const driverId = record.driverId || record.motorista_id;
        if (driverId) {
            driverUsage[driverId] = (driverUsage[driverId] || 0) + 1;
        }
    });

    const topDrivers = Object.entries(driverUsage)
        .map(([id, count]) => {
            const driver = drivers.find(d => d.id === parseInt(id));
            const totalKm = calculateDriverUsage(parseInt(id));
            return { driver, count, totalKm };
        })
        .filter(item => item.driver)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const driverContainer = document.getElementById('rankingDrivers');
    if (driverContainer) {
        if (topDrivers.length === 0) {
            driverContainer.innerHTML = '<div class="ranking-empty">Nenhuma viagem registrada</div>';
        } else {
            driverContainer.innerHTML = topDrivers.map(item => {
                const name = item.driver.name || item.driver.nome;
                const photo = item.driver.photo || item.driver.foto;

                // Format photo with base64 prefix if needed
                let photoSrc = 'https://via.placeholder.com/45';
                if (photo) {
                    const photoType = item.driver.photo_type || item.driver.tipo_foto || 'jpeg';
                    photoSrc = photo.startsWith('data:') ? photo : `data:image/${photoType};base64,${photo}`;
                }

                return `
                    <div class="ranking-item">
                        <img src="${photoSrc}" alt="${name}" class="ranking-photo" onerror="this.src='https://via.placeholder.com/45'">
                        <div class="ranking-info">
                            <div class="ranking-name">${name}</div>
                            <div class="ranking-detail">KM: ${item.totalKm.toLocaleString('pt-BR')} km</div>
                        </div>
                        <div class="ranking-count">${item.count}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

function populateUsageFilterSelects() {
    // Populate vehicle filter
    const vehicleFilter = document.getElementById('filterVehicle');
    if (vehicleFilter) {
        vehicleFilter.innerHTML = '<option value="">Todos os veículos</option>';
        const sortedVehicles = [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate));
        sortedVehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.plate} - ${vehicle.model}`;
            vehicleFilter.appendChild(option);
        });
    }

    // Populate driver filter
    const driverFilter = document.getElementById('filterDriver');
    if (driverFilter) {
        driverFilter.innerHTML = '<option value="">Todos os motoristas</option>';
        const sortedDrivers = [...drivers].sort((a, b) => a.name.localeCompare(b.name));
        sortedDrivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            driverFilter.appendChild(option);
        });
    }

    // Populate destination filter
    const destinationFilter = document.getElementById('filterDestination');
    if (destinationFilter) {
        destinationFilter.innerHTML = '<option value="">Todos os destinos</option>';
        const sortedDestinations = [...destinations].sort((a, b) => a.name.localeCompare(b.name));
        sortedDestinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination.id;
            option.textContent = `${destination.name} (${destination.distanceKm} km)`;
            destinationFilter.appendChild(option);
        });
    }
}

// Helper function to create date in local timezone (fixes UTC offset issue)
function createLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
}

function applyUsageFilters() {
    // Get filter values
    const vehicleId = document.getElementById('filterVehicle').value;
    const driverId = document.getElementById('filterDriver').value;
    const destinationId = document.getElementById('filterDestination').value;
    const dateStart = document.getElementById('filterDateStart').value;
    const dateEnd = document.getElementById('filterDateEnd').value;
    const status = document.getElementById('filterStatus').value;

    // Filter records
    let filtered = [...usageRecords];

    if (vehicleId) {
        filtered = filtered.filter(r => r.vehicleId === parseInt(vehicleId));
    }

    if (driverId) {
        filtered = filtered.filter(r => r.driverId === parseInt(driverId));
    }

    if (destinationId) {
        filtered = filtered.filter(r => r.destinationId === parseInt(destinationId));
    }

    if (dateStart) {
        const startDate = createLocalDate(dateStart);
        startDate.setHours(0, 0, 0, 0);

        filtered = filtered.filter(r => {
            const departureTime = r.departureTime || r.data_hora_saida;
            const departureDate = new Date(departureTime);
            return departureDate >= startDate;
        });
    }

    if (dateEnd) {
        const endDate = createLocalDate(dateEnd);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date

        filtered = filtered.filter(r => {
            const departureTime = r.departureTime || r.data_hora_saida;
            const departureDate = new Date(departureTime);
            return departureDate <= endDate;
        });
    }

    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }

    // Update table with filtered data
    loadUsageTable(filtered);

    // Update filter badges display
    updateFilterBadges({
        vehicleId,
        driverId,
        destinationId,
        dateStart,
        dateEnd,
        status
    });

    // Show/hide empty state
    const emptyState = document.getElementById('usageEmptyState');
    const tableContainer = document.querySelector('#uso-veiculos .table-container');

    if (filtered.length === 0) {
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
    }
}

function updateFilterBadges(filters) {
    const badgesContainer = document.getElementById('filterBadges');
    const activeFiltersDisplay = document.getElementById('activeFiltersDisplay');

    if (!badgesContainer || !activeFiltersDisplay) return;

    badgesContainer.innerHTML = '';
    let hasActiveFilters = false;

    if (filters.vehicleId) {
        const vehicle = vehicles.find(v => v.id === parseInt(filters.vehicleId));
        if (vehicle) {
            badgesContainer.innerHTML += `<span class="filter-badge">Veículo: ${vehicle.plate}</span>`;
            hasActiveFilters = true;
        }
    }

    if (filters.driverId) {
        const driver = drivers.find(d => d.id === parseInt(filters.driverId));
        if (driver) {
            badgesContainer.innerHTML += `<span class="filter-badge">Motorista: ${driver.name}</span>`;
            hasActiveFilters = true;
        }
    }

    if (filters.destinationId) {
        const destination = destinations.find(d => d.id === parseInt(filters.destinationId));
        if (destination) {
            badgesContainer.innerHTML += `<span class="filter-badge">Destino: ${destination.name}</span>`;
            hasActiveFilters = true;
        }
    }

    if (filters.dateStart) {
        const formattedDate = createLocalDate(filters.dateStart).toLocaleDateString('pt-BR');
        badgesContainer.innerHTML += `<span class="filter-badge">De: ${formattedDate}</span>`;
        hasActiveFilters = true;
    }

    if (filters.dateEnd) {
        const formattedDate = createLocalDate(filters.dateEnd).toLocaleDateString('pt-BR');
        badgesContainer.innerHTML += `<span class="filter-badge">Até: ${formattedDate}</span>`;
        hasActiveFilters = true;
    }

    if (filters.status) {
        const statusLabel = filters.status === 'em-uso' ? 'Em uso' : 'Finalizadas';
        badgesContainer.innerHTML += `<span class="filter-badge">${statusLabel}</span>`;
        hasActiveFilters = true;
    }

    activeFiltersDisplay.style.display = hasActiveFilters ? 'block' : 'none';
}

function clearUsageFilters() {
    // Clear all filter inputs
    document.getElementById('filterVehicle').value = '';
    document.getElementById('filterDriver').value = '';
    document.getElementById('filterDestination').value = '';
    document.getElementById('filterDateStart').value = '';
    document.getElementById('filterDateEnd').value = '';
    document.getElementById('filterStatus').value = '';

    // Hide filter badges
    const activeFiltersDisplay = document.getElementById('activeFiltersDisplay');
    if (activeFiltersDisplay) {
        activeFiltersDisplay.style.display = 'none';
    }

    // Reload table with all data
    loadUsageTable();

    // Show table, hide empty state
    const emptyState = document.getElementById('usageEmptyState');
    const tableContainer = document.querySelector('#uso-veiculos .table-container');

    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
}

// === ALERTAS E NOTIFICAÇÕES ===

function loadAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    
    const alerts = [];
    const today = new Date();
    
    // Verificar CNHs vencidas ou próximas ao vencimento
    drivers.forEach(driver => {
        const daysUntilExpiry = getDaysUntilExpiry(driver.cnhExpiry);
        if (daysUntilExpiry < 0) {
            alerts.push({
                type: 'danger',
                title: 'CNH Vencida',
                message: `${driver.name} - CNH ${driver.cnh} vencida há ${Math.abs(daysUntilExpiry)} dias.`,
                date: today
            });
        } else if (daysUntilExpiry < 30) {
            alerts.push({
                type: 'warning',
                title: 'CNH Próximo ao Vencimento',
                message: `${driver.name} - CNH ${driver.cnh} vence em ${daysUntilExpiry} dias.`,
                date: today
            });
        }
    });
    
    // Verificar veículos em uso há muito tempo
    usageRecords.forEach(record => {
        if (record.status === 'em-uso') {
            const departureTime = record.departureTime || record.data_hora_saida;
            const departureDate = new Date(departureTime);
            const hoursUsed = (today - departureDate) / (1000 * 60 * 60);
            if (hoursUsed > 12) {
                const vehicle = vehicles.find(v => v.id === record.vehicleId);
                const driver = drivers.find(d => d.id === record.driverId);
                alerts.push({
                    type: 'warning',
                    title: 'Uso Prolongado',
                    message: `${vehicle ? vehicle.plate : 'Veículo'} em uso por ${driver ? driver.name : 'motorista'} há mais de ${Math.floor(hoursUsed)} horas.`,
                    date: today
                });
            }
        }
    });
    
    // Verificar manutenções necessárias (exemplo: baseada em quilometragem)
    vehicles.forEach(vehicle => {
        const lastMaintenance = maintenanceRecords
            .filter(r => r.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        if (lastMaintenance) {
            const kmSinceMaintenance = vehicle.currentKm - lastMaintenance.km;
            if (kmSinceMaintenance > 10000) { // Mais de 10.000 km desde última manutenção
                alerts.push({
                    type: 'info',
                    title: 'Revisão Necessária',
                    message: `${vehicle.plate} precisa de revisão (${kmSinceMaintenance.toLocaleString()} km desde última manutenção).`,
                    date: today
                });
            }
        } else if (vehicle.currentKm > 5000) { // Nunca fez manutenção e já tem mais de 5.000 km
            alerts.push({
                type: 'info',
                title: 'Primeira Revisão',
                message: `${vehicle.plate} nunca fez manutenção (${vehicle.currentKm.toLocaleString()} km).`,
                date: today
            });
        }
    });
    
    // Renderizar alertas
    if (alerts.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum alerta no momento.</div>';
    } else {
        container.innerHTML = alerts.map(alert => `
            <div class="alert alert-${alert.type}">
                <strong>${alert.title}:</strong> ${alert.message}
            </div>
        `).join('');
    }
    
    // Atualizar contador de alertas
    updateDashboardStats();
}

// === FUNÇÕES AUXILIARES ===

function updateDashboardStats() {
    // KPI 1: Frota Total
    const fleetSummary = getFleetSummary();
    const kpiFleetTotal = document.getElementById('kpiFleetTotal');
    const kpiFleetAvailable = document.getElementById('kpiFleetAvailable');
    const kpiFleetInUse = document.getElementById('kpiFleetInUse');
    const kpiFleetMaintenance = document.getElementById('kpiFleetMaintenance');

    if (kpiFleetTotal) {
        kpiFleetTotal.textContent = fleetSummary.total;
        kpiFleetAvailable.textContent = fleetSummary.available;
        kpiFleetInUse.textContent = fleetSummary.inUse;
        kpiFleetMaintenance.textContent = fleetSummary.maintenance;
    }

    // KPI 2: Alertas Críticos (Manutenção + CNH)
    const maintenanceAlerts = getMaintenanceAlerts();
    const cnhAlerts = getCNHAlerts();
    const totalAlerts = maintenanceAlerts.count + cnhAlerts.count;

    const kpiTotalAlerts = document.getElementById('kpiTotalAlerts');
    const kpiMaintenanceCount = document.getElementById('kpiMaintenanceCount');
    const kpiCNHCount = document.getElementById('kpiCNHCount');

    if (kpiTotalAlerts) {
        kpiTotalAlerts.textContent = totalAlerts;
        kpiMaintenanceCount.textContent = maintenanceAlerts.count;
        kpiCNHCount.textContent = cnhAlerts.count;
    }

    // KPI 3: Custo Total
    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.value || 0), 0);
    const kpiTotalCost = document.getElementById('kpiTotalCost');

    if (kpiTotalCost) {
        kpiTotalCost.textContent = totalCost > 0 ? `R$ ${totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ 0,00';
    }

    // KPI 4: Motoristas
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter(d => d.status === 'ativo').length;
    const inactiveDrivers = totalDrivers - activeDrivers;

    const kpiDashboardTotalDrivers = document.getElementById('kpiDashboardTotalDrivers');
    const kpiDashboardActiveDrivers = document.getElementById('kpiDashboardActiveDrivers');
    const kpiDashboardInactiveDrivers = document.getElementById('kpiDashboardInactiveDrivers');

    if (kpiDashboardTotalDrivers) {
        kpiDashboardTotalDrivers.textContent = totalDrivers;
        kpiDashboardActiveDrivers.textContent = activeDrivers;
        kpiDashboardInactiveDrivers.textContent = inactiveDrivers;
    }

    // Atualizar todos os gráficos
    updateAllCharts();
}

// === FUNÇÕES DE CÁLCULO DE KPIs ===

function getMaintenanceAlerts() {
    const alerts = [];

    vehicles.forEach(vehicle => {
        const lastMaintenance = maintenanceRecords
            .filter(r => r.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        if (lastMaintenance) {
            const kmSinceMaintenance = vehicle.currentKm - lastMaintenance.km;
            if (kmSinceMaintenance > 10000) { // Mais de 10.000 km desde última manutenção
                alerts.push({
                    vehicle: vehicle,
                    kmSince: kmSinceMaintenance
                });
            }
        } else if (vehicle.currentKm > 5000) { // Nunca fez manutenção e já tem mais de 5.000 km
            alerts.push({
                vehicle: vehicle,
                kmSince: vehicle.currentKm
            });
        }
    });

    // Ordenar por maior KM sem manutenção
    alerts.sort((a, b) => b.kmSince - a.kmSince);

    return {
        count: alerts.length,
        detail: alerts.length > 0 ? `Próxima: ${alerts[0].vehicle.plate} (${alerts[0].kmSince.toLocaleString('pt-BR')} km)` : 'Nenhuma manutenção pendente'
    };
}

function getCNHAlerts() {
    const alerts = [];

    drivers.forEach(driver => {
        const daysUntilExpiry = getDaysUntilExpiry(driver.cnhExpiry);
        if (daysUntilExpiry < 30) { // CNH vencida ou vence em menos de 30 dias
            alerts.push({
                driver: driver,
                days: daysUntilExpiry
            });
        }
    });

    // Ordenar por vencimento mais próximo
    alerts.sort((a, b) => a.days - b.days);

    let detail = '-';
    if (alerts.length > 0) {
        const firstAlert = alerts[0];
        if (firstAlert.days < 0) {
            detail = `${firstAlert.driver.name} - Vencida há ${Math.abs(firstAlert.days)} dias`;
        } else {
            detail = `${firstAlert.driver.name} - Vence em ${firstAlert.days} dias`;
        }
    } else {
        detail = 'Todas CNHs em dia';
    }

    return {
        count: alerts.length,
        detail: detail
    };
}

function getMostUsedVehicle() {
    if (vehicles.length === 0) {
        return { km: 0, detail: 'Nenhum veículo cadastrado' };
    }

    const vehiclesWithUsage = vehicles.map(vehicle => {
        const usage = calculateVehicleUsage(vehicle.id);
        return {
            vehicle: vehicle,
            totalKm: usage
        };
    });

    // Ordenar por maior KM
    vehiclesWithUsage.sort((a, b) => b.totalKm - a.totalKm);

    const topVehicle = vehiclesWithUsage[0];

    return {
        km: topVehicle.totalKm,
        detail: topVehicle.totalKm > 0 ? `${topVehicle.vehicle.plate} - ${topVehicle.vehicle.brand} ${topVehicle.vehicle.model}` : 'Nenhum uso registrado'
    };
}

function getMostExpensiveVehicle() {
    if (vehicles.length === 0) {
        return { amount: 0, detail: 'Nenhum veículo cadastrado' };
    }

    const vehiclesWithExpense = vehicles.map(vehicle => {
        const expense = calculateVehicleExpense(vehicle.id);
        return {
            vehicle: vehicle,
            totalExpense: expense
        };
    });

    // Ordenar por maior gasto
    vehiclesWithExpense.sort((a, b) => b.totalExpense - a.totalExpense);

    const topVehicle = vehiclesWithExpense[0];

    return {
        amount: topVehicle.totalExpense,
        detail: topVehicle.totalExpense > 0 ? `${topVehicle.vehicle.plate} - ${topVehicle.vehicle.brand} ${topVehicle.vehicle.model}` : 'Nenhuma manutenção registrada'
    };
}

function getMostActiveDriver() {
    if (drivers.length === 0) {
        return { km: 0, detail: 'Nenhum motorista cadastrado' };
    }

    const driversWithUsage = drivers.map(driver => {
        const usage = calculateDriverUsage(driver.id);
        return {
            driver: driver,
            totalKm: usage
        };
    });

    // Ordenar por maior KM
    driversWithUsage.sort((a, b) => b.totalKm - a.totalKm);

    const topDriver = driversWithUsage[0];

    return {
        km: topDriver.totalKm,
        detail: topDriver.totalKm > 0 ? topDriver.driver.name : 'Nenhum uso registrado'
    };
}

function getFleetSummary() {
    const total = vehicles.length;

    // Calcular status real verificando viagens ativas
    let available = 0;
    let inUse = 0;
    let maintenance = 0;

    vehicles.forEach(vehicle => {
        const vehicleId = vehicle.id;

        // Verificar se há viagem ativa para este veículo
        const hasActiveTrip = usageRecords.some(usage =>
            (usage.vehicleId === vehicleId || usage.veiculo_id === vehicleId) &&
            (usage.status === 'em-uso' || usage.status === 'em_uso')
        );

        if (hasActiveTrip) {
            inUse++;
        } else if (vehicle.status === 'manutencao') {
            maintenance++;
        } else {
            // Disponível (inclui 'disponivel' e qualquer outro status não em manutenção)
            available++;
        }
    });

    return {
        total: total,
        available: available,
        inUse: inUse,
        maintenance: maintenance
    };
}

// === FUNÇÕES AUXILIARES DE CÁLCULO ===

function calculateVehicleUsage(vehicleId) {
    const vehicleUsages = usageRecords.filter(r => r.vehicleId === vehicleId && r.status === 'finalizado');

    let totalKm = 0;
    vehicleUsages.forEach(usage => {
        if (usage.kmReturn && usage.kmDeparture) {
            totalKm += (usage.kmReturn - usage.kmDeparture);
        }
    });

    return totalKm;
}

function calculateVehicleExpense(vehicleId) {
    const vehicleMaintenances = maintenanceRecords.filter(r => r.vehicleId === vehicleId);

    let totalExpense = 0;
    vehicleMaintenances.forEach(maintenance => {
        totalExpense += maintenance.value || 0;
    });

    return totalExpense;
}

function calculateDriverUsage(driverId) {
    const driverUsages = usageRecords.filter(r => r.driverId === driverId && r.status === 'finalizado');

    let totalKm = 0;
    driverUsages.forEach(usage => {
        if (usage.kmReturn && usage.kmDeparture) {
            totalKm += (usage.kmReturn - usage.kmDeparture);
        }
    });

    return totalKm;
}

// === FUNÇÕES DE MAPA GPS DO DASHBOARD ===

// Inicializar mapa GPS do dashboard
function initDashboardGpsMap() {
    const mapElement = document.getElementById('dashboardGpsMap');
    if (!mapElement) {
        console.warn('Elemento dashboardGpsMap não encontrado');
        return;
    }

    try {
        // Inicializar mapa centrado no Brasil (Brasília)
        dashboardGpsMap = L.map('dashboardGpsMap', {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: false
        }).setView([-15.7942, -47.8822], 4);

        // Adicionar camada de tiles do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(dashboardGpsMap);

        console.log('✅ Mapa GPS do dashboard inicializado');
    } catch (error) {
        console.error('Erro ao inicializar mapa GPS:', error);
    }
}

// Criar ícone customizado para veículo no dashboard
function createDashboardVehicleIcon(color = '#3b82f6') {
    return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
            <div style="position: relative;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M5 11V17C5 17.5523 5.44772 18 6 18H7C7.55228 18 8 17.5523 8 17V16M19 11H21M19 11V17C19 17.5523 18.5523 18 18 18H17C16.4477 18 16 17.5523 16 17V16M8 16H16M8 16C8 17.1046 7.10457 18 6 18C4.89543 18 4 17.1046 4 16C4 14.8954 4.89543 14 6 14C7.10457 14 8 14.8954 8 16ZM16 16C16 17.1046 16.8954 18 18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div style="position: absolute; top: -6px; right: -6px; width: 10px; height: 10px; background: #10b981; border: 2px solid white; border-radius: 50%; animation: pulse 2s infinite;"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

// Atualizar marcadores de veículos no mapa do dashboard
async function updateDashboardMapMarkers() {
    if (!dashboardGpsMap) {
        console.warn('Mapa GPS do dashboard não inicializado');
        return;
    }

    try {
        // Buscar veículos ativos da API (mesma do módulo GPS)
        const data = await apiGetActiveVehicles();
        const vehicles = data.vehicles || [];

        console.log(`📍 ${vehicles.length} veículos ativos no mapa do dashboard`);

        // Limpar marcadores antigos
        Object.values(dashboardVehicleMarkers).forEach(marker => {
            dashboardGpsMap.removeLayer(marker);
        });
        dashboardVehicleMarkers = {};

        // Array para armazenar coordenadas válidas
        const validCoordinates = [];

        // Adicionar marcadores para veículos ativos com dados reais da API
        vehicles.forEach(vehicle => {
            const { vehicleId, plate, model, latitude, longitude, driverName } = vehicle;

            if (!latitude || !longitude) {
                console.warn(`⚠️ Veículo ${plate} sem coordenadas GPS`);
                return;
            }

            const position = [parseFloat(latitude), parseFloat(longitude)];
            validCoordinates.push(position);

            const marker = L.marker(position, {
                icon: createDashboardVehicleIcon('#3b82f6')
            }).addTo(dashboardGpsMap);

            // Popup com informações do veículo
            marker.bindPopup(`
                <div style="font-family: 'Inter', sans-serif;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${model}</h3>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Placa:</strong> ${plate}</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Motorista:</strong> ${driverName || 'N/A'}</p>
                    <p style="margin: 4px 0; font-size: 12px; color: #10b981;"><strong>● Em Rota</strong></p>
                </div>
            `);

            dashboardVehicleMarkers[vehicleId] = marker;
        });

        // Ajustar zoom para mostrar todos os marcadores com zoom dinâmico
        if (validCoordinates.length > 0) {
            const bounds = L.latLngBounds(validCoordinates);

            // Zoom dinâmico baseado na quantidade de veículos
            let maxZoom;
            if (validCoordinates.length === 1) {
                maxZoom = 15;  // 1 veículo: zoom bem próximo
            } else if (validCoordinates.length === 2) {
                maxZoom = 13;  // 2 veículos: zoom próximo
            } else if (validCoordinates.length <= 5) {
                maxZoom = 11;  // 3-5 veículos: zoom médio
            } else {
                maxZoom = 9;   // 6+ veículos: zoom mais afastado
            }

            dashboardGpsMap.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: maxZoom
            });
        } else {
            // Se não há veículos, centralizar no Brasil
            dashboardGpsMap.setView([-15.7942, -47.8822], 4);
        }

    } catch (error) {
        console.error('Erro ao atualizar marcadores do mapa:', error);
    }
}

// === FUNÇÕES DE GRÁFICOS ===

// Variáveis globais para armazenar instâncias dos gráficos
let fleetStatusChart, maintenanceCostsChart, maintenanceTypesChart, cnhTimelineChart;

// Configuração padrão glassmórfica para todos os gráficos
const defaultChartConfig = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            labels: {
                color: 'rgba(255, 255, 255, 0.9)',
                font: {
                    family: "'Inter', sans-serif",
                    size: 12,
                    weight: '500'
                },
                padding: 15,
                usePointStyle: true
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            titleColor: 'white',
            bodyColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            titleFont: {
                size: 13,
                weight: 'bold'
            },
            bodyFont: {
                size: 12
            }
        }
    }
};

// Inicializar todos os gráficos
function initCharts() {
    createFleetStatusChart();
    createMaintenanceCostsChart();
    createMaintenanceTypesChart();
    createCNHTimelineChart();
}

// 1. Gráfico de Pizza - Status da Frota
function createFleetStatusChart() {
    const ctx = document.getElementById('fleetStatusChart');
    if (!ctx) return;

    const fleetSummary = getFleetSummary();

    if (fleetStatusChart) {
        fleetStatusChart.destroy();
    }

    fleetStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Disponíveis', 'Em Uso', 'Manutenção'],
            datasets: [{
                data: [fleetSummary.available, fleetSummary.inUse, fleetSummary.maintenance],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            ...defaultChartConfig,
            cutout: '65%',
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                ...defaultChartConfig.plugins,
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        color: '#ffffff',
                        boxWidth: 15,
                        padding: 12,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12,
                            weight: '500'
                        },
                        usePointStyle: true
                    }
                }
            },
            layout: {
                padding: {
                    bottom: 10
                }
            }
        }
    });
}

// 2. Gráfico de Linha - Custos Mensais de Manutenção
function createMaintenanceCostsChart() {
    const ctx = document.getElementById('maintenanceCostsChart');
    if (!ctx) return;

    // Calcular custos dos últimos 6 meses
    const monthlyData = calculateMonthlyMaintenanceCosts();

    if (maintenanceCostsChart) {
        maintenanceCostsChart.destroy();
    }

    maintenanceCostsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Custo (R$)',
                data: monthlyData.values,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...defaultChartConfig,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// 3. Gráfico de Barras - Manutenções por Tipo
function createMaintenanceTypesChart() {
    const ctx = document.getElementById('maintenanceTypesChart');
    if (!ctx) return;

    const typeData = getMaintenanceByType();

    if (maintenanceTypesChart) {
        maintenanceTypesChart.destroy();
    }

    maintenanceTypesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: typeData.labels,
            datasets: [{
                label: 'Quantidade',
                data: typeData.values,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 2,
                borderRadius: 10,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultChartConfig,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: {
                            weight: '600'
                        }
                    }
                }
            },
            plugins: {
                ...defaultChartConfig.plugins,
                legend: {
                    display: false
                }
            }
        }
    });
}

// 6. Gráfico de Barras Horizontais - Timeline CNH
function createCNHTimelineChart() {
    const ctx = document.getElementById('cnhTimelineChart');
    if (!ctx) return;

    const cnhData = getCNHTimelineData();

    if (cnhTimelineChart) {
        cnhTimelineChart.destroy();
    }

    cnhTimelineChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cnhData.labels,
            datasets: [{
                label: 'Dias até vencimento',
                data: cnhData.values,
                backgroundColor: cnhData.colors,
                borderColor: cnhData.borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultChartConfig,
            indexAxis: 'y',
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return value + ' dias';
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: {
                            weight: '600'
                        }
                    }
                }
            },
            plugins: {
                ...defaultChartConfig.plugins,
                legend: {
                    display: false
                }
            }
        }
    });
}

// === FUNÇÕES AUXILIARES PARA DADOS DOS GRÁFICOS ===

function calculateMonthlyMaintenanceCosts() {
    const months = [];
    const values = [];
    const now = new Date();

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        months.push(monthYear);

        // Calcular custo do mês
        const monthCost = maintenanceRecords
            .filter(r => {
                const rDate = new Date(r.date);
                return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
            })
            .reduce((sum, r) => sum + (r.value || 0), 0);

        values.push(monthCost);
    }

    return { labels: months, values: values };
}

function getMaintenanceByType() {
    const types = {
        'revisão': 0,
        'troca-oleo': 0,
        'pneus': 0,
        'freios': 0,
        'outros': 0
    };

    maintenanceRecords.forEach(record => {
        if (types.hasOwnProperty(record.type)) {
            types[record.type]++;
        }
    });

    const labels = Object.keys(types).map(type => {
        const names = {
            'revisão': 'Revisão',
            'troca-oleo': 'Troca de Óleo',
            'pneus': 'Pneus',
            'freios': 'Freios',
            'outros': 'Outros'
        };
        return names[type] || type;
    });

    return {
        labels: labels,
        values: Object.values(types)
    };
}

function getCNHTimelineData() {
    const driversWithCNH = drivers.map(driver => ({
        name: driver.name,
        days: getDaysUntilExpiry(driver.cnhExpiry)
    }));

    // Ordenar por dias até vencimento (os que vencem primeiro)
    driversWithCNH.sort((a, b) => a.days - b.days);

    // Pegar apenas os 10 primeiros (ou menos se não houver)
    const top = driversWithCNH.slice(0, 10);

    const labels = top.map(d => d.name);
    const values = top.map(d => Math.abs(d.days)); // Valor absoluto para o gráfico
    const colors = top.map(d => {
        if (d.days < 0) return 'rgba(239, 68, 68, 0.8)'; // Vencida - vermelho
        if (d.days < 30) return 'rgba(245, 158, 11, 0.8)'; // < 30 dias - laranja
        if (d.days < 90) return 'rgba(251, 191, 36, 0.8)'; // < 90 dias - amarelo
        return 'rgba(16, 185, 129, 0.8)'; // > 90 dias - verde
    });
    const borderColors = top.map(d => {
        if (d.days < 0) return 'rgba(239, 68, 68, 1)';
        if (d.days < 30) return 'rgba(245, 158, 11, 1)';
        if (d.days < 90) return 'rgba(251, 191, 36, 1)';
        return 'rgba(16, 185, 129, 1)';
    });

    return {
        labels: labels,
        values: values,
        colors: colors,
        borderColors: borderColors
    };
}

// Atualizar todos os gráficos
function updateAllCharts() {
    if (fleetStatusChart) createFleetStatusChart();
    if (maintenanceCostsChart) createMaintenanceCostsChart();
    if (maintenanceTypesChart) createMaintenanceTypesChart();
    if (cnhTimelineChart) createCNHTimelineChart();
}

function populateVehicleSelect() {
    const selects = ['usageVehicle', 'maintenanceVehicle'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Selecione o veículo</option>';
            vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`;
                select.appendChild(option);
            });
        }
    });
}

function populateDriverSelect() {
    const select = document.getElementById('usageDriver');
    if (select) {
        select.innerHTML = '<option value="">Selecione o motorista</option>';
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            select.appendChild(option);
        });
    }
}

function filterUsage() {
    const vehicleFilter = document.getElementById('filterVehicle').value;
    const dateFilter = document.getElementById('filterDate').value;
    
    let filteredRecords = usageRecords;
    
    if (vehicleFilter) {
        filteredRecords = filteredRecords.filter(r => r.vehicleId == vehicleFilter);
    }
    
    if (dateFilter) {
        filteredRecords = filteredRecords.filter(r => 
            r.departure.slice(0, 10) === dateFilter
        );
    }
    
    // Aplicar filtros na tabela (simplificado)
    loadUsageTable();
}

function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusClass(status) {
    switch(status) {
        case 'disponivel': return 'status-active';
        case 'em-uso': return 'status-warning';
        case 'manutencao': return 'status-inactive';
        default: return 'status-inactive';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'disponivel': return 'Disponível';
        case 'em-uso': return 'Em Uso';
        case 'manutencao': return 'Manutenção';
        default: return 'Inativo';
    }
}

function getMaintenanceTypeText(type) {
    switch(type) {
        case 'revisão': return 'Revisão';
        case 'troca-oleo': return 'Troca de Óleo';
        case 'pneus': return 'Troca de Pneus';
        case 'freios': return 'Freios';
        case 'outros': return 'Outros';
        default: return type;
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateTimeString) {
    return new Date(dateTimeString).toLocaleString('pt-BR');
}

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

// Função para mostrar alertas
function showAlert(message, type = 'info', duration = 5000) {
    try {
        // Remover alertas existentes
        const existingAlerts = document.querySelectorAll('.alert-temp');
        existingAlerts.forEach(alert => alert.remove());

        // Criar novo alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temp`;
        alertDiv.innerHTML = `<strong>${message}</strong>`;

        // Adicionar estilos inline para garantir visibilidade
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        // Adicionar cores baseadas no tipo
        const colors = {
            'success': 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            'danger': 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            'warning': 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            'info': 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };

        alertDiv.style.cssText += colors[type] || colors['info'];

        // Tentar inserir no main-content primeiro, senão no body
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(alertDiv, mainContent.firstChild);
        } else {
            // Se não houver main-content, adicionar ao body
            document.body.appendChild(alertDiv);
        }

        // Auto-remover após duração
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);

    } catch (error) {
        console.error('Erro ao mostrar alerta:', message, error);
        // Fallback: usar alert nativo se tudo falhar
        alert(message);
    }
}

// Fechar modais ao clicar fora deles
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ===========================
// SISTEMA DE MANUTENÇÃO
// ===========================

// Calcular próxima manutenção baseado em KM e tempo
function calculateNextMaintenance(vehicle) {
    if (!vehicle.lastMaintenanceKm || !vehicle.lastMaintenanceDate) {
        // Se não há registro de manutenção anterior, usar valores iniciais
        vehicle.lastMaintenanceKm = vehicle.initialKm || 0;
        vehicle.lastMaintenanceDate = vehicle.createdAt ? vehicle.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
    }

    // Calcular próxima manutenção por KM
    vehicle.nextMaintenanceKm = vehicle.lastMaintenanceKm + (vehicle.maintenanceKmInterval || 10000);

    // Calcular próxima manutenção por data
    const lastMaintDate = new Date(vehicle.lastMaintenanceDate);
    const monthsToAdd = vehicle.maintenanceTimeInterval || 6;
    const nextMaintDate = new Date(lastMaintDate);
    nextMaintDate.setMonth(nextMaintDate.getMonth() + monthsToAdd);
    vehicle.nextMaintenanceDate = nextMaintDate.toISOString().split('T')[0];

    return vehicle;
}

// Verificar status de manutenção
function checkMaintenanceStatus(vehicle) {
    if (!vehicle.nextMaintenanceKm || !vehicle.nextMaintenanceDate) {
        calculateNextMaintenance(vehicle);
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
            message: `Manutenção próxima (${Math.min(kmUntilMaintenance, 0)} km ou ${Math.max(daysUntilMaintenance, 0)} dias)`,
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

// Obter veículos que precisam de manutenção
function getMaintenanceDueVehicles() {
    const maintenanceDue = [];

    vehicles.forEach(vehicle => {
        const status = checkMaintenanceStatus(vehicle);
        if (status.status === 'overdue' || status.status === 'approaching') {
            maintenanceDue.push({
                vehicle: vehicle,
                maintenanceStatus: status
            });
        }
    });

    // Ordenar por prioridade
    maintenanceDue.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.maintenanceStatus.priority] - priorityOrder[b.maintenanceStatus.priority];
    });

    return maintenanceDue;
}

// Atualizar registro de manutenção
function updateMaintenanceRecord(vehicleId, km, date) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return false;

    vehicle.lastMaintenanceKm = km;
    vehicle.lastMaintenanceDate = date;

    // Recalcular próxima manutenção
    calculateNextMaintenance(vehicle);

    // Salvar dados
    saveDataToStorage();

    return true;
}

// FUNÇÃO DESATIVADA - A seção #maintenanceAlerts foi removida do HTML
// Alertas de manutenção são exibidos na seção "Alertas" e no Dashboard (KPI de alertas)
// Esta função pode ser reativada no futuro se necessário

/*
function checkAndDisplayMaintenanceAlerts() {
    const maintenanceDue = getMaintenanceDueVehicles();
    const alertContainer = document.getElementById('maintenanceAlerts');

    if (!alertContainer) return;

    if (maintenanceDue.length === 0) {
        alertContainer.style.display = 'none';
        return;
    }

    alertContainer.style.display = 'block';
    alertContainer.innerHTML = '';

    maintenanceDue.forEach(item => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `maintenance-alert ${item.maintenanceStatus.status === 'overdue' ? 'alert-danger' : 'alert-warning'}`;
        alertDiv.innerHTML = `
            <div class="maintenance-alert-content">
                <div class="maintenance-alert-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13M12 17H12.01M5 19H19L21 7L19 3H5L3 7L5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="maintenance-alert-info">
                    <h4>${item.vehicle.plate} - ${item.vehicle.model}</h4>
                    <p>${item.maintenanceStatus.message}</p>
                    <div class="maintenance-details">
                        <span>KM Atual: ${item.vehicle.currentKm.toLocaleString()} km</span>
                        <span>Próxima: ${item.vehicle.nextMaintenanceKm.toLocaleString()} km</span>
                        <span>Data: ${new Date(item.vehicle.nextMaintenanceDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
                <button class="btn-maintenance-action" onclick="openMaintenanceModal(${item.vehicle.id})">
                    Registrar Manutenção
                </button>
            </div>
        `;
        alertContainer.appendChild(alertDiv);
    });
}
*/

// Inicialização do sistema é controlada pela página (ex.: dashboard.html)
