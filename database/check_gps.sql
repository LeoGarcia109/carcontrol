-- Script de Verificação do Sistema GPS
-- Execute este script para diagnosticar problemas

-- 1. Verificar se as tabelas existem
SELECT 'Verificando tabelas...' as status;
SHOW TABLES LIKE 'gps_tracking';
SHOW TABLES LIKE 'rotas_historico';

-- 2. Verificar se a view existe
SELECT 'Verificando view...' as status;
SHOW CREATE VIEW vw_ultima_localizacao;

-- 3. Verificar dados na tabela gps_tracking
SELECT 'Últimos 10 registros GPS...' as status;
SELECT
    id,
    veiculo_id,
    motorista_id,
    uso_veiculo_id,
    latitude,
    longitude,
    precisao,
    velocidade,
    active,
    timestamp,
    TIMESTAMPDIFF(SECOND, timestamp, NOW()) as segundos_atras
FROM gps_tracking
ORDER BY timestamp DESC
LIMIT 10;

-- 4. Verificar dados na view (veículos ativos)
SELECT 'Veículos ativos na view...' as status;
SELECT
    veiculo_id,
    placa,
    modelo,
    motorista_nome,
    latitude,
    longitude,
    ultima_atualizacao,
    segundos_desde_atualizacao,
    active
FROM vw_ultima_localizacao
WHERE active = 1;

-- 5. Verificar registros de uso em andamento
SELECT 'Uso de veículos em andamento...' as status;
SELECT
    u.id,
    u.veiculo_id,
    u.motorista_id,
    v.placa,
    m.nome as motorista_nome,
    u.status,
    u.data_hora_saida
FROM uso_veiculos u
LEFT JOIN veiculos v ON u.veiculo_id = v.id
LEFT JOIN motoristas m ON u.motorista_id = m.id
WHERE u.status = 'em_uso'
ORDER BY u.data_hora_saida DESC;

-- 6. Contar registros GPS por veículo
SELECT 'Total de pontos GPS por veículo...' as status;
SELECT
    v.placa,
    COUNT(g.id) as total_pontos_gps,
    MAX(g.timestamp) as ultima_atualizacao,
    TIMESTAMPDIFF(SECOND, MAX(g.timestamp), NOW()) as segundos_desde_ultimo
FROM veiculos v
LEFT JOIN gps_tracking g ON v.id = g.veiculo_id AND g.active = 1
GROUP BY v.id, v.placa
HAVING total_pontos_gps > 0
ORDER BY ultima_atualizacao DESC;
