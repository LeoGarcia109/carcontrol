-- ================================================================
-- Migration: GPS Tracking System
-- Descrição: Cria tabelas para rastreamento GPS em tempo real
-- Data: 2025-01-06
-- ================================================================

-- Tabela principal de rastreamento GPS
CREATE TABLE IF NOT EXISTS gps_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    motorista_id INT NOT NULL,
    uso_veiculo_id INT NULL COMMENT 'Relaciona com viagem ativa',

    -- Dados de localização
    latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude em graus decimais',
    longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude em graus decimais',
    precisao DECIMAL(6, 2) NULL COMMENT 'Precisão do GPS em metros',

    -- Dados de movimento
    velocidade DECIMAL(5, 2) NULL COMMENT 'Velocidade em km/h',
    altitude DECIMAL(7, 2) NULL COMMENT 'Altitude em metros',
    heading DECIMAL(5, 2) NULL COMMENT 'Direção em graus (0-360)',

    -- Controle
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento da captura GPS',
    active TINYINT(1) DEFAULT 1 COMMENT '1 = Rastreamento ativo, 0 = Finalizado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Índices para performance
    INDEX idx_veiculo (veiculo_id),
    INDEX idx_motorista (motorista_id),
    INDEX idx_uso (uso_veiculo_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_active (active),
    INDEX idx_veiculo_active (veiculo_id, active),

    -- Chaves estrangeiras
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE,
    FOREIGN KEY (uso_veiculo_id) REFERENCES uso_veiculos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Rastreamento GPS em tempo real dos veículos';

-- Tabela de histórico de rotas
CREATE TABLE IF NOT EXISTS rotas_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uso_veiculo_id INT NOT NULL COMMENT 'ID da viagem',

    -- Dados da rota
    rota_geojson LONGTEXT COMMENT 'Rota completa em formato GeoJSON',
    total_pontos INT DEFAULT 0 COMMENT 'Quantidade de pontos GPS coletados',

    -- Estatísticas
    distancia_total DECIMAL(8, 2) COMMENT 'Distância percorrida em km',
    duracao_minutos INT COMMENT 'Duração total da viagem em minutos',
    velocidade_media DECIMAL(5, 2) COMMENT 'Velocidade média em km/h',
    velocidade_maxima DECIMAL(5, 2) COMMENT 'Velocidade máxima atingida em km/h',

    -- Pontos de interesse
    latitude_inicio DECIMAL(10, 8) COMMENT 'Latitude do ponto inicial',
    longitude_inicio DECIMAL(11, 8) COMMENT 'Longitude do ponto inicial',
    latitude_fim DECIMAL(10, 8) COMMENT 'Latitude do ponto final',
    longitude_fim DECIMAL(11, 8) COMMENT 'Longitude do ponto final',

    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices
    INDEX idx_uso_veiculo (uso_veiculo_id),
    INDEX idx_created (created_at),

    -- Chave estrangeira
    FOREIGN KEY (uso_veiculo_id) REFERENCES uso_veiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Histórico completo de rotas percorridas';

-- Procedure para limpar dados GPS antigos (manutenção)
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS limpar_gps_antigos(IN dias INT)
BEGIN
    -- Remove registros GPS inativos com mais de X dias
    DELETE FROM gps_tracking
    WHERE active = 0
    AND timestamp < DATE_SUB(NOW(), INTERVAL dias DAY);

    SELECT ROW_COUNT() AS registros_removidos;
END$$

DELIMITER ;

-- View para obter última localização de cada veículo ativo
CREATE OR REPLACE VIEW vw_ultima_localizacao AS
SELECT
    gt.veiculo_id,
    v.placa,
    v.marca,
    v.modelo,
    gt.motorista_id,
    m.nome as motorista_nome,
    gt.uso_veiculo_id,
    gt.latitude,
    gt.longitude,
    gt.precisao,
    gt.velocidade,
    gt.altitude,
    gt.heading,
    gt.timestamp as ultima_atualizacao,
    TIMESTAMPDIFF(SECOND, gt.timestamp, NOW()) as segundos_desde_atualizacao
FROM gps_tracking gt
INNER JOIN (
    SELECT veiculo_id, MAX(timestamp) as max_timestamp
    FROM gps_tracking
    WHERE active = 1
    GROUP BY veiculo_id
) latest ON gt.veiculo_id = latest.veiculo_id
    AND gt.timestamp = latest.max_timestamp
LEFT JOIN veiculos v ON gt.veiculo_id = v.id
LEFT JOIN motoristas m ON gt.motorista_id = m.id
WHERE gt.active = 1;

-- Função para calcular distância usando fórmula Haversine
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS calcular_distancia_haversine(
    lat1 DECIMAL(10,8),
    lon1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(10,3)
DETERMINISTIC
BEGIN
    DECLARE raio_terra DECIMAL(10,3) DEFAULT 6371.0; -- Raio da Terra em km
    DECLARE dlat DECIMAL(12,10);
    DECLARE dlon DECIMAL(12,10);
    DECLARE a DECIMAL(15,12);
    DECLARE c DECIMAL(15,12);
    DECLARE distancia DECIMAL(10,3);

    -- Converter diferenças para radianos
    SET dlat = RADIANS(lat2 - lat1);
    SET dlon = RADIANS(lon2 - lon1);

    -- Fórmula Haversine
    SET a = POW(SIN(dlat/2), 2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * POW(SIN(dlon/2), 2);
    SET c = 2 * ATAN2(SQRT(a), SQRT(1-a));
    SET distancia = raio_terra * c;

    RETURN distancia;
END$$

DELIMITER ;

-- Trigger para criar histórico de rota ao finalizar viagem
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_finalizar_viagem_rota
AFTER UPDATE ON uso_veiculos
FOR EACH ROW
BEGIN
    DECLARE total_distancia DECIMAL(10,3) DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    DECLARE lat_anterior DECIMAL(10,8);
    DECLARE lon_anterior DECIMAL(11,8);
    DECLARE lat_atual DECIMAL(10,8);
    DECLARE lon_atual DECIMAL(11,8);

    -- Cursor para percorrer pontos GPS em ordem cronológica
    DECLARE cursor_pontos CURSOR FOR
        SELECT latitude, longitude
        FROM gps_tracking
        WHERE uso_veiculo_id = NEW.id
        ORDER BY timestamp ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Quando viagem é finalizada (status mudou para 'finalizado')
    -- CORRIGIDO: Usar 'finalizado' em vez de 'concluido'
    IF NEW.status = 'finalizado' AND OLD.status != 'finalizado' THEN

        -- Desativar todos os pontos GPS desta viagem
        UPDATE gps_tracking
        SET active = 0
        WHERE uso_veiculo_id = NEW.id;

        -- Calcular distância total usando Haversine
        OPEN cursor_pontos;

        -- Buscar primeiro ponto
        FETCH cursor_pontos INTO lat_anterior, lon_anterior;

        -- Loop pelos demais pontos
        read_loop: LOOP
            FETCH cursor_pontos INTO lat_atual, lon_atual;

            IF done THEN
                LEAVE read_loop;
            END IF;

            -- Somar distância entre ponto anterior e atual
            SET total_distancia = total_distancia +
                calcular_distancia_haversine(lat_anterior, lon_anterior, lat_atual, lon_atual);

            -- Atualizar ponto anterior
            SET lat_anterior = lat_atual;
            SET lon_anterior = lon_atual;
        END LOOP;

        CLOSE cursor_pontos;

        -- Criar registro de histórico de rota
        INSERT INTO rotas_historico (
            uso_veiculo_id,
            rota_geojson,
            total_pontos,
            distancia_total,
            duracao_minutos,
            velocidade_media,
            velocidade_maxima,
            latitude_inicio,
            longitude_inicio,
            latitude_fim,
            longitude_fim
        )
        SELECT
            NEW.id,
            -- GeoJSON da rota
            CONCAT(
                '{"type":"LineString","coordinates":[',
                GROUP_CONCAT(
                    CONCAT('[', longitude, ',', latitude, ']')
                    ORDER BY timestamp
                    SEPARATOR ','
                ),
                ']}'
            ) as rota_geojson,
            COUNT(*) as total_pontos,
            -- Distância total calculada com Haversine
            total_distancia as distancia_total,
            -- Duração em minutos
            TIMESTAMPDIFF(MINUTE, MIN(timestamp), MAX(timestamp)) as duracao_minutos,
            -- Velocidade média (null se nenhum ponto tiver velocidade)
            CASE
                WHEN SUM(CASE WHEN velocidade IS NOT NULL THEN 1 ELSE 0 END) > 0
                THEN AVG(velocidade)
                ELSE NULL
            END as velocidade_media,
            -- Velocidade máxima
            MAX(velocidade) as velocidade_maxima,
            -- Ponto inicial
            (SELECT latitude FROM gps_tracking
             WHERE uso_veiculo_id = NEW.id
             ORDER BY timestamp ASC LIMIT 1) as latitude_inicio,
            (SELECT longitude FROM gps_tracking
             WHERE uso_veiculo_id = NEW.id
             ORDER BY timestamp ASC LIMIT 1) as longitude_inicio,
            -- Ponto final
            (SELECT latitude FROM gps_tracking
             WHERE uso_veiculo_id = NEW.id
             ORDER BY timestamp DESC LIMIT 1) as latitude_fim,
            (SELECT longitude FROM gps_tracking
             WHERE uso_veiculo_id = NEW.id
             ORDER BY timestamp DESC LIMIT 1) as longitude_fim
        FROM gps_tracking
        WHERE uso_veiculo_id = NEW.id
        HAVING total_pontos > 0;

    END IF;
END$$

DELIMITER ;

-- Inserir dados de teste (opcional - comentado por padrão)
/*
INSERT INTO gps_tracking (veiculo_id, motorista_id, uso_veiculo_id, latitude, longitude, precisao, velocidade, heading)
VALUES
(1, 1, 1, -23.5505, -46.6333, 10, 45.5, 90),
(1, 1, 1, -23.5510, -46.6340, 8, 50.2, 95);
*/

-- Verificar criação das tabelas
SELECT
    'Tabelas criadas com sucesso!' as status,
    COUNT(*) as total_tabelas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('gps_tracking', 'rotas_historico');
