-- ================================================================
-- BANCO DE DADOS - SISTEMA DE CONTROLE DE VEÍCULOS
-- Criado em: 01/11/2025
-- Versão: 1.0
-- ================================================================

-- Criar banco de dados (opcional - para demonstração)
-- CREATE DATABASE controle_veiculos;
-- USE controle_veiculos;

-- ================================================================
-- TABELA: usuarios
-- Descrição: Armazena informações dos usuários do sistema
-- ================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ================================================================
-- TABELA: veiculos
-- Descrição: Cadastro de veículos da empresa
-- ================================================================
CREATE TABLE IF NOT EXISTS veiculos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    placa VARCHAR(10) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    cor VARCHAR(30),
    combustivel ENUM('gasolina', 'etanol', 'diesel', 'eletrico', 'hibrido') DEFAULT 'gasolina',
    chassi VARCHAR(17),
    renavam VARCHAR(11),
    km_atual INT DEFAULT 0,
    km_ultima_revisao INT DEFAULT 0,
    status ENUM('disponivel', 'em_uso', 'manutencao', 'inativo') DEFAULT 'disponivel',
    data_ultima_manutencao DATE,
    data_proxima_revisao DATE,
    valor_fipe DECIMAL(10,2),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_placa (placa),
    INDEX idx_status (status),
    INDEX idx_km_atual (km_atual)
);

-- ================================================================
-- TABELA: motoristas
-- Descrição: Cadastro de motoristas/condutores
-- ================================================================
CREATE TABLE IF NOT EXISTS motoristas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnh VARCHAR(15) UNIQUE NOT NULL,
    categoria_cnh VARCHAR(5),
    validade_cnh DATE NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    celular VARCHAR(15),
    email VARCHAR(100),
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(15),
    endereco TEXT,
    data_nascimento DATE,
    estado_civil VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cnh (cnh),
    INDEX idx_validade_cnh (validade_cnh),
    INDEX idx_nome (nome)
);

-- ================================================================
-- TABELA: uso_veiculos
-- Descrição: Controle de uso dos veículos
-- ================================================================
CREATE TABLE IF NOT EXISTS uso_veiculos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    veiculo_id INT NOT NULL,
    motorista_id INT NOT NULL,
    usuario_id INT NOT NULL,
    data_hora_saida DATETIME NOT NULL,
    km_saida INT NOT NULL,
    data_hora_retorno DATETIME,
    km_retorno INT,
    destino VARCHAR(200),
    rota TEXT,
    finalidade VARCHAR(100),
    observacoes TEXT,
    status ENUM('em_uso', 'finalizado', 'cancelado') DEFAULT 'em_uso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    INDEX idx_veiculo (veiculo_id),
    INDEX idx_motorista (motorista_id),
    INDEX idx_data_saida (data_hora_saida),
    INDEX idx_status (status)
);

-- ================================================================
-- TABELA: manutencao
-- Descrição: Controle de manutenção e revisões
-- ================================================================
CREATE TABLE IF NOT EXISTS manutencao (
    id INT PRIMARY KEY AUTO_INCREMENT,
    veiculo_id INT NOT NULL,
    tipo ENUM('revisao', 'troca_oleo', 'pneus', 'freios', 'suspensao', 'motor', 'lataria', 'eletrica', 'outros') NOT NULL,
    descricao TEXT NOT NULL,
    data_servico DATE NOT NULL,
    km_servico INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    fornecedor VARCHAR(100),
    nota_fiscal VARCHAR(50),
    proximo_servico_km INT,
    proximo_servico_data DATE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT,
    
    INDEX idx_veiculo (veiculo_id),
    INDEX idx_data_servico (data_servico),
    INDEX idx_tipo (tipo)
);

-- ================================================================
-- TABELA: despesas
-- Descrição: Controle de despesas dos veículos
-- ================================================================
CREATE TABLE IF NOT EXISTS despesas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    veiculo_id INT NOT NULL,
    tipo ENUM('combustivel', 'pedagio', 'estacionamento', 'multa', 'seguro', 'ipva', 'licenciamento', 'lavagem', 'outros') NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_despesa DATE NOT NULL,
    km_veiculo INT,
    local_despesa VARCHAR(100),
    fornecedor VARCHAR(100),
    nota_fiscal VARCHAR(50),
    uso_veiculo_id INT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT,
    FOREIGN KEY (uso_veiculo_id) REFERENCES uso_veiculos(id) ON DELETE SET NULL,
    
    INDEX idx_veiculo (veiculo_id),
    INDEX idx_data_despesa (data_despesa),
    INDEX idx_tipo (tipo)
);

