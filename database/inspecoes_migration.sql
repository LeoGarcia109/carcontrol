-- ================================================================
-- MIGRAÇÃO: MÓDULO DE INSPEÇÕES VEICULARES
-- Descrição: Sistema completo de inspeção pré-viagem e revisão
-- Data: 2025-11-09
-- Versão: 0.1.2-beta
-- ================================================================

-- ================================================================
-- TABELA: inspecoes_templates
-- Descrição: Templates de checklists reutilizáveis
-- ================================================================
CREATE TABLE IF NOT EXISTS inspecoes_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('pre_viagem', 'revisao') NOT NULL,
    descricao TEXT,
    periodicidade VARCHAR(50) COMMENT 'semanal, mensal, trimestral, 10000km, etc',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- TABELA: inspecoes_itens_template
-- Descrição: Itens do checklist para cada template
-- ================================================================
CREATE TABLE IF NOT EXISTS inspecoes_itens_template (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    categoria VARCHAR(50) NOT NULL COMMENT 'pneus, fluidos, seguranca, motor, etc',
    item VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INT DEFAULT 0,
    obrigatorio BOOLEAN DEFAULT TRUE,
    tipo_resposta ENUM('checkbox', 'ok_nao_ok', 'texto', 'numero') DEFAULT 'ok_nao_ok',
    unidade_medida VARCHAR(20) COMMENT 'PSI, mm, L, etc (para tipo numero)',
    valor_minimo DECIMAL(10,2) COMMENT 'Valor mínimo aceitável (para tipo numero)',
    valor_maximo DECIMAL(10,2) COMMENT 'Valor máximo aceitável (para tipo numero)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (template_id) REFERENCES inspecoes_templates(id) ON DELETE CASCADE,

    INDEX idx_template (template_id),
    INDEX idx_categoria (categoria),
    INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- TABELA: inspecoes
-- Descrição: Registros de inspeções realizadas
-- ================================================================
CREATE TABLE IF NOT EXISTS inspecoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    veiculo_id INT NOT NULL,
    motorista_id INT NOT NULL,
    uso_veiculo_id INT COMMENT 'NULL se inspeção não relacionada a viagem específica',
    template_id INT NOT NULL,
    tipo ENUM('pre_viagem', 'revisao') NOT NULL,
    data_inspecao DATETIME NOT NULL,
    km_veiculo INT NOT NULL,
    status ENUM('aprovado', 'aprovado_com_restricao', 'reprovado') NOT NULL,
    observacoes_gerais TEXT,
    responsavel_nome VARCHAR(100) COMMENT 'Nome do mecânico/inspetor (se revisão)',
    responsavel_crea VARCHAR(20) COMMENT 'CREA do responsável técnico (se revisão)',
    proxima_inspecao_data DATE COMMENT 'Data prevista para próxima inspeção',
    proxima_inspecao_km INT COMMENT 'KM previsto para próxima inspeção',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT,
    FOREIGN KEY (uso_veiculo_id) REFERENCES uso_veiculos(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES inspecoes_templates(id) ON DELETE RESTRICT,

    INDEX idx_veiculo (veiculo_id),
    INDEX idx_motorista (motorista_id),
    INDEX idx_uso_veiculo (uso_veiculo_id),
    INDEX idx_data (data_inspecao),
    INDEX idx_status (status),
    INDEX idx_tipo (tipo),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- TABELA: inspecoes_itens
-- Descrição: Respostas dos itens do checklist
-- ================================================================
CREATE TABLE IF NOT EXISTS inspecoes_itens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    inspecao_id INT NOT NULL,
    item_template_id INT NOT NULL,
    status ENUM('conforme', 'nao_conforme', 'nao_aplicavel') NOT NULL,
    valor_texto TEXT COMMENT 'Para respostas texto ou observações',
    valor_numero DECIMAL(10,2) COMMENT 'Para medições (ex: pressão pneu)',
    observacao TEXT,
    requer_manutencao BOOLEAN DEFAULT FALSE,
    foto_url VARCHAR(255) COMMENT 'URL da foto do item (se necessário)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (inspecao_id) REFERENCES inspecoes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_template_id) REFERENCES inspecoes_itens_template(id) ON DELETE RESTRICT,

    INDEX idx_inspecao (inspecao_id),
    INDEX idx_item_template (item_template_id),
    INDEX idx_status (status),
    INDEX idx_requer_manutencao (requer_manutencao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- VIEW: Última inspeção por veículo
-- Descrição: Retorna a última inspeção de cada veículo
-- ================================================================
CREATE OR REPLACE VIEW vw_ultima_inspecao_veiculo AS
SELECT
    i.veiculo_id,
    i.id as inspecao_id,
    i.tipo,
    i.data_inspecao,
    i.km_veiculo,
    i.status,
    i.proxima_inspecao_data,
    i.proxima_inspecao_km,
    v.placa,
    v.marca,
    v.modelo,
    v.km_atual,
    m.nome as motorista_nome,
    t.nome as template_nome,
    DATEDIFF(CURRENT_DATE, i.data_inspecao) as dias_desde_inspecao,
    (v.km_atual - i.km_veiculo) as km_desde_inspecao
FROM inspecoes i
INNER JOIN veiculos v ON i.veiculo_id = v.id
INNER JOIN motoristas m ON i.motorista_id = m.id
INNER JOIN inspecoes_templates t ON i.template_id = t.id
WHERE i.id = (
    SELECT MAX(i2.id)
    FROM inspecoes i2
    WHERE i2.veiculo_id = i.veiculo_id
    AND i2.tipo = i.tipo
    AND i2.ativo = TRUE
)
AND i.ativo = TRUE;

-- ================================================================
-- VIEW: Inspeções pendentes
-- Descrição: Veículos que precisam de inspeção
-- ================================================================
CREATE OR REPLACE VIEW vw_inspecoes_pendentes AS
SELECT
    v.id as veiculo_id,
    v.placa,
    v.marca,
    v.modelo,
    v.km_atual,
    'pre_viagem' as tipo_inspecao,
    COALESCE(MAX(i.data_inspecao), '2000-01-01') as ultima_inspecao_data,
    DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) as dias_sem_inspecao,
    CASE
        WHEN DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) > 7 THEN 'vencida'
        WHEN DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) > 5 THEN 'proxima_vencer'
        ELSE 'ok'
    END as situacao
