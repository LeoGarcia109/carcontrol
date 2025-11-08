-- ================================================================
-- Script: Recalcular estatísticas de rotas históricas
-- Descrição: Calcula distância total, velocidades e duração para rotas existentes
-- Data: 2025-01-07
-- ================================================================

-- Criar função Haversine (se não existir)
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS calcular_distancia_haversine(
    lat1 DECIMAL(10,8),
    lon1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(10,3)
DETERMINISTIC
BEGIN
    DECLARE raio_terra DECIMAL(10,3) DEFAULT 6371.0;
    DECLARE dlat DECIMAL(12,10);
    DECLARE dlon DECIMAL(12,10);
    DECLARE a DECIMAL(15,12);
    DECLARE c DECIMAL(15,12);
    DECLARE distancia DECIMAL(10,3);

    SET dlat = RADIANS(lat2 - lat1);
    SET dlon = RADIANS(lon2 - lon1);

    SET a = POW(SIN(dlat/2), 2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * POW(SIN(dlon/2), 2);
    SET c = 2 * ATAN2(SQRT(a), SQRT(1-a));
    SET distancia = raio_terra * c;

    RETURN distancia;
END$$

DELIMITER ;

-- Procedure para recalcular estatísticas de uma rota específica
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS recalcular_estatisticas_rota(IN p_uso_veiculo_id INT)
BEGIN
    DECLARE total_distancia DECIMAL(10,3) DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    DECLARE lat_anterior DECIMAL(10,8);
    DECLARE lon_anterior DECIMAL(11,8);
    DECLARE lat_atual DECIMAL(10,8);
    DECLARE lon_atual DECIMAL(11,8);

    DECLARE cursor_pontos CURSOR FOR
        SELECT latitude, longitude
        FROM gps_tracking
        WHERE uso_veiculo_id = p_uso_veiculo_id
        ORDER BY timestamp ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Calcular distância total
    OPEN cursor_pontos;

    FETCH cursor_pontos INTO lat_anterior, lon_anterior;

    read_loop: LOOP
        FETCH cursor_pontos INTO lat_atual, lon_atual;

        IF done THEN
            LEAVE read_loop;
        END IF;

        SET total_distancia = total_distancia +
            calcular_distancia_haversine(lat_anterior, lon_anterior, lat_atual, lon_atual);

        SET lat_anterior = lat_atual;
        SET lon_anterior = lon_atual;
    END LOOP;

    CLOSE cursor_pontos;

    -- Atualizar registro em rotas_historico
    UPDATE rotas_historico rh
    SET
        rh.distancia_total = total_distancia,
        rh.duracao_minutos = (
            SELECT TIMESTAMPDIFF(MINUTE, MIN(timestamp), MAX(timestamp))
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.velocidade_media = (
            SELECT
                CASE
                    WHEN SUM(CASE WHEN velocidade IS NOT NULL THEN 1 ELSE 0 END) > 0
                    THEN AVG(velocidade)
                    ELSE NULL
                END
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.velocidade_maxima = (
            SELECT MAX(velocidade)
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.total_pontos = (
            SELECT COUNT(*)
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        )
    WHERE rh.uso_veiculo_id = p_uso_veiculo_id;

    SELECT
        p_uso_veiculo_id as uso_veiculo_id,
        total_distancia,
        'Estatísticas recalculadas com sucesso' as mensagem;
END$$

DELIMITER ;

-- ================================================================
-- EXECUTAR RECALCULO PARA ROTAS ESPECÍFICAS
-- ================================================================

-- Exibir estatísticas ANTES da correção
SELECT
    'ANTES DA CORREÇÃO' as status,
    rh.id,
    rh.uso_veiculo_id,
    rh.total_pontos,
    rh.distancia_total,
    rh.duracao_minutos,
    rh.velocidade_media,
    rh.velocidade_maxima,
    uv.status as status_viagem,
    v.placa,
    m.nome as motorista
FROM rotas_historico rh
LEFT JOIN uso_veiculos uv ON rh.uso_veiculo_id = uv.id
LEFT JOIN veiculos v ON uv.veiculo_id = v.id
LEFT JOIN motoristas m ON uv.motorista_id = m.id
WHERE rh.uso_veiculo_id IN (15, 16, 17)
ORDER BY rh.uso_veiculo_id;

-- Recalcular viagem #15 (Leonardo)
CALL recalcular_estatisticas_rota(15);

-- Recalcular viagem #16 (Luciana)
CALL recalcular_estatisticas_rota(16);

-- Recalcular viagem #17 (última viagem)
CALL recalcular_estatisticas_rota(17);

-- Exibir estatísticas DEPOIS da correção
SELECT
    'DEPOIS DA CORREÇÃO' as status,
    rh.id,
    rh.uso_veiculo_id,
    rh.total_pontos,
    rh.distancia_total,
    rh.duracao_minutos,
    rh.velocidade_media,
    rh.velocidade_maxima,
    uv.status as status_viagem,
    v.placa,
    m.nome as motorista
FROM rotas_historico rh
LEFT JOIN uso_veiculos uv ON rh.uso_veiculo_id = uv.id
LEFT JOIN veiculos v ON uv.veiculo_id = v.id
LEFT JOIN motoristas m ON uv.motorista_id = m.id
WHERE rh.uso_veiculo_id IN (15, 16, 17)
ORDER BY rh.uso_veiculo_id;

-- Recalcular TODAS as rotas que têm distância NULL
SELECT
    'Recalculando TODAS as rotas com distância NULL' as status,
    COUNT(*) as total_rotas_afetadas
FROM rotas_historico
WHERE distancia_total IS NULL;

-- Loop para recalcular todas
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS recalcular_todas_rotas()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_uso_id INT;

    DECLARE cursor_rotas CURSOR FOR
        SELECT uso_veiculo_id
        FROM rotas_historico
        WHERE distancia_total IS NULL
        OR duracao_minutos IS NULL
        OR duracao_minutos = 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cursor_rotas;

    recalc_loop: LOOP
        FETCH cursor_rotas INTO current_uso_id;

        IF done THEN
            LEAVE recalc_loop;
        END IF;

        CALL recalcular_estatisticas_rota(current_uso_id);
    END LOOP;

    CLOSE cursor_rotas;

    SELECT 'Todas as rotas foram recalculadas!' as mensagem;
END$$

DELIMITER ;

-- Executar recalculo de todas
CALL recalcular_todas_rotas();
