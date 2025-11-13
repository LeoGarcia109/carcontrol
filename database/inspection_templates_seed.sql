-- ================================================================
-- SEED: TEMPLATES DE INSPEÇÃO VEICULAR
-- Descrição: Dados iniciais para templates pré-viagem e revisão
-- Data: 2025-11-09
-- Versão: 0.1.2-beta
-- ================================================================

-- Limpar dados existentes (se houver)
DELETE FROM inspecoes_itens WHERE id > 0;
DELETE FROM inspecoes WHERE id > 0;
DELETE FROM inspecoes_itens_template WHERE id > 0;
DELETE FROM inspecoes_templates WHERE id > 0;

-- Reset AUTO_INCREMENT
ALTER TABLE inspecoes_templates AUTO_INCREMENT = 1;
ALTER TABLE inspecoes_itens_template AUTO_INCREMENT = 1;

-- ================================================================
-- TEMPLATE 1: INSPEÇÃO PRÉ-VIAGEM (SEMANAL)
-- ================================================================
INSERT INTO inspecoes_templates (nome, tipo, descricao, periodicidade, ativo)
VALUES (
    'Inspeção Pré-Viagem Padrão',
    'pre_viagem',
    'Checklist básico de segurança e funcionamento antes de iniciar viagem. Recomendado semanalmente ou antes de cada viagem longa.',
    'semanal',
    TRUE
);

SET @template_pre_viagem_id = LAST_INSERT_ID();

-- CATEGORIA: PNEUS E RODAS
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta, unidade_medida, valor_minimo, valor_maximo)
VALUES
    (@template_pre_viagem_id, 'pneus', 'Pressão dos pneus dianteiros', 'Verificar pressão conforme manual do veículo', 1, TRUE, 'numero', 'PSI', 28, 35),
    (@template_pre_viagem_id, 'pneus', 'Pressão dos pneus traseiros', 'Verificar pressão conforme manual do veículo', 2, TRUE, 'numero', 'PSI', 28, 35),
    (@template_pre_viagem_id, 'pneus', 'Pressão do pneu estepe', 'Pneu reserva calibrado e em boas condições', 3, TRUE, 'ok_nao_ok', NULL, NULL, NULL),
    (@template_pre_viagem_id, 'pneus', 'Estado geral dos pneus', 'Verificar desgaste, cortes e objetos', 4, TRUE, 'ok_nao_ok', NULL, NULL, NULL),
    (@template_pre_viagem_id, 'pneus', 'Alinhamento visual', 'Pneus sem desgaste irregular', 5, FALSE, 'ok_nao_ok', NULL, NULL, NULL);

-- CATEGORIA: FLUIDOS
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'fluidos', 'Nível de água do radiador', 'Verificar nível no reservatório de expansão', 10, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'fluidos', 'Nível de água do limpador', 'Reservatório do limpador de para-brisa', 11, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'fluidos', 'Nível de óleo do motor', 'Verificar vareta de óleo (motor frio)', 12, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'fluidos', 'Vazamentos visíveis', 'Verificar vazamentos embaixo do veículo', 13, TRUE, 'ok_nao_ok');

-- CATEGORIA: ILUMINAÇÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'iluminacao', 'Faróis (alto e baixo)', 'Testar funcionamento de ambos os faróis', 20, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Lanternas traseiras', 'Luzes de posição traseiras', 21, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Luzes de freio', 'Testar ao pisar no freio', 22, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Setas (dianteiras e traseiras)', 'Indicadores de direção', 23, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Luz de ré', 'Testar ao engatar marcha-ré', 24, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Luzes do painel', 'Painel de instrumentos iluminado', 25, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'iluminacao', 'Luz de neblina', 'Se equipado', 26, FALSE, 'ok_nao_ok');

-- CATEGORIA: LIMPEZA E CONSERVAÇÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'limpeza', 'Veículo lavado externamente', 'Limpeza externa do veículo', 30, FALSE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'limpeza', 'Vidros limpos', 'Para-brisa e vidros laterais', 31, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'limpeza', 'Interior limpo e organizado', 'Sem objetos soltos', 32, TRUE, 'ok_nao_ok');