FROM veiculos v
LEFT JOIN inspecoes i ON v.id = i.veiculo_id AND i.tipo = 'pre_viagem' AND i.ativo = TRUE
WHERE v.ativo = TRUE
AND v.status != 'inativo'
GROUP BY v.id, v.placa, v.marca, v.modelo, v.km_atual
HAVING situacao != 'ok'

UNION ALL

SELECT
    v.id as veiculo_id,
    v.placa,
    v.marca,
    v.modelo,
    v.km_atual,
    'revisao' as tipo_inspecao,
    COALESCE(MAX(i.data_inspecao), '2000-01-01') as ultima_inspecao_data,
    DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) as dias_sem_inspecao,
    CASE
        WHEN (v.km_atual - COALESCE(v.km_ultima_revisao, 0)) > 10000 THEN 'vencida'
        WHEN (v.km_atual - COALESCE(v.km_ultima_revisao, 0)) > 9000 THEN 'proxima_vencer'
        WHEN DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) > 365 THEN 'vencida'
        WHEN DATEDIFF(CURRENT_DATE, COALESCE(MAX(i.data_inspecao), '2000-01-01')) > 335 THEN 'proxima_vencer'
        ELSE 'ok'
    END as situacao
FROM veiculos v
LEFT JOIN inspecoes i ON v.id = i.veiculo_id AND i.tipo = 'revisao' AND i.ativo = TRUE
WHERE v.ativo = TRUE
AND v.status != 'inativo'
GROUP BY v.id, v.placa, v.marca, v.modelo, v.km_atual, v.km_ultima_revisao
HAVING situacao != 'ok';

-- ================================================================
-- TRIGGER: Atualizar KM última revisão após inspeção
-- ================================================================
DELIMITER $$

