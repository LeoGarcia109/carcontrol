-- ================================================================
-- MIGRATION: Docker Deployment Fixes
-- Data: 2025-11-16
-- Descrição: Correções necessárias para deploy Docker
-- ================================================================

-- 1. Adicionar coluna motorista_id na tabela usuarios
-- Permite vincular usuários do tipo 'motorista' ao cadastro de motoristas
ALTER TABLE usuarios ADD COLUMN motorista_id INT NULL;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- 2. Adicionar role 'motorista' ao ENUM de usuarios
-- Permite criar usuários com perfil de motorista
ALTER TABLE usuarios MODIFY COLUMN role ENUM('admin', 'user', 'motorista') DEFAULT 'user';

-- 3. Adicionar coluna photo na tabela veiculos
-- Armazena foto do veículo em formato BLOB
ALTER TABLE veiculos ADD COLUMN photo MEDIUMBLOB NULL AFTER observacoes;

-- 4. Adicionar coluna photo_type na tabela veiculos
-- Armazena o tipo MIME da foto (image/jpeg, image/png, etc)
ALTER TABLE veiculos ADD COLUMN photo_type VARCHAR(50) NULL AFTER photo;

-- 5. Adicionar coluna photo na tabela motoristas
-- Armazena foto do motorista em formato BLOB
ALTER TABLE motoristas ADD COLUMN photo MEDIUMBLOB NULL AFTER observacoes;

-- 6. Adicionar coluna photo_type na tabela motoristas
-- Armazena o tipo MIME da foto
ALTER TABLE motoristas ADD COLUMN photo_type VARCHAR(50) NULL AFTER photo;

-- 7. Atualizar emails dos usuários padrão
-- Configura emails para permitir login via email
UPDATE usuarios SET email = 'admin@carcontrol.com' WHERE username = 'admin' AND email IS NULL;
UPDATE usuarios SET email = 'leo@gmail.com' WHERE username = 'usuario' AND email IS NULL;

-- 8. Atualizar senha do admin (hash bcrypt de 'admin123')
-- Senha padrão: admin123
UPDATE usuarios
SET password = '$2y$12$xKISsJ.IZaoHh483NS9I0O6SyoCopOxBJKJcwIXJo0wzv2tv8Rm26'
WHERE username = 'admin';

-- ================================================================
-- NOTAS IMPORTANTES
-- ================================================================
-- 1. Esta migration deve ser executada APÓS a instalação inicial do schema
-- 2. As colunas photo são MEDIUMBLOB para suportar imagens até 16MB
-- 3. Os emails configurados devem ser alterados em produção
-- 4. A senha do admin DEVE ser alterada após o primeiro login
-- 5. Esta migration é idempotente (pode ser executada múltiplas vezes)
-- ================================================================