-- CATEGORIA: SEGURANÇA
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'seguranca', 'Cintos de segurança', 'Todos funcionando e sem danos', 40, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'seguranca', 'Extintor de incêndio', 'Prazo de validade OK e no local correto', 41, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'seguranca', 'Triângulo de sinalização', 'Presente e em boas condições', 42, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'seguranca', 'Macaco e chave de roda', 'Kit de emergência completo', 43, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'seguranca', 'Airbags', 'Luz de alerta apagada no painel', 44, TRUE, 'ok_nao_ok');

-- CATEGORIA: DOCUMENTAÇÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'documentacao', 'CRLV no veículo', 'Documento do veículo atualizado', 50, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'documentacao', 'Seguro válido', 'Apólice de seguro vigente', 51, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'documentacao', 'CNH do motorista válida', 'Carteira sem vencimento', 52, TRUE, 'ok_nao_ok');

-- CATEGORIA: FUNCIONAMENTO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_pre_viagem_id, 'funcionamento', 'Limpadores de para-brisa', 'Testados e sem ruídos', 60, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'funcionamento', 'Buzina', 'Funcionamento OK', 61, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'funcionamento', 'Espelhos retrovisores', 'Ajustados e sem trincas', 62, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'funcionamento', 'Freios', 'Pedal firme, sem ruídos', 63, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'funcionamento', 'Direção', 'Sem folgas ou ruídos', 64, TRUE, 'ok_nao_ok'),
    (@template_pre_viagem_id, 'funcionamento', 'Ar-condicionado', 'Funcionamento adequado', 65, FALSE, 'ok_nao_ok');

-- ================================================================
-- TEMPLATE 2: INSPEÇÃO DE REVISÃO (PERIÓDICA)
-- ================================================================
INSERT INTO inspecoes_templates (nome, tipo, descricao, periodicidade, ativo)
VALUES (
    'Revisão Periódica Completa',
    'revisao',
    'Checklist técnico completo para revisão preventiva. Deve ser realizado a cada 10.000 km ou 1 ano, o que ocorrer primeiro.',
    '10000km ou 1 ano',
    TRUE
);

SET @template_revisao_id = LAST_INSERT_ID();

-- CATEGORIA: MOTOR
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'motor', 'Óleo do motor (nível e qualidade)', 'Trocar conforme especificação do fabricante', 100, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Filtro de óleo', 'Substituir a cada troca de óleo', 101, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Filtro de ar', 'Substituir se necessário', 102, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Filtro de combustível', 'Verificar estado', 103, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Velas de ignição', 'Estado dos eletrodos e gap', 104, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Cabos de vela', 'Verificar isolamento', 105, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Correia dentada', 'Verificar tensão e desgaste', 106, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'motor', 'Correia do alternador', 'Verificar tensão e rachaduras', 107, TRUE, 'ok_nao_ok');

-- CATEGORIA: TRANSMISSÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'transmissao', 'Óleo da transmissão', 'Nível e qualidade', 110, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'transmissao', 'Embreagem', 'Regulagem e funcionamento', 111, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'transmissao', 'Caixa de câmbio', 'Ruídos e trocas de marcha', 112, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'transmissao', 'Diferencial', 'Nível de óleo', 113, TRUE, 'ok_nao_ok');

-- CATEGORIA: FREIOS
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta, unidade_medida, valor_minimo)
VALUES
    (@template_revisao_id, 'freios', 'Pastilhas de freio dianteiras', 'Espessura mínima', 120, TRUE, 'numero', 'mm', 3),
    (@template_revisao_id, 'freios', 'Pastilhas de freio traseiras', 'Espessura mínima', 121, TRUE, 'numero', 'mm', 3),
    (@template_revisao_id, 'freios', 'Discos de freio', 'Desgaste e empenamento', 122, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'freios', 'Fluido de freio', 'Nível e cor', 123, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'freios', 'Cilindro mestre', 'Vazamentos', 124, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'freios', 'Freio de mão', 'Regulagem e eficiência', 125, TRUE, 'ok_nao_ok', NULL, NULL);

