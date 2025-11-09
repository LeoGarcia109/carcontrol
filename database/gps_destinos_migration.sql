-- ================================================================
-- MIGRATION: Adicionar Coordenadas GPS aos Destinos
-- Data: 08/01/2025
-- Versão: 0.1.1
-- Descrição: Adiciona campos latitude e longitude para permitir
--            exibição de destinos no mapa e cálculo de rotas reais
-- ================================================================

-- Adicionar colunas de GPS à tabela destinos
ALTER TABLE destinos
ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER endereco,
ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude,
ADD INDEX idx_coords (latitude, longitude);

-- Comentários sobre precisão:
-- latitude: -90 a +90 graus (8 casas decimais = ~1.1mm de precisão)
-- longitude: -180 a +180 graus (8 casas decimais = ~1.1mm de precisão)
-- NULL permitido para compatibilidade com destinos antigos sem coordenadas

-- Verificar estrutura atualizada
DESCRIBE destinos;

-- ================================================================
-- FIM DA MIGRATION
-- ================================================================
