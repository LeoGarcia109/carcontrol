<?php
/**
 * Inspection Controller
 * Gerencia inspeções veiculares (pré-viagem e revisão)
 */

class InspectionController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * GET /inspections/templates
     * Listar todos os templates de inspeção
     */
    public function getTemplates() {
        try {
            $query = "SELECT
                        t.id, t.nome as name, t.tipo as type,
                        t.descricao as description, t.periodicidade as frequency,
                        t.ativo as active,
                        COUNT(i.id) as itemCount
                      FROM inspecoes_templates t
                      LEFT JOIN inspecoes_itens_template i ON t.id = i.template_id
                      WHERE t.ativo = TRUE
                      GROUP BY t.id, t.nome, t.tipo, t.descricao, t.periodicidade, t.ativo
                      ORDER BY t.tipo, t.nome";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($templates as &$template) {
                $template['id'] = (int)$template['id'];
                $template['itemCount'] = (int)$template['itemCount'];
                $template['active'] = (bool)$template['active'];
            }

            sendResponse([
                'success' => true,
                'data' => $templates,
                'count' => count($templates)
            ]);

        } catch (Exception $e) {
            error_log("Get templates error: " . $e->getMessage());
            sendError('Erro ao buscar templates', 500);
        }
    }

    /**
     * GET /inspections/templates/{id}
     * Obter template específico com seus itens
     */
    public function getTemplate($id) {
        try {
            // Buscar template
            $query = "SELECT
                        id, nome as name, tipo as type,
                        descricao as description, periodicidade as frequency,
                        ativo as active
                      FROM inspecoes_templates
                      WHERE id = ? AND ativo = TRUE";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) {
                sendError('Template não encontrado', 404);
            }

            $template['id'] = (int)$template['id'];
            $template['active'] = (bool)$template['active'];

            // Buscar itens do template
            $query = "SELECT
                        id, categoria as category, item, descricao as description,
                        ordem as itemOrder, obrigatorio as required,
                        tipo_resposta as responseType,
                        unidade_medida as unit,
                        valor_minimo as `minValue`, valor_maximo as `maxValue`
                      FROM inspecoes_itens_template
                      WHERE template_id = ?
                      ORDER BY categoria, ordem, item";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                $item['id'] = (int)$item['id'];
                $item['itemOrder'] = (int)$item['itemOrder'];
                $item['required'] = (bool)$item['required'];
                $item['minValue'] = $item['minValue'] ? (float)$item['minValue'] : null;
                $item['maxValue'] = $item['maxValue'] ? (float)$item['maxValue'] : null;
            }

            // Agrupar itens por categoria
            $categorizedItems = [];
            foreach ($items as $item) {
                $category = $item['category'];
                if (!isset($categorizedItems[$category])) {
                    $categorizedItems[$category] = [];
                }
                $categorizedItems[$category][] = $item;
            }

            $template['items'] = $items;
            $template['itemsByCategory'] = $categorizedItems;

            sendResponse([
                'success' => true,
                'data' => $template
            ]);

        } catch (Exception $e) {
            error_log("Get template error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendError('Erro ao buscar template: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /inspections
     * Listar inspeções com filtros opcionais
     */
    public function getAll() {
        try {
            $filters = [];
            $params = [];

            // Filtro por veículo
            if (isset($_GET['vehicleId']) && !empty($_GET['vehicleId'])) {
                $filters[] = "i.veiculo_id = ?";
                $params[] = $_GET['vehicleId'];
            }

            // Filtro por motorista
            if (isset($_GET['driverId']) && !empty($_GET['driverId'])) {
                $filters[] = "i.motorista_id = ?";
                $params[] = $_GET['driverId'];
            }

            // Filtro por tipo
            if (isset($_GET['type']) && !empty($_GET['type'])) {
                $filters[] = "i.tipo = ?";
                $params[] = $_GET['type'];
            }

            // Filtro por status
            if (isset($_GET['status']) && !empty($_GET['status'])) {
                $filters[] = "i.status = ?";
                $params[] = $_GET['status'];
            }

            // Filtro por período
            if (isset($_GET['startDate']) && !empty($_GET['startDate'])) {
                $filters[] = "DATE(i.data_inspecao) >= ?";
                $params[] = $_GET['startDate'];
            }

            if (isset($_GET['endDate']) && !empty($_GET['endDate'])) {
                $filters[] = "DATE(i.data_inspecao) <= ?";
                $params[] = $_GET['endDate'];
            }

            $whereClause = count($filters) > 0 ? 'WHERE ' . implode(' AND ', $filters) : '';

            $query = "SELECT
                        i.id, i.veiculo_id as vehicleId, i.motorista_id as driverId,
                        i.uso_veiculo_id as usageId, i.template_id as templateId,
                        i.tipo as type, i.data_inspecao as inspectionDate,
                        i.km_veiculo as km, i.status,
                        i.observacoes_gerais as generalObservations,
                        i.responsavel_nome as responsibleName,
                        i.proxima_inspecao_data as nextInspectionDate,
                        i.proxima_inspecao_km as nextInspectionKm,
                        i.created_at as createdAt,
                        v.placa as vehiclePlate, v.marca as vehicleBrand, v.modelo as vehicleModel,
                        m.nome as driverName,
                        t.nome as templateName
                      FROM inspecoes i
                      INNER JOIN veiculos v ON i.veiculo_id = v.id
                      INNER JOIN motoristas m ON i.motorista_id = m.id
                      INNER JOIN inspecoes_templates t ON i.template_id = t.id
                      $whereClause
                      AND i.ativo = TRUE
                      ORDER BY i.data_inspecao DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            $inspections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($inspections as &$inspection) {
                $inspection['id'] = (int)$inspection['id'];
                $inspection['vehicleId'] = (int)$inspection['vehicleId'];
                $inspection['driverId'] = (int)$inspection['driverId'];
                $inspection['usageId'] = $inspection['usageId'] ? (int)$inspection['usageId'] : null;
                $inspection['templateId'] = (int)$inspection['templateId'];
                $inspection['km'] = (int)$inspection['km'];
                $inspection['nextInspectionKm'] = $inspection['nextInspectionKm'] ? (int)$inspection['nextInspectionKm'] : null;
            }

            sendResponse([
                'success' => true,
                'data' => $inspections,
                'count' => count($inspections)
            ]);

        } catch (Exception $e) {
            error_log("Get inspections error: " . $e->getMessage());
            sendError('Erro ao buscar inspeções', 500);
        }
    }

    /**
     * GET /inspections/{id}
     * Obter inspeção específica com todos os itens
     */
    public function getById($id) {
        try {
            // Buscar inspeção
            $query = "SELECT
                        i.id, i.veiculo_id as vehicleId, i.motorista_id as driverId,
                        i.uso_veiculo_id as usageId, i.template_id as templateId,
                        i.tipo as type, i.data_inspecao as inspectionDate,
                        i.km_veiculo as km, i.status,
                        i.observacoes_gerais as generalObservations,
                        i.responsavel_nome as responsibleName,
                        i.responsavel_crea as responsibleCrea,
                        i.proxima_inspecao_data as nextInspectionDate,
                        i.proxima_inspecao_km as nextInspectionKm,
                        i.created_at as createdAt,
                        v.placa as vehiclePlate, v.marca as vehicleBrand, v.modelo as vehicleModel,
                        m.nome as driverName, m.cnh,
                        t.nome as templateName
                      FROM inspecoes i
                      INNER JOIN veiculos v ON i.veiculo_id = v.id
                      INNER JOIN motoristas m ON i.motorista_id = m.id
                      INNER JOIN inspecoes_templates t ON i.template_id = t.id
                      WHERE i.id = ? AND i.ativo = TRUE";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $inspection = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$inspection) {
                sendError('Inspeção não encontrada', 404);
            }

            $inspection['id'] = (int)$inspection['id'];
            $inspection['vehicleId'] = (int)$inspection['vehicleId'];
            $inspection['driverId'] = (int)$inspection['driverId'];
            $inspection['usageId'] = $inspection['usageId'] ? (int)$inspection['usageId'] : null;
            $inspection['templateId'] = (int)$inspection['templateId'];
            $inspection['km'] = (int)$inspection['km'];
            $inspection['nextInspectionKm'] = $inspection['nextInspectionKm'] ? (int)$inspection['nextInspectionKm'] : null;

            // Buscar itens da inspeção
            $query = "SELECT
                        ii.id, ii.item_template_id as itemTemplateId,
                        ii.status, ii.valor_texto as textValue,
                        ii.valor_numero as numberValue, ii.observacao as observation,
                        ii.requer_manutencao as requiresMaintenance,
                        it.categoria as category, it.item, it.descricao as description,
                        it.tipo_resposta as responseType
                      FROM inspecoes_itens ii
                      INNER JOIN inspecoes_itens_template it ON ii.item_template_id = it.id
                      WHERE ii.inspecao_id = ?
                      ORDER BY it.categoria, it.ordem, it.item";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                $item['id'] = (int)$item['id'];
                $item['itemTemplateId'] = (int)$item['itemTemplateId'];
                $item['numberValue'] = $item['numberValue'] ? (float)$item['numberValue'] : null;
                $item['requiresMaintenance'] = (bool)$item['requiresMaintenance'];
            }

            // Agrupar itens por categoria
            $categorizedItems = [];
            foreach ($items as $item) {
                $category = $item['category'];
                if (!isset($categorizedItems[$category])) {
                    $categorizedItems[$category] = [];
                }
                $categorizedItems[$category][] = $item;
            }

            // Calcular estatísticas dos itens
            $totalItems = count($items);
            $conformeCount = count(array_filter($items, fn($i) => $i['status'] === 'conforme'));
            $naoConformeCount = count(array_filter($items, fn($i) => $i['status'] === 'nao_conforme'));
            $requiresMaintenanceCount = count(array_filter($items, fn($i) => $i['requiresMaintenance']));

            $inspection['items'] = $items;
            $inspection['itemsByCategory'] = $categorizedItems;
            $inspection['stats'] = [
                'total' => $totalItems,
                'conforme' => $conformeCount,
                'naoConforme' => $naoConformeCount,
                'requiresMaintenance' => $requiresMaintenanceCount,
                'conformePercentage' => $totalItems > 0 ? round(($conformeCount / $totalItems) * 100, 2) : 0
            ];

            sendResponse([
                'success' => true,
                'data' => $inspection
            ]);

        } catch (Exception $e) {
            error_log("Get inspection error: " . $e->getMessage());
            sendError('Erro ao buscar inspeção', 500);
        }
    }

    /**
     * GET /inspections/vehicle/{vehicleId}
     * Obter histórico de inspeções de um veículo
     */
    public function getByVehicle($vehicleId) {
        try {
            $query = "SELECT
                        i.id, i.tipo as type, i.data_inspecao as inspectionDate,
                        i.km_veiculo as km, i.status,
                        m.nome as driverName,
                        t.nome as templateName
                      FROM inspecoes i
                      INNER JOIN motoristas m ON i.motorista_id = m.id
                      INNER JOIN inspecoes_templates t ON i.template_id = t.id
                      WHERE i.veiculo_id = ? AND i.ativo = TRUE
                      ORDER BY i.data_inspecao DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$vehicleId]);

            $inspections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($inspections as &$inspection) {
                $inspection['id'] = (int)$inspection['id'];
                $inspection['km'] = (int)$inspection['km'];
            }

            sendResponse([
                'success' => true,
                'data' => $inspections,
                'count' => count($inspections)
            ]);

        } catch (Exception $e) {
            error_log("Get vehicle inspections error: " . $e->getMessage());
            sendError('Erro ao buscar inspeções do veículo', 500);
        }
    }

    /**
     * GET /inspections/pending
     * Obter inspeções pendentes/vencidas
     */
    public function getPending() {
        try {
            $query = "SELECT * FROM vw_inspecoes_pendentes ORDER BY situacao DESC, dias_sem_inspecao DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($pending as &$item) {
                $item['veiculo_id'] = (int)$item['veiculo_id'];
                $item['km_atual'] = (int)$item['km_atual'];
                $item['dias_sem_inspecao'] = (int)$item['dias_sem_inspecao'];
            }

            sendResponse([
                'success' => true,
                'data' => $pending,
                'count' => count($pending)
            ]);

        } catch (Exception $e) {
            error_log("Get pending inspections error: " . $e->getMessage());
            sendError('Erro ao buscar inspeções pendentes', 500);
        }
    }

    /**
     * POST /inspections
     * Criar nova inspeção
     */
    public function create($data) {
        try {
            // Validações
            if (empty($data['vehicleId']) || empty($data['driverId']) ||
                empty($data['templateId']) || empty($data['type']) ||
                !isset($data['km']) || empty($data['items'])) {
                sendError('Dados obrigatórios faltando', 400);
            }

            $this->db->beginTransaction();

            // Inserir inspeção
            $query = "INSERT INTO inspecoes
                      (veiculo_id, motorista_id, uso_veiculo_id, template_id,
                       tipo, data_inspecao, km_veiculo, status,
                       observacoes_gerais, responsavel_nome, responsavel_crea,
                       proxima_inspecao_data, proxima_inspecao_km)
                      VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)";

            // Determinar status geral baseado nos itens
            $status = $this->calculateInspectionStatus($data['items']);

            // Calcular próxima inspeção
            $nextInspection = $this->calculateNextInspection($data['type'], $data['km']);

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['vehicleId'],
                $data['driverId'],
                $data['usageId'] ?? null,
                $data['templateId'],
                $data['type'],
                $data['km'],
                $status,
                $data['generalObservations'] ?? null,
                $data['responsibleName'] ?? null,
                $data['responsibleCrea'] ?? null,
                $nextInspection['date'] ?? null,
                $nextInspection['km'] ?? null
            ]);

            $inspectionId = $this->db->lastInsertId();

            // Inserir itens da inspeção
            $queryItem = "INSERT INTO inspecoes_itens
                          (inspecao_id, item_template_id, status, valor_texto,
                           valor_numero, observacao, requer_manutencao)
                          VALUES (?, ?, ?, ?, ?, ?, ?)";

            $stmtItem = $this->db->prepare($queryItem);

            foreach ($data['items'] as $item) {
                $stmtItem->execute([
                    $inspectionId,
                    $item['itemTemplateId'],
                    $item['status'],
                    $item['textValue'] ?? null,
                    $item['numberValue'] ?? null,
                    $item['observation'] ?? null,
                    isset($item['requiresMaintenance']) ? (int)$item['requiresMaintenance'] : 0
                ]);
            }

            $this->db->commit();

            sendResponse([
                'success' => true,
                'message' => 'Inspeção criada com sucesso',
                'data' => [
                    'id' => (int)$inspectionId,
                    'status' => $status
                ]
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Create inspection error: " . $e->getMessage());
            sendError('Erro ao criar inspeção: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /inspections/stats
     * Estatísticas gerais de inspeções
     */
    public function getStats() {
        try {
            // Estatísticas últimos 30 dias
            $query = "CALL sp_estatisticas_inspecoes(DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY), CURRENT_DATE)";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $stats30d = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            // Inspeções pendentes
            $queryPending = "SELECT COUNT(*) as count FROM vw_inspecoes_pendentes";
            $stmt = $this->db->prepare($queryPending);
            $stmt->execute();
            $pendingCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Últimas inspeções
            $queryRecent = "SELECT
                              i.id, i.tipo as type, i.data_inspecao as date,
                              i.status, v.placa as vehiclePlate,
                              m.nome as driverName
                            FROM inspecoes i
                            INNER JOIN veiculos v ON i.veiculo_id = v.id
                            INNER JOIN motoristas m ON i.motorista_id = m.id
                            WHERE i.ativo = TRUE
                            ORDER BY i.data_inspecao DESC
                            LIMIT 10";
            $stmt = $this->db->prepare($queryRecent);
            $stmt->execute();
            $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

            sendResponse([
                'success' => true,
                'data' => [
                    'last30Days' => $stats30d,
                    'pendingCount' => (int)$pendingCount,
                    'recentInspections' => $recent
                ]
            ]);

        } catch (Exception $e) {
            error_log("Get stats error: " . $e->getMessage());
            sendError('Erro ao buscar estatísticas', 500);
        }
    }

    /**
     * DELETE /inspections/{id}
     * Excluir inspeção (soft delete)
     */
    public function delete($id) {
        try {
            $query = "UPDATE inspecoes SET ativo = FALSE WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                sendError('Inspeção não encontrada', 404);
            }

            sendResponse([
                'success' => true,
                'message' => 'Inspeção excluída com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Delete inspection error: " . $e->getMessage());
            sendError('Erro ao excluir inspeção', 500);
        }
    }

    /**
     * Calcula status geral da inspeção baseado nos itens
     */
    private function calculateInspectionStatus($items) {
        $naoConforme = 0;
        $alerta = 0;
        $total = count($items);

        foreach ($items as $item) {
            if ($item['status'] === 'nao_conforme') {
                $naoConforme++;
            } elseif ($item['status'] === 'alerta') {
                $alerta++;
            }
        }

        // Se tem não conformidades
        if ($naoConforme > 0) {
            if ($naoConforme <= ($total * 0.2)) {
                // Até 20% não conforme = aprovado com restrição
                return 'aprovado_com_restricao';
            } else {
                return 'reprovado';
            }
        }

        // Se tem apenas alertas (sem não conformidades)
        if ($alerta > 0) {
            return 'aprovado_com_restricao';
        }

        // Tudo conforme
        return 'aprovado';
    }

    /**
     * Calcula próxima inspeção
     */
    private function calculateNextInspection($type, $currentKm) {
        $result = [];

        if ($type === 'pre_viagem') {
            // Próxima inspeção pré-viagem em 7 dias
            $result['date'] = date('Y-m-d', strtotime('+7 days'));
            $result['km'] = null;
        } else {
            // Próxima revisão em 10.000 km ou 1 ano
            $result['date'] = date('Y-m-d', strtotime('+1 year'));
            $result['km'] = $currentKm + 10000;
        }

        return $result;
    }
}
