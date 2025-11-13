/**
 * Módulo de Inspeções de Veículos
 * Gerencia inspeções pré-viagem e revisões técnicas
 */

// Arrays globais
let inspecoesArray = [];
let templatesArray = [];
let checklistItens = [];
let currentInspecaoId = null;

// Aliases para compatibilidade com main.js
let vehiclesArray = [];
let driversArray = [];

/**
 * Sincroniza arrays com main.js
 */
function syncArrays() {
    if (typeof vehicles !== 'undefined' && vehicles) {
        vehiclesArray = vehicles;
    }
    if (typeof drivers !== 'undefined' && drivers) {
        driversArray = drivers;
    }
}

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicializa o módulo de inspeções
 */
async function initInspecoes() {
    try {
        // Sincronizar arrays com main.js
        syncArrays();

        // Configurar listener do formulário
        setupInspecaoFormListener();

        await carregarTemplates();
        await carregarInspecoes();
        await carregarInspecoesPendentes();

        // Carregar dados nas tabelas
        loadInspecoesPreViagem();
        loadInspecoesRevisao();
        loadHistoricoInspecoes();

        popularFiltrosInspecao();
        atualizarKPIsInspecoes();
    } catch (error) {
        console.error('Erro ao inicializar inspeções:', error);
    }
}

// ==================== NAVEGAÇÃO DE TABS ====================

/**
 * Alterna entre as abas de inspeção
 */