-- ================================================================
-- TABELA: documentos
-- ================================================================
CREATE TABLE IF NOT EXISTS documentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    veiculo_id INT NOT NULL,
    tipo ENUM('crlv', 'antt', 'ca', 'seguro', 'revisao', 'outros') NOT NULL,
    numero VARCHAR(50),
    data_vencimento DATE,
    valor DECIMAL(10,2),
    fornecedor VARCHAR(100),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT,
    
    INDEX idx_veiculo (veiculo_id),
    INDEX idx_tipo (tipo),
    INDEX idx_vencimento (data_vencimento)
);

-- ================================================================
-- TABELA: alertas
-- ================================================================
CREATE TABLE IF NOT EXISTS alertas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('cnh_vencida', 'cnh_proxima', 'revisao_pendente', 'documento_vencido', 'uso_prolongado') NOT NULL,
    entity_type ENUM('motorista', 'veiculo') NOT NULL,
    entity_id INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    data_alerta DATE NOT NULL,
    resolvido BOOLEAN DEFAULT FALSE,
    data_resolucao DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tipo (tipo),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_resolvido (resolvido),
    INDEX idx_data_alerta (data_alerta)
);

-- ================================================================
-- TABELA: configuracoes
-- ================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT,
    descricao VARCHAR(200),
    tipo ENUM('string', 'integer', 'decimal', 'boolean', 'json') DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ================================================================
-- DADOS INICIAIS PARA TESTE
-- ================================================================