CREATE TRIGGER tr_atualizar_km_revisao_apos_inspecao
AFTER INSERT ON inspecoes
FOR EACH ROW
BEGIN
    -- Se for inspeção de revisão aprovada, atualizar km_ultima_revisao do veículo
    IF NEW.tipo = 'revisao' AND NEW.status = 'aprovado' THEN
        UPDATE veiculos
        SET km_ultima_revisao = NEW.km_veiculo,
            data_ultima_manutencao = NEW.data_inspecao
        WHERE id = NEW.veiculo_id;
    END IF;

    -- Se reprovada, colocar veículo em manutenção
    IF NEW.status = 'reprovado' THEN
        UPDATE veiculos
        SET status = 'manutencao'
        WHERE id = NEW.veiculo_id;
    END IF;
END$$

DELIMITER ;

-- ================================================================
-- TRIGGER: Criar alertas para itens que requerem manutenção
-- ================================================================
DELIMITER $$

CREATE TRIGGER tr_criar_alerta_manutencao
AFTER INSERT ON inspecoes_itens
FOR EACH ROW
BEGIN
    DECLARE v_veiculo_id INT;
    DECLARE v_item_nome VARCHAR(100);

    -- Se o item requer manutenção, pegar dados e criar registro na tabela de alertas
    IF NEW.requer_manutencao = TRUE AND NEW.status = 'nao_conforme' THEN
        -- Buscar veiculo_id da inspeção
        SELECT veiculo_id INTO v_veiculo_id
        FROM inspecoes
        WHERE id = NEW.inspecao_id;

        -- Buscar nome do item
        SELECT item INTO v_item_nome
        FROM inspecoes_itens_template
        WHERE id = NEW.item_template_id;

        -- Inserir alerta (assumindo que existe tabela alertas)
        -- Se não existir, pode ser implementada posteriormente
        -- INSERT INTO alertas (tipo, veiculo_id, descricao, prioridade, created_at)
        -- VALUES ('manutencao', v_veiculo_id,
        --         CONCAT('Item de inspeção requer atenção: ', v_item_nome),
        --         'alta', NOW());
    END IF;
END$$

DELIMITER ;

-- ================================================================
-- STORED PROCEDURE: Estatísticas de inspeções
-- ================================================================
DELIMITER $$

CREATE PROCEDURE sp_estatisticas_inspecoes(
    IN p_data_inicio DATE,
    IN p_data_fim DATE
)
BEGIN
    SELECT
        COUNT(*) as total_inspecoes,
        SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as aprovadas,
        SUM(CASE WHEN status = 'aprovado_com_restricao' THEN 1 ELSE 0 END) as com_restricao,
        SUM(CASE WHEN status = 'reprovado' THEN 1 ELSE 0 END) as reprovadas,
        SUM(CASE WHEN tipo = 'pre_viagem' THEN 1 ELSE 0 END) as pre_viagem,
        SUM(CASE WHEN tipo = 'revisao' THEN 1 ELSE 0 END) as revisao,
        ROUND(AVG(CASE WHEN status = 'aprovado' THEN 100
                       WHEN status = 'aprovado_com_restricao' THEN 50
                       ELSE 0 END), 2) as taxa_aprovacao
    FROM inspecoes
    WHERE data_inspecao BETWEEN p_data_inicio AND p_data_fim
    AND ativo = TRUE;
END$$

DELIMITER ;

-- ================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ================================================================
-- Já criados inline nas definições de tabelas

-- ================================================================
-- COMENTÁRIOS DAS TABELAS (MySQL 8+)
-- ================================================================
ALTER TABLE inspecoes_templates
COMMENT = 'Templates reutilizáveis de checklists de inspeção';

ALTER TABLE inspecoes_itens_template
COMMENT = 'Itens do checklist associados a cada template';

ALTER TABLE inspecoes
COMMENT = 'Registros de inspeções realizadas nos veículos';

ALTER TABLE inspecoes_itens
COMMENT = 'Respostas dos itens de cada inspeção realizada';

-- ================================================================
-- FIM DA MIGRAÇÃO
-- ================================================================
-- Para aplicar esta migração:
-- mysql -u root -p carcontrol_db < database/inspecoes_migration.sql
