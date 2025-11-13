-- Migration to fix 'alerta' status issue in inspections
-- Date: 2025-01-12
-- Issue: Inspections with 'alerta' status were failing to save because the ENUM didn't include 'alerta'

-- Update the status ENUM in inspecoes_itens table to include 'alerta'
ALTER TABLE inspecoes_itens
MODIFY COLUMN status ENUM('conforme', 'nao_conforme', 'alerta', 'nao_aplicavel') NOT NULL;

-- Add comment to document the status meanings
ALTER TABLE inspecoes_itens
MODIFY COLUMN status ENUM('conforme', 'nao_conforme', 'alerta', 'nao_aplicavel') NOT NULL
COMMENT 'conforme=OK, nao_conforme=Not OK, alerta=Warning/Alert, nao_aplicavel=N/A';

-- Verify the change
SHOW COLUMNS FROM inspecoes_itens WHERE Field = 'status';