-- Inserir usuários padrão
INSERT IGNORE INTO usuarios (username, password, name, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'admin'),
('usuario', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Usuário Padrão', 'user');

-- Inserir configurações padrão
INSERT IGNORE INTO configuracoes (chave, valor, descricao, tipo) VALUES 
('km_revisao_padrao', '10000', 'Quilometragem padrão entre revisões', 'integer'),
('dias_alerta_cnh', '30', 'Dias de antecedência para alerta de CNH', 'integer'),
('horas_uso_maximo', '12', 'Horas máximas para uso contínuo', 'integer'),
('valor_litro_combustivel', '5.50', 'Valor padrão do litro de combustível', 'decimal');

-- Inserir veículos de exemplo
INSERT IGNORE INTO veiculos (placa, marca, modelo, ano, cor, combustivel, km_atual, status) VALUES 
('ABC-1234', 'Fiat', 'Uno', 2020, 'Branco', 'gasolina', 45000, 'disponivel'),
('DEF-5678', 'Chevrolet', 'Onix', 2021, 'Prata', 'flex', 32000, 'disponivel'),
('GHI-9012', 'Volkswagen', 'Gol', 2019, 'Azul', 'gasolina', 62000, 'manutencao');

-- Inserir motoristas de exemplo
INSERT IGNORE INTO motoristas (nome, cnh, categoria_cnh, validade_cnh, telefone) VALUES 
('João Silva Santos', '12345678901', 'B', '2025-12-15', '(11) 99999-1111'),
('Maria Oliveira', '98765432109', 'B', '2025-11-20', '(11) 98888-2222'),
('Pedro Costa', '45678912345', 'AB', '2026-03-10', '(11) 97777-3333');

-- ================================================================
-- STORED PROCEDURES E FUNCTIONS
-- ================================================================

DELIMITER //

-- Função para verificar se CNH está próxima ao vencimento
CREATE FUNCTION fn_dias_para_vencimento_cnh(data_vencimento DATE) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE dias INT;
    DECLARE hoje DATE DEFAULT CURDATE();
    SET dias = DATEDIFF(data_vencimento, hoje);
    RETURN dias;
END//

-- Procedimento para gerar alertas automáticos
CREATE PROCEDURE sp_gerar_alertas()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_dias_cnh INT;
    DECLARE v_veiculo_id INT;
    DECLARE v_placa VARCHAR(10);
    DECLARE v_ultima_revisao_km INT;
    DECLARE v_km_atual INT;
    DECLARE v_proxima_revisao_km INT;
    
    -- Cursor para motoristas com CNH próxima ao vencimento
    DECLARE cursor_motoristas CURSOR FOR
        SELECT id, nome, cnh, validade_cnh
        FROM motoristas 
        WHERE ativo = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Limpar alertas resolvidos antigos (opcional)
    DELETE FROM alertas WHERE resolvido = TRUE AND data_alerta < DATE_SUB(CURDATE(), INTERVAL 6 MONTH);
    
    -- Gerar alertas para CNHs próximas ao vencimento
    OPEN cursor_motoristas;
    read_loop: LOOP
        FETCH cursor_motoristas INTO v_veiculo_id, v_placa, v_dias_cnh;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET v_dias_cnh = fn_dias_para_vencimento_cnh(validade_cnh);
        
        -- Se CNH vencida (dias <= 0)
        IF v_dias_cnh <= 0 THEN
            INSERT IGNORE INTO alertas (tipo, entity_type, entity_id, titulo, mensagem, data_alerta)
            VALUES ('cnh_vencida', 'motorista', v_veiculo_id, 'CNH Vencida', 
                   CONCAT('CNH ', cnh, ' de ', nome, ' está vencida.'), CURDATE());
        -- Se CNH próxima ao vencimento (dias <= configuracao)
        ELSEIF v_dias_cnh <= (SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave = 'dias_alerta_cnh') THEN
            INSERT IGNORE INTO alertas (tipo, entity_type, entity_id, titulo, mensagem, data_alerta)
            VALUES ('cnh_proxima', 'motorista', v_veiculo_id, 'CNH Próximo ao Vencimento', 
                   CONCAT('CNH ', cnh, ' de ', nome, ' vence em ', v_dias_cnh, ' dias.'), CURDATE());
        END IF;
    END LOOP;
    CLOSE cursor_motoristas;
    
    -- Gerar alertas para revisões pendentes
    INSERT INTO alertas (tipo, entity_type, entity_id, titulo, mensagem, data_alerta)
    SELECT 'revisao_pendente', 'veiculo', v.id, 'Revisão Pendente',
           CONCAT('Veículo ', placa, ' precisa de revisão. Última revisão: ', km_ultima_revisao, ' km'),
           CURDATE()
    FROM veiculos v
    WHERE v.ativo = TRUE 
    AND (v.km_atual - v.km_ultima_revisao) > (SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave = 'km_revisao_padrao')
    AND NOT EXISTS (
        SELECT 1 FROM alertas a 
        WHERE a.entity_type = 'veiculo' AND a.entity_id = v.id 
        AND a.tipo = 'revisao_pendente' AND a.resolvido = FALSE
    );
END//

-- Procedimento para atualizar quilometragem do veículo
CREATE PROCEDURE sp_atualizar_km_veiculo(
    IN p_veiculo_id INT,
    IN p_nova_km INT
)
BEGIN
    DECLARE km_anterior INT;
    
    SELECT km_atual INTO km_anterior FROM veiculos WHERE id = p_veiculo_id;
    
    IF p_nova_km > km_anterior THEN
        UPDATE veiculos 
        SET km_atual = p_nova_km 
        WHERE id = p_veiculo_id;
        
        -- Log da atualização (poderia criar tabela de logs)
        INSERT INTO uso_veiculos (veiculo_id, motorista_id, usuario_id, data_hora_saida, km_saida, finalidade, observacoes)
        VALUES (p_veiculo_id, 1, 1, NOW(), p_nova_km, 'Atualização KM', 'Atualização automática de quilometragem');
    END IF;
END//

DELIMITER ;

-- ================================================================
-- TRIGGERS
-- ================================================================

DELIMITER //

-- Trigger para atualizar status do veículo após uso
CREATE TRIGGER tr_atualizar_status_veiculo_uso
    AFTER UPDATE ON uso_veiculos
    FOR EACH ROW
BEGIN
    IF NEW.status = 'em_uso' THEN
        UPDATE veiculos SET status = 'em_uso' WHERE id = NEW.veiculo_id;
    ELSEIF NEW.status = 'finalizado' THEN
        UPDATE veiculos SET status = 'disponivel' WHERE id = NEW.veiculo_id;
    END IF;
END//

-- Trigger para calcular próximo serviço de manutenção
CREATE TRIGGER tr_calcular_proxima_revisao
    AFTER INSERT ON manutencao
    FOR EACH ROW
BEGIN
    DECLARE proxima_revisao_km INT;
    DECLARE dias_proxima_revisao INT DEFAULT 180; -- 6 meses
    
    SET proxima_revisao_km = NEW.km_servico + (SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave = 'km_revisao_padrao');
    
    UPDATE veiculos 
    SET km_ultima_revisao = NEW.km_servico,
        data_ultima_manutencao = NEW.data_servico,
        data_proxima_revisao = DATE_ADD(NEW.data_servico, INTERVAL dias_proxima_revisao DAY)
    WHERE id = NEW.veiculo_id;
END//

DELIMITER ;

-- ================================================================
-- VIEWS ÚTEIS
-- ================================================================

-- View para dashboard com informações resumidas
CREATE VIEW vw_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM veiculos WHERE ativo = TRUE) as total_veiculos,
    (SELECT COUNT(*) FROM motoristas WHERE ativo = TRUE) as total_motoristas,
    (SELECT COUNT(*) FROM uso_veiculos WHERE DATE(data_hora_saida) = CURDATE()) as usos_hoje,
    (SELECT COUNT(*) FROM alertas WHERE resolvido = FALSE) as alertas_pendentes,
    (SELECT COUNT(*) FROM veiculos WHERE status = 'disponivel') as veiculos_disponiveis,
    (SELECT COUNT(*) FROM veiculos WHERE status = 'em_uso') as veiculos_em_uso;