function showInspecaoTab(tabName) {
    // Remover active de todos os botões e painéis
    document.querySelectorAll('.inspecao-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.inspecao-tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Adicionar active no botão e painel corretos
    event.target.closest('.inspecao-tab-btn').classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Carregar dados da aba
    if (tabName === 'pre-viagem') {
        loadInspecoesPreViagem();
    } else if (tabName === 'revisao') {
        loadInspecoesRevisao();
    } else if (tabName === 'historico') {
        loadHistoricoInspecoes();
    }
}

// ==================== API - CARREGAR DADOS ====================

/**
 * Carrega templates de inspeção do backend
 */
async function carregarTemplates() {
    try {
        const response = await fetch(`${API_URL}/inspections/templates`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            templatesArray = data.data || [];
            console.log(`${templatesArray.length} templates carregados`);
        } else {
            console.error('Erro ao carregar templates:', data.message);
        }
    } catch (error) {
        console.error('Erro ao carregar templates:', error);
    }
}

/**
 * Carrega todas as inspeções do backend
 */
async function carregarInspecoes() {
    try {
        const response = await fetch(`${API_URL}/inspections`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            inspecoesArray = data.data || [];

            // Calcular total_itens para cada inspeção se não estiver presente
            inspecoesArray.forEach(inspecao => {
                if (!inspecao.total_itens && inspecao.items) {
                    inspecao.total_itens = inspecao.items.length;
                }
            });

            console.log(`${inspecoesArray.length} inspeções carregadas`);
        } else {
            console.error('Erro ao carregar inspeções:', data.message);
        }
    } catch (error) {
        console.error('Erro ao carregar inspeções:', error);
    }
}

/**
 * Carrega inspeções pendentes
 */
async function carregarInspecoesPendentes() {
    try {
        const response = await fetch(`${API_URL}/inspections/pending`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            const pendentes = data.data || [];
            document.getElementById('kpiInspecoesPendentes').textContent = pendentes.length;
        }
    } catch (error) {
        console.error('Erro ao carregar pendentes:', error);
    }
}

// ==================== EXIBIÇÃO DE TABELAS ====================

/**
 * Carrega tabela de inspeções pré-viagem
 */
function loadInspecoesPreViagem() {
    const tbody = document.getElementById('preViagemTableBody');
    // Filtrar usando o campo type (inglês) ou tipo (português)
    const inspecoes = inspecoesArray.filter(i => (i.type || i.tipo) === 'pre_viagem');

    if (inspecoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma inspeção pré-viagem realizada</td></tr>';
        return;
    }

    tbody.innerHTML = inspecoes.map(inspecao => {
        // Mapear campos para compatibilidade com API em inglês
        const vehiclePlate = inspecao.vehiclePlate || inspecao.veiculo_placa;
        const driverName = inspecao.driverName || inspecao.motorista_nome;
        const inspectionDate = inspecao.inspectionDate || inspecao.data_inspecao;
        const km = inspecao.km || inspecao.km_veiculo || 0;
        const totalNaoConformes = inspecao.total_nao_conformes || 0;

        const statusClass = getStatusClass(inspecao.status);
        const statusText = getStatusText(inspecao.status);
        const dataFormatada = formatarDataHora(inspectionDate);

        return `
            <tr>
                <td>${dataFormatada}</td>
                <td>${vehiclePlate || '-'}</td>
                <td>${driverName || '-'}</td>
                <td>${km.toLocaleString('pt-BR')}</td>
                <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                <td>${totalNaoConformes}</td>
                <td>
                    <button class="btn-icon" onclick="visualizarInspecao(${inspecao.id})" title="Visualizar">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmarExclusaoInspecao(${inspecao.id})" title="Excluir">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

/**
 * Carrega tabela de revisões técnicas
 */
function loadInspecoesRevisao() {
    const tbody = document.getElementById('revisaoTableBody');
    // Filtrar usando o campo type (inglês) ou tipo (português)
    const inspecoes = inspecoesArray.filter(i => (i.type || i.tipo) === 'revisao');

    if (inspecoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma revisão técnica realizada</td></tr>';
        return;
    }

    tbody.innerHTML = inspecoes.map(inspecao => {
        // Mapear campos para compatibilidade com API em inglês
        const vehiclePlate = inspecao.vehiclePlate || inspecao.veiculo_placa;
        const driverName = inspecao.driverName || inspecao.motorista_nome;
        const inspectionDate = inspecao.inspectionDate || inspecao.data_inspecao;
        const km = inspecao.km || inspecao.km_veiculo || 0;
        const nextInspectionKm = inspecao.nextInspectionKm || inspecao.proxima_inspecao_km;
        const nextInspectionDate = inspecao.nextInspectionDate || inspecao.proxima_inspecao_data;

        const statusClass = getStatusClass(inspecao.status);
        const statusText = getStatusText(inspecao.status);
        const dataFormatada = formatarDataHora(inspectionDate);
        const proximaRevisao = nextInspectionKm
            ? `${nextInspectionKm.toLocaleString('pt-BR')} km`
            : formatarData(nextInspectionDate);

        return `
            <tr>
                <td>${dataFormatada}</td>
                <td>${vehiclePlate || '-'}</td>
                <td>${driverName || '-'}</td>
                <td>${km.toLocaleString('pt-BR')}</td>
                <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                <td>${proximaRevisao || '-'}</td>
                <td>
                    <button class="btn-icon" onclick="visualizarInspecao(${inspecao.id})" title="Visualizar">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmarExclusaoInspecao(${inspecao.id})" title="Excluir">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

/**
 * Carrega tabela de histórico completo
 */
function loadHistoricoInspecoes() {
    const tbody = document.getElementById('historicoInspecoesTableBody');

    if (inspecoesArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma inspeção no histórico</td></tr>';
        return;
    }

    tbody.innerHTML = inspecoesArray.map(inspecao => {
        // Mapear campos para compatibilidade com API em inglês
        const tipo = inspecao.type || inspecao.tipo;
        const vehiclePlate = inspecao.vehiclePlate || inspecao.veiculo_placa;
        const driverName = inspecao.driverName || inspecao.motorista_nome;
        const inspectionDate = inspecao.inspectionDate || inspecao.data_inspecao;
        const totalItens = inspecao.total_itens || inspecao.items?.length || 0;

        const statusClass = getStatusClass(inspecao.status);
        const statusText = getStatusText(inspecao.status);
        const dataFormatada = formatarDataHora(inspectionDate);
        const tipoText = tipo === 'pre_viagem' ? 'Pré-Viagem' : 'Revisão';

        return `
            <tr>
                <td>${dataFormatada}</td>
                <td><span class="badge badge-info">${tipoText}</span></td>
                <td>${vehiclePlate || '-'}</td>
                <td>${driverName || '-'}</td>
                <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                <td>${totalItens}</td>
                <td>
                    <button class="btn-icon" onclick="visualizarInspecao(${inspecao.id})" title="Visualizar">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmarExclusaoInspecao(${inspecao.id})" title="Excluir">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

// ==================== MODAL - NOVA INSPEÇÃO ====================

/**
 * Abre modal para nova inspeção
 */
function novaInspecao(tipo) {
    // Sincronizar arrays antes de abrir modal
    syncArrays();

    resetInspecaoForm();

    document.getElementById('inspecaoModalTitle').textContent =
        tipo === 'pre_viagem' ? 'Nova Inspeção Pré-Viagem' : 'Nova Revisão Técnica';

    // Setar data/hora atual
    const agora = new Date();
    const dataHoraLocal = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('inspecaoData').value = dataHoraLocal;

    // Setar tipo ANTES de popular selects e carregar template
    document.getElementById('inspecaoTipo').value = tipo;

    popularSelectsInspecao();

    // Forçar carregamento do template com o tipo correto
    setTimeout(() => {
        document.getElementById('inspecaoTipo').value = tipo; // Garantir que o tipo está setado
        carregarTemplateInspecao();
    }, 100);

    openModal('inspecaoModal');
}

/**
 * Abre modal de inspeção com veículo pré-selecionado
 * Usado pelos alertas de inspeção vencida
 */
function openInspectionForVehicle(vehicleId) {
    // Abrir modal de inspeção pré-viagem
    novaInspecao('pre_viagem');

    // Após modal abrir, selecionar o veículo
    setTimeout(() => {
        const selectVeiculo = document.getElementById('inspecaoVeiculo');
        if (selectVeiculo) {
            selectVeiculo.value = vehicleId;
            // Disparar evento change para carregar KM
            selectVeiculo.dispatchEvent(new Event('change'));

            // Mostrar mensagem de atenção
            showAlert('Veículo selecionado. Complete a inspeção obrigatória.', 'warning');
        }
    }, 200);
}

/**
 * Reseta o formulário de inspeção
 */
function resetInspecaoForm() {
    document.getElementById('inspecaoForm').reset();
    document.getElementById('inspecaoId').value = '';
    document.getElementById('inspecaoTemplateId').value = '';
    checklistItens = [];
    document.getElementById('checklistContainer').innerHTML = '<div class="loading-checklist"><p>Selecione o tipo de inspeção...</p></div>';
    document.getElementById('statusSummary').style.display = 'none';
}

/**
 * Popula selects de veículo e motorista
 */
function popularSelectsInspecao() {
    // Sincronizar arrays antes de popular
    syncArrays();


    // Popular veículos
    const selectVeiculo = document.getElementById('inspecaoVeiculo');
    selectVeiculo.innerHTML = '<option value="">Selecione o veículo</option>';

    if (vehiclesArray && vehiclesArray.length > 0) {
        vehiclesArray.forEach(veiculo => {
            // Aceitar tanto ativo (boolean) quanto status === 'ativo' (string)
            if (veiculo.ativo || veiculo.status === 'ativo') {
                const placa = veiculo.placa || veiculo.plate;
                const modelo = veiculo.modelo || veiculo.model;
                const km = veiculo.km_atual || veiculo.currentKm || 0;
                selectVeiculo.innerHTML += `<option value="${veiculo.id}" data-km="${km}">${placa} - ${modelo}</option>`;
            }
        });
    } else {
    }

    // Popular motoristas
    const selectMotorista = document.getElementById('inspecaoMotorista');
    selectMotorista.innerHTML = '<option value="">Selecione o responsável</option>';

    if (driversArray && driversArray.length > 0) {
        driversArray.forEach(motorista => {
            // Aceitar tanto ativo (boolean) quanto status === 'ativo' (string)
            if (motorista.ativo || motorista.status === 'ativo') {
                const nome = motorista.nome || motorista.name;
                selectMotorista.innerHTML += `<option value="${motorista.id}">${nome}</option>`;
            }
        });
    } else {
    }
}

/**
 * Carrega template da inspeção selecionada
 */
async function carregarTemplateInspecao() {
    const tipo = document.getElementById('inspecaoTipo').value;

    if (!tipo) {
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Selecione o tipo de inspeção...</p></div>';
        return;
    }


    // Buscar template correto (aceita tanto 'tipo' quanto 'type')
    const template = templatesArray.find(t => (t.tipo || t.type) === tipo);

    if (!template) {
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Template não encontrado!</p></div>';
        return;
    }

    document.getElementById('inspecaoTemplateId').value = template.id;

    try {
        // Buscar itens do template
        const response = await fetch(`${API_URL}/inspections/templates/${template.id}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success && (data.data.itens || data.data.items)) {
            checklistItens = data.data.itens || data.data.items;
            renderizarChecklist();
        } else {
            document.getElementById('checklistContainer').innerHTML =
                '<div class="loading-checklist"><p>Erro ao carregar checklist</p></div>';
        }
    } catch (error) {
        document.getElementById('checklistContainer').innerHTML =
            '<div class="loading-checklist"><p>Erro ao carregar checklist</p></div>';
    }
}

/**
 * Renderiza o checklist de inspeção
 */
function renderizarChecklist() {
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


    let html = '<div class="checklist-categorias">';

    Object.keys(categorias).forEach(categoria => {
        html += `
            <div class="checklist-categoria">
                <h4 class="categoria-titulo">
                    <i data-lucide="folder"></i>
                    ${formatarCategoria(categoria)}
                </h4>
                <div class="checklist-itens">
        `;

        categorias[categoria].forEach(item => {
            // Pegar nome do item e descrição separadamente
            const nomeItem = item.item || item.nome || '';
            const descricaoItem = item.description || item.descricao || '';
            const obrigatorio = item.obrigatorio || item.required;

            // Formatar texto do item
            let textoCompleto = '';
            if (nomeItem && descricaoItem && nomeItem !== descricaoItem) {
                // Se temos ambos e são diferentes, mostrar formatado
                textoCompleto = `<strong>${nomeItem}</strong> <span style="color: #666; font-size: 0.9em;">- ${descricaoItem}</span>`;
            } else if (nomeItem || descricaoItem) {
                // Se temos apenas um ou são iguais, mostrar apenas um
                textoCompleto = nomeItem || descricaoItem;
            } else {
                textoCompleto = 'Item sem descrição';
            }

            html += `
                <div class="checklist-item" data-item-id="${item.id}">
                    <div class="item-header">
                        <label class="item-descricao">${textoCompleto}</label>
                        ${obrigatorio ? '<span class="badge badge-danger">Obrigatório</span>' : ''}
                    </div>
                    <div class="item-controles">
                        <select class="item-status" onchange="atualizarStatusItem(${item.id})">
                            <option value="conforme">Conforme</option>
                            <option value="nao_conforme">Não Conforme</option>
                            <option value="alerta">Alerta</option>
                        </select>
                        <input type="text" class="item-observacao" placeholder="Observações (opcional)">
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

    document.getElementById('statusSummary').style.display = 'block';
    calcularResumoStatus();
    lucide.createIcons();
}

/**
 * Atualiza status de um item específico
 */
function atualizarStatusItem(itemId) {
    calcularResumoStatus();
}

/**
 * Calcula resumo do status da inspeção
 */
function calcularResumoStatus() {
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

    document.getElementById('itensConformes').textContent = conformes;
    document.getElementById('itensNaoConformes').textContent = naoConformes;
    document.getElementById('itensAlerta').textContent = alertas;

    // Calcular status final
    const total = itens.length;
    const percNaoConforme = (naoConformes / total) * 100;

    let statusFinal = 'Aprovado';
    let badgeClass = 'success';

    if (naoConformes > 0 && percNaoConforme >= 20) {
        statusFinal = 'Reprovado';
        badgeClass = 'danger';
    } else if (naoConformes > 0 || alertas > 0) {
        statusFinal = 'Aprovado com Restrição';
        badgeClass = 'warning';
    }

    document.getElementById('statusFinal').innerHTML = `<span class="badge badge-${badgeClass}">${statusFinal}</span>`;
}

/**
 * Carrega KM atual do veículo selecionado
 */
function carregarKmAtual() {
    const selectVeiculo = document.getElementById('inspecaoVeiculo');
    const option = selectVeiculo.options[selectVeiculo.selectedIndex];

    if (option && option.dataset.km) {
        document.getElementById('inspecaoKm').value = option.dataset.km;
    }
}

// ==================== SALVAR INSPEÇÃO ====================

// Flag para prevenir múltiplos listeners
let inspecaoFormListenerAdded = false;

/**
 * Configura listener do formulário de inspeção
 */
function setupInspecaoFormListener() {
    const form = document.getElementById('inspecaoForm');
    if (!form || inspecaoFormListenerAdded) return;

    inspecaoFormListenerAdded = true;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

    try {
        // Coletar dados do formulário
        const tipo = document.getElementById('inspecaoTipo').value;
        const veiculoId = document.getElementById('inspecaoVeiculo').value;
        const motoristaId = document.getElementById('inspecaoMotorista').value;
        const templateId = document.getElementById('inspecaoTemplateId').value;
        const dataInspecao = document.getElementById('inspecaoData').value;
        const kmVeiculo = document.getElementById('inspecaoKm').value;
        const observacoesGerais = document.getElementById('inspecaoObservacoes').value;

        // Coletar itens do checklist
        const itensInspecao = [];
        document.querySelectorAll('.checklist-item').forEach(itemDiv => {
            const itemId = itemDiv.dataset.itemId;
            const status = itemDiv.querySelector('.item-status').value;
            const observacao = itemDiv.querySelector('.item-observacao').value;

            itensInspecao.push({
                itemTemplateId: parseInt(itemId),
                status: status,
                observation: observacao || null
            });
        });

        // Montar payload (em inglês para compatibilidade com o backend)
        const payload = {
            vehicleId: parseInt(veiculoId),
            driverId: parseInt(motoristaId),
            templateId: parseInt(templateId),
            type: tipo,
            inspectionDate: dataInspecao,
            km: parseInt(kmVeiculo),
            generalObservations: observacoesGerais || null,
            items: itensInspecao
        };

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
            showAlert('Inspeção salva com sucesso!', 'success');
            closeModal('inspecaoModal');
            await carregarInspecoes();
            atualizarKPIsInspecoes();

            // Recarregar tabela ativa
            const abaAtiva = document.querySelector('.inspecao-tab-panel.active');
            if (abaAtiva.id === 'pre-viagem') loadInspecoesPreViagem();
            else if (abaAtiva.id === 'revisao') loadInspecoesRevisao();
            else if (abaAtiva.id === 'historico') loadHistoricoInspecoes();
        } else {
            showAlert(data.message || 'Erro ao salvar inspeção', 'danger');
        }

    } catch (error) {
        console.error('Erro ao salvar inspeção:', error);
        showAlert('Erro ao salvar inspeção', 'danger');
    }
    });
}

// ==================== VISUALIZAR INSPEÇÃO ====================

/**
 * Visualiza detalhes de uma inspeção
 */
async function visualizarInspecao(id) {
    try {
        const response = await fetch(`${API_URL}/inspections/${id}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            const inspecao = data.data;
            currentInspecaoId = id;
            renderizarDetalhesInspecao(inspecao);
            openModal('visualizarInspecaoModal');
        } else {
            showAlert('Erro ao carregar inspeção', 'danger');
        }
    } catch (error) {
        console.error('Erro ao visualizar inspeção:', error);
        showAlert('Erro ao carregar inspeção', 'danger');
    }
}

/**
 * Renderiza detalhes da inspeção
 */
function renderizarDetalhesInspecao(inspecao) {
    // Mapear campos para compatibilidade com API em inglês
    const tipo = inspecao.type || inspecao.tipo;
    const inspectionDate = inspecao.inspectionDate || inspecao.data_inspecao;
    const vehiclePlate = inspecao.vehiclePlate || inspecao.veiculo_placa;
    const vehicleModel = inspecao.vehicleModel || inspecao.veiculo_modelo;
    const driverName = inspecao.driverName || inspecao.motorista_nome;
    const km = inspecao.km || inspecao.km_veiculo || 0;
    const generalObservations = inspecao.generalObservations || inspecao.observacoes_gerais;

    // Calcular estatísticas dos itens
    let totalConformes = 0;
    let totalNaoConformes = 0;
    let totalAlertas = 0;

    if (inspecao.stats) {
        totalConformes = inspecao.stats.conforme || 0;
        totalNaoConformes = inspecao.stats.naoConforme || 0;
    }

    if (inspecao.items && Array.isArray(inspecao.items)) {
        inspecao.items.forEach(item => {
            if (item.status === 'conforme') totalConformes++;
            else if (item.status === 'nao_conforme') totalNaoConformes++;
            else if (item.status === 'alerta') totalAlertas++;
        });
    }

    const statusClass = getStatusClass(inspecao.status);
    const statusText = getStatusText(inspecao.status);
    const tipoText = tipo === 'pre_viagem' ? 'Pré-Viagem' : 'Revisão Técnica';

    let html = `
        <div class="inspecao-info">
            <div class="info-row">
                <div class="info-item">
                    <strong>Tipo:</strong>
                    <span class="badge badge-info">${tipoText}</span>
                </div>
                <div class="info-item">
                    <strong>Status:</strong>
                    <span class="badge badge-${statusClass}">${statusText}</span>
                </div>
                <div class="info-item">
                    <strong>Data:</strong>
                    ${formatarDataHora(inspectionDate)}
                </div>
            </div>
            <div class="info-row">
                <div class="info-item">
                    <strong>Veículo:</strong>
                    ${vehiclePlate} - ${vehicleModel || ''}
                </div>
                <div class="info-item">
                    <strong>Responsável:</strong>
                    ${driverName}
                </div>
                <div class="info-item">
                    <strong>KM:</strong>
                    ${km.toLocaleString('pt-BR')}
                </div>
            </div>
    `;

    if (generalObservations) {
        html += `
            <div class="info-row">
                <div class="info-item full-width">
                    <strong>Observações Gerais:</strong>
                    <p>${generalObservations}</p>
                </div>
            </div>
        `;
    }

    html += `
            <div class="info-row stats-row">
                <div class="stat-box stat-success">
                    <span class="stat-number">${totalConformes}</span>
                    <span class="stat-label">Conformes</span>
                </div>
                <div class="stat-box stat-warning">
                    <span class="stat-number">${totalAlertas}</span>
                    <span class="stat-label">Alertas</span>
                </div>
                <div class="stat-box stat-danger">
                    <span class="stat-number">${totalNaoConformes}</span>
                    <span class="stat-label">Não Conformes</span>
                </div>
            </div>
        </div>

        <h4>Itens Verificados</h4>
        <div class="itens-verificados">
    `;

    // Usar itemsByCategory se disponível (API retorna agrupado), senão agrupar manualmente
    let categorias = inspecao.itemsByCategory || {};

    // Se não tiver itemsByCategory, tentar agrupar dos items
    if (Object.keys(categorias).length === 0 && inspecao.items) {
        const items = inspecao.items || inspecao.itens || [];
        items.forEach(item => {
            const categoria = item.category || item.categoria;
            if (!categorias[categoria]) {
                categorias[categoria] = [];
            }
            categorias[categoria].push(item);
        });
    }

    Object.keys(categorias).forEach(categoria => {
        html += `
            <div class="categoria-detalhes">
                <h5>${formatarCategoria(categoria)}</h5>
                <table class="table-detalhes">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Status</th>
                            <th>Observação</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        categorias[categoria].forEach(item => {
            const itemStatusClass = item.status === 'conforme' ? 'success' :
                                   item.status === 'alerta' ? 'warning' : 'danger';
            const itemStatusText = item.status === 'conforme' ? '✓ Conforme' :
                                  item.status === 'alerta' ? '⚠ Alerta' : '✗ Não Conforme';

            // Mapear campos do item
            const descricao = item.description || item.descricao || item.item || '-';
            const observacao = item.observation || item.observacao;

            html += `
                <tr>
                    <td>${descricao}</td>
                    <td><span class="badge badge-${itemStatusClass}">${itemStatusText}</span></td>
                    <td>${observacao || '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    html += '</div>';

    document.getElementById('inspecaoDetalhes').innerHTML = html;
}

// ==================== EXCLUIR INSPEÇÃO ====================

/**
 * Confirma exclusão de inspeção
 */
function confirmarExclusaoInspecao(id) {
    if (confirm('Tem certeza que deseja excluir esta inspeção?')) {
        excluirInspecao(id);
    }
}

/**
 * Exclui inspeção atual (do modal de visualização)
 */
function excluirInspecaoAtual() {
    if (currentInspecaoId) {
        confirmarExclusaoInspecao(currentInspecaoId);
        closeModal('visualizarInspecaoModal');
    }
}

/**
 * Exclui uma inspeção
 */
async function excluirInspecao(id) {
    try {
        const response = await fetch(`${API_URL}/inspections/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Inspeção excluída com sucesso!', 'success');
            await carregarInspecoes();
            atualizarKPIsInspecoes();

            // Recarregar tabela ativa
            const abaAtiva = document.querySelector('.inspecao-tab-panel.active');
            if (abaAtiva.id === 'pre-viagem') loadInspecoesPreViagem();
            else if (abaAtiva.id === 'revisao') loadInspecoesRevisao();
            else if (abaAtiva.id === 'historico') loadHistoricoInspecoes();
        } else {
            showAlert(data.message || 'Erro ao excluir inspeção', 'danger');
        }
    } catch (error) {
        console.error('Erro ao excluir inspeção:', error);
        showAlert('Erro ao excluir inspeção', 'danger');
    }
}

// ==================== FILTROS ====================

/**
 * Popula filtros de veículos
 */
function popularFiltrosInspecao() {
    // Sincronizar arrays antes de popular
    syncArrays();

    const selectsVeiculo = [
        document.getElementById('filterPreViagemVeiculo'),
        document.getElementById('filterRevisaoVeiculo'),
        document.getElementById('filterHistoricoVeiculo')
    ];

    selectsVeiculo.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Todos os veículos</option>';
            if (vehiclesArray && vehiclesArray.length > 0) {
                vehiclesArray.forEach(veiculo => {
                    select.innerHTML += `<option value="${veiculo.id}">${veiculo.placa}</option>`;
                });
            }
        }
    });
}

/**
 * Filtra inspeções pré-viagem
 */
function filterInspecoesPreViagem() {
    const veiculoId = document.getElementById('filterPreViagemVeiculo').value;
    const status = document.getElementById('filterPreViagemStatus').value;
    const data = document.getElementById('filterPreViagemData').value;

    let inspecoesFiltradas = inspecoesArray.filter(i => i.tipo === 'pre_viagem');

    if (veiculoId) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.veiculo_id == veiculoId);
    }

    if (status) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.status === status);
    }

    if (data) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.data_inspecao.startsWith(data));
    }

    renderizarTabelaFiltrada('preViagemTableBody', inspecoesFiltradas, 7);
}

/**
 * Filtra inspeções de revisão
 */
function filterInspecoesRevisao() {
    const veiculoId = document.getElementById('filterRevisaoVeiculo').value;
    const status = document.getElementById('filterRevisaoStatus').value;
    const data = document.getElementById('filterRevisaoData').value;

    let inspecoesFiltradas = inspecoesArray.filter(i => i.tipo === 'revisao');

    if (veiculoId) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.veiculo_id == veiculoId);
    }

    if (status) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.status === status);
    }

    if (data) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.data_inspecao.startsWith(data));
    }

    renderizarTabelaFiltrada('revisaoTableBody', inspecoesFiltradas, 7, 'revisao');
}

/**
 * Filtra histórico de inspeções
 */
function filterHistoricoInspecoes() {
    const veiculoId = document.getElementById('filterHistoricoVeiculo').value;
    const tipo = document.getElementById('filterHistoricoTipo').value;
    const dataInicio = document.getElementById('filterHistoricoDataInicio').value;
    const dataFim = document.getElementById('filterHistoricoDataFim').value;

    let inspecoesFiltradas = [...inspecoesArray];

    if (veiculoId) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.veiculo_id == veiculoId);
    }

    if (tipo) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.tipo === tipo);
    }

    if (dataInicio) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.data_inspecao >= dataInicio);
    }

    if (dataFim) {
        inspecoesFiltradas = inspecoesFiltradas.filter(i => i.data_inspecao <= dataFim + ' 23:59:59');
    }

    renderizarTabelaFiltrada('historicoInspecoesTableBody', inspecoesFiltradas, 7, 'historico');
}

/**
 * Renderiza tabela filtrada
 */
function renderizarTabelaFiltrada(tbodyId, inspecoes, colspan, tipo = 'pre_viagem') {
    const tbody = document.getElementById(tbodyId);

    if (inspecoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">Nenhuma inspeção encontrada</td></tr>`;
        return;
    }

    // Reutilizar lógica de renderização
    if (tipo === 'revisao') {
        loadInspecoesRevisao();
    } else if (tipo === 'historico') {
        loadHistoricoInspecoes();
    } else {
        loadInspecoesPreViagem();
    }
}

// ==================== KPIs ====================

/**
 * Atualiza KPIs de inspeções
 */
function atualizarKPIsInspecoes() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const inspecoesMes = inspecoesArray.filter(i => {
        const dataInspecao = new Date(i.data_inspecao);
        return dataInspecao.getMonth() === mesAtual && dataInspecao.getFullYear() === anoAtual;
    });

    const aprovadas = inspecoesMes.filter(i => i.status === 'aprovado').length;
    const restricao = inspecoesMes.filter(i => i.status === 'aprovado_com_restricao').length;
    const reprovadas = inspecoesMes.filter(i => i.status === 'reprovado').length;

    document.getElementById('kpiInspecoesAprovadas').textContent = aprovadas;
    document.getElementById('kpiInspecoesRestricao').textContent = restricao;
    document.getElementById('kpiInspecoesReprovadas').textContent = reprovadas;
}

// ==================== UTILIDADES ====================

/**
 * Retorna classe CSS para badge de status
 */
function getStatusClass(status) {
    switch (status) {
        case 'aprovado': return 'success';
        case 'aprovado_com_restricao': return 'warning';
        case 'reprovado': return 'danger';
        default: return 'secondary';
    }
}

/**
 * Retorna texto formatado do status
 */
function getStatusText(status) {
    switch (status) {
        case 'aprovado': return 'Aprovado';
        case 'aprovado_com_restricao': return 'Aprovado c/ Restrição';
        case 'reprovado': return 'Reprovado';
        default: return status;
    }
}

/**
 * Formata nome da categoria
 */
function formatarCategoria(categoria) {
    const categorias = {
        'pneus': '🛞 Pneus',
        'fluidos': '💧 Fluidos',
        'iluminacao': '💡 Iluminação',
        'limpeza': '🧹 Limpeza',
        'seguranca': '🛡️ Segurança',
        'documentacao': '📄 Documentação',
        'funcionamento': '⚙️ Funcionamento',
        'motor': '🔧 Motor',
        'transmissao': '⚙️ Transmissão',
        'freios': '🛑 Freios',
        'suspensao': '🔩 Suspensão',
        'eletrico': '⚡ Sistema Elétrico',
        'arrefecimento': '❄️ Arrefecimento',
        'direcao': '🎯 Direção',
        'pneus_geometria': '📐 Pneus e Geometria',
        'carroceria': '🚗 Carroceria'
    };
    return categorias[categoria] || categoria;
}

/**
 * Formata data e hora
 */
function formatarDataHora(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formata apenas data
 */
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// ==================== EXPOR FUNÇÕES GLOBALMENTE ====================

// Expor funções para uso nos handlers onclick do HTML
window.novaInspecao = novaInspecao;
window.showInspecaoTab = showInspecaoTab;
window.visualizarInspecao = visualizarInspecao;
window.confirmarExclusaoInspecao = confirmarExclusaoInspecao;
window.excluirInspecaoAtual = excluirInspecaoAtual;
window.carregarTemplateInspecao = carregarTemplateInspecao;
window.carregarKmAtual = carregarKmAtual;
window.atualizarStatusItem = atualizarStatusItem;
window.filterInspecoesPreViagem = filterInspecoesPreViagem;
window.filterInspecoesRevisao = filterInspecoesRevisao;
window.filterHistoricoInspecoes = filterHistoricoInspecoes;

// ==================== INICIALIZAÇÃO AUTOMÁTICA ====================

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInspecoes);
} else {
    // DOM já carregado
    setTimeout(initInspecoes, 500); // Aguardar outros módulos
}
