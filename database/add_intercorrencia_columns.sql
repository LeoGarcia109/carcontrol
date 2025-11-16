-- Migration: Add intercorrencia photo columns to uso_veiculos
-- Date: 2025-01-08
-- Description: Adds columns to store incident photos uploaded by drivers during vehicle usage

USE carcontrol_db;

-- Add intercorrencia_photo column (stores binary photo data)
-- Note: IF NOT EXISTS not supported in MySQL ALTER TABLE, check manually first
ALTER TABLE uso_veiculos
ADD COLUMN intercorrencia_photo LONGBLOB NULL COMMENT 'Foto de intercorrência/incidente durante uso do veículo';

-- Add intercorrencia_photo_type column (stores image MIME type)
ALTER TABLE uso_veiculos
ADD COLUMN intercorrencia_photo_type VARCHAR(10) NULL COMMENT 'Tipo MIME da foto (jpg, png, etc)';

-- Verify columns were added
SELECT 'Migration completed successfully' AS status;
DESCRIBE uso_veiculos;