-- View para relatórios de uso
CREATE VIEW vw_relatorio_uso AS
SELECT 
    uv.id,
    v.placa,
    v.marca,
    v.modelo,
    m.nome as motorista,
    uv.data_hora_saida,
    uv.data_hora_retorno,
    uv.km_saida,
    uv.km_retorno,
    uv.km_retorno - uv.km_saida as distancia_percorrida,
    uv.destino,
    uv.rota,
    CASE 
        WHEN uv.status = 'em_uso' THEN 'Em Uso'
        WHEN uv.status = 'finalizado' THEN 'Finalizado'
        ELSE 'Cancelado'
    END as status_uso
FROM uso_veiculos uv
JOIN veiculos v ON uv.veiculo_id = v.id
JOIN motoristas m ON uv.motorista_id = m.id
ORDER BY uv.data_hora_saida DESC;

-- View para alertas ativos
CREATE VIEW vw_alertas_ativos AS
SELECT 
    a.id,
    a.tipo,
    a.entity_type,
    CASE 
        WHEN a.entity_type = 'motorista' THEN m.nome
        WHEN a.entity_type = 'veiculo' THEN v.placa
    END as entidade,
    a.titulo,
    a.mensagem,
    a.data_alerta,
    CASE 
        WHEN a.tipo = 'cnh_vencida' THEN 'CNH Vencida'
        WHEN a.tipo = 'cnh_proxima' THEN 'CNH Próximo ao Vencimento'
        WHEN a.tipo = 'revisao_pendente' THEN 'Revisão Pendente'
        WHEN a.tipo = 'documento_vencido' THEN 'Documento Vencido'
        WHEN a.tipo = 'uso_prolongado' THEN 'Uso Prolongado'
    END as tipo_label
FROM alertas a
LEFT JOIN motoristas m ON a.entity_type = 'motorista' AND a.entity_id = m.id
LEFT JOIN veiculos v ON a.entity_type = 'veiculo' AND a.entity_id = v.id
WHERE a.resolvido = FALSE
ORDER BY a.data_alerta DESC;

-- ================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ================================================================
CREATE INDEX idx_uso_veiculo_motorista_data ON uso_veiculos(motorista_id, data_hora_saida);
CREATE INDEX idx_despesas_veiculo_data ON despesas(veiculo_id, data_despesa);
CREATE INDEX idx_alertas_resolvido_data ON alertas(resolvido, data_alerta);

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================

-- Chamada para gerar alertas iniciais
-- CALL sp_gerar_alertas();