-- CATEGORIA: SUSPENSÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'suspensao', 'Amortecedores dianteiros', 'Vazamentos e eficiência', 130, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'suspensao', 'Amortecedores traseiros', 'Vazamentos e eficiência', 131, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'suspensao', 'Molas', 'Estado e altura', 132, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'suspensao', 'Bandejas e braços', 'Folgas e trincas', 133, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'suspensao', 'Buchas', 'Desgaste e folgas', 134, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'suspensao', 'Barra estabilizadora', 'Fixação e buchas', 135, TRUE, 'ok_nao_ok');

-- CATEGORIA: SISTEMA ELÉTRICO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta, unidade_medida, valor_minimo)
VALUES
    (@template_revisao_id, 'eletrico', 'Bateria (voltagem)', 'Testar com multímetro', 140, TRUE, 'numero', 'V', 12.4),
    (@template_revisao_id, 'eletrico', 'Terminais da bateria', 'Limpeza e aperto', 141, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'eletrico', 'Alternador', 'Carga e correias', 142, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'eletrico', 'Motor de partida', 'Funcionamento', 143, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'eletrico', 'Fusíveis', 'Verificar todos', 144, TRUE, 'ok_nao_ok', NULL, NULL);

-- CATEGORIA: ARREFECIMENTO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'arrefecimento', 'Radiador', 'Vazamentos e obstruções', 150, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'arrefecimento', 'Mangueiras', 'Rachaduras e ressecamento', 151, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'arrefecimento', 'Ventoinha', 'Funcionamento e ruídos', 152, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'arrefecimento', 'Reservatório de expansão', 'Nível e limpeza', 153, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'arrefecimento', 'Tampa do radiador', 'Vedação', 154, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'arrefecimento', 'Líquido de arrefecimento', 'Concentração e cor', 155, TRUE, 'ok_nao_ok');

-- CATEGORIA: DIREÇÃO
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'direcao', 'Bomba de direção hidráulica', 'Ruídos e vazamentos', 160, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'direcao', 'Fluido de direção', 'Nível e cor', 161, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'direcao', 'Caixa de direção', 'Folgas e vazamentos', 162, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'direcao', 'Terminais de direção', 'Folgas', 163, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'direcao', 'Coifa da caixa', 'Rasgos e ressecamento', 164, TRUE, 'ok_nao_ok');

-- CATEGORIA: PNEUS E GEOMETRIA
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta, unidade_medida, valor_minimo)
VALUES
    (@template_revisao_id, 'pneus_geometria', 'Profundidade dos sulcos', 'Mínimo legal 1.6mm', 170, TRUE, 'numero', 'mm', 1.6),
    (@template_revisao_id, 'pneus_geometria', 'Desgaste irregular', 'Verificar padrão de desgaste', 171, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'pneus_geometria', 'Alinhamento', 'Realizar se necessário', 172, TRUE, 'ok_nao_ok', NULL, NULL),
    (@template_revisao_id, 'pneus_geometria', 'Balanceamento', 'Realizar se necessário', 173, TRUE, 'ok_nao_ok', NULL, NULL);

-- CATEGORIA: CARROCERIA E CHASSIS
INSERT INTO inspecoes_itens_template
    (template_id, categoria, item, descricao, ordem, obrigatorio, tipo_resposta)
VALUES
    (@template_revisao_id, 'carroceria', 'Corrosão', 'Verificar pontos de ferrugem', 180, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'carroceria', 'Lataria', 'Amassados e arranhões', 181, FALSE, 'ok_nao_ok'),
    (@template_revisao_id, 'carroceria', 'Vidros', 'Trincas e lascas', 182, TRUE, 'ok_nao_ok'),
    (@template_revisao_id, 'carroceria', 'Borrachas e vedações', 'Ressecamento', 183, TRUE, 'ok_nao_ok');

-- ================================================================
-- VERIFICAÇÃO DOS DADOS INSERIDOS
-- ================================================================
SELECT
    t.id,
    t.nome,
    t.tipo,
    t.periodicidade,
    COUNT(i.id) as total_itens
FROM inspecoes_templates t
LEFT JOIN inspecoes_itens_template i ON t.id = i.template_id
GROUP BY t.id, t.nome, t.tipo, t.periodicidade
ORDER BY t.id;

-- ================================================================
-- FIM DO SEED
-- ================================================================
-- Para aplicar este seed:
-- mysql -u root -p carcontrol_db < database/inspection_templates_seed.sql
