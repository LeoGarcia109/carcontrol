-- ================================================================
-- MIGRATION: Criar Tabela Destinos com Coordenadas GPS
-- Data: 08/01/2025
-- Versão: 0.1.1
-- Descrição: Cria tabela de destinos com campos latitude e longitude
--            para permitir exibição no mapa e cálculo de rotas reais
-- ================================================================

-- Criar tabela destinos
CREATE TABLE IF NOT EXISTS destinos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL,
    endereco TEXT,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    distancia_km DECIMAL(8, 2) NULL COMMENT 'Distância estimada em km da base',
    tempo_estimado INT NULL COMMENT 'Tempo estimado em minutos',
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_nome (nome),
    INDEX idx_coords (latitude, longitude),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários sobre precisão:
-- latitude: -90 a +90 graus (8 casas decimais = ~1.1mm de precisão)
-- longitude: -180 a +180 graus (8 casas decimais = ~1.1mm de precisão)
-- NULL permitido para compatibilidade com destinos sem coordenadas

-- ================================================================
-- FIM DA MIGRATION
-- ================================================================
