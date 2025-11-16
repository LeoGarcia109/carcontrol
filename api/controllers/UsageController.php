<?php
/**
 * Usage Controller
 * Gerencia registros de uso de veículos
 */

class UsageController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function ensureApprovalTable() {
        $sql = "CREATE TABLE IF NOT EXISTS uso_veiculos_aprovacoes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    uso_id INT NOT NULL,
                    status ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
                    reason TEXT NULL,
                    approved_by INT NULL,
                    approved_at DATETIME NULL,
                    UNIQUE KEY uniq_uso (uso_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $this->db->exec($sql);
    }

    /**
     * Listar todos os registros de uso
     * GET /usage
     */
    public function getAll() {
        try {
            // Garantir que a tabela de aprovações exista antes do JOIN
            $this->ensureApprovalTable();
            $this->ensureCostColumn();

            $query = "SELECT
                        uv.id, uv.veiculo_id as vehicleId, uv.motorista_id as driverId,
                        uv.data_hora_saida as departureTime, uv.km_saida as kmDeparture,
                        uv.data_hora_retorno as returnTime, uv.km_retorno as kmReturn,
                        uv.destino as destination,
                        uv.rota as route, uv.finalidade as purpose,
                        uv.observacoes as notes, uv.status,
                        uv.intercorrencia_photo, uv.intercorrencia_photo_type,
                        uv.custo_aproximado as costApprox,
                        uv.created_at as createdAt, uv.updated_at as updatedAt,
                        ua.status as approvalStatus, ua.reason as rejectionReason, ua.approved_at as approvedAt,
                        COALESCE(v.placa, 'N/A') as vehiclePlate,
                        COALESCE(v.marca, 'N/A') as vehicleBrand,
                        COALESCE(v.modelo, 'N/A') as vehicleModel,
                        COALESCE(m.nome, 'N/A') as driverName
                      FROM uso_veiculos uv
                      LEFT JOIN veiculos v ON uv.veiculo_id = v.id
                      LEFT JOIN motoristas m ON uv.motorista_id = m.id
                      LEFT JOIN uso_veiculos_aprovacoes ua ON ua.uso_id = uv.id
                      ORDER BY uv.data_hora_saida DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Converter tipos com proteção contra NULL
            foreach ($records as &$record) {
                $record['id'] = isset($record['id']) && $record['id'] !== null ? (int)$record['id'] : 0;
                $record['vehicleId'] = isset($record['vehicleId']) && $record['vehicleId'] !== null ? (int)$record['vehicleId'] : 0;
                $record['driverId'] = isset($record['driverId']) && $record['driverId'] !== null ? (int)$record['driverId'] : 0;
                $record['kmDeparture'] = isset($record['kmDeparture']) && $record['kmDeparture'] !== null ? (int)$record['kmDeparture'] : 0;
                $record['kmReturn'] = isset($record['kmReturn']) && $record['kmReturn'] !== null ? (int)$record['kmReturn'] : null;

                // Converter foto de intercorrência para base64
                if ($record['intercorrencia_photo']) {
                    $record['incidentPhoto'] = base64_encode($record['intercorrencia_photo']);
                    $record['incidentPhotoType'] = $record['intercorrencia_photo_type'];
                } else {
                    $record['incidentPhoto'] = null;
                    $record['incidentPhotoType'] = null;
                }

                // Remover campos binários brutos
                unset($record['intercorrencia_photo']);
                unset($record['intercorrencia_photo_type']);
            }

            sendResponse([
                'success' => true,
                'data' => $records,
                'count' => count($records)
            ]);

        } catch (PDOException $e) {
            error_log("PDO Error in getAll usage: " . $e->getMessage());
            error_log("SQL State: " . $e->getCode());
            sendError('Erro de banco de dados ao buscar registros: ' . $e->getMessage(), 500);
        } catch (Exception $e) {
            error_log("Get usage records error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendError('Erro ao buscar registros de uso: ' . $e->getMessage(), 500);
        }
    }

    private function ensureCostColumn() {
        try {
            $this->db->exec("ALTER TABLE uso_veiculos ADD COLUMN IF NOT EXISTS custo_aproximado DECIMAL(12,2) NULL");
        } catch (Exception $e) {
            // Alguns MySQL não suportam IF NOT EXISTS em ALTER; tentar detectar por DESCRIBE
            try {
                $stmt = $this->db->query("SHOW COLUMNS FROM uso_veiculos LIKE 'custo_aproximado'");
                if ($stmt->rowCount() === 0) {
                    $this->db->exec("ALTER TABLE uso_veiculos ADD COLUMN custo_aproximado DECIMAL(12,2) NULL");
                }
            } catch (Exception $e2) {
                // Ignorar se não conseguir; custo continuará nulo
            }
        }
    }

    private function updateCostApprox($usageId) {
        try {
            // Obter dados do uso e veículo
            $q = "SELECT veiculo_id, km_saida, km_retorno FROM uso_veiculos WHERE id = :id";
            $st = $this->db->prepare($q);
            $st->bindParam(':id', $usageId, PDO::PARAM_INT);
            $st->execute();
            $u = $st->fetch(PDO::FETCH_ASSOC);
            if (!$u || empty($u['km_retorno'])) return; // não finalizado

            $deltaKm = (int)$u['km_retorno'] - (int)$u['km_saida'];
            if ($deltaKm <= 0) return;

            // Último preço de combustível deste veículo
            $this->db->exec("CREATE TABLE IF NOT EXISTS despesas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                veiculo_id INT NOT NULL,
                categoria ENUM('abastecimento','pedagio','estacionamento','manutencao','outros') NOT NULL,
                data DATETIME NOT NULL,
                km_atual INT NULL,
                litros DECIMAL(10,2) NULL,
                preco_litro DECIMAL(10,4) NULL,
                valor_total DECIMAL(12,2) NULL,
                observacoes TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $q2 = "SELECT preco_litro FROM despesas WHERE veiculo_id = :vid AND categoria = 'abastecimento' ORDER BY data DESC, id DESC LIMIT 1";
            $st2 = $this->db->prepare($q2);
            $st2->bindParam(':vid', $u['veiculo_id'], PDO::PARAM_INT);
            $st2->execute();
            $last = $st2->fetch(PDO::FETCH_ASSOC);
            if (!$last || $last['preco_litro'] === null) return;

            $price = (float)$last['preco_litro'];
            $cost = round($deltaKm * $price, 2); // estimativa simples solicitada

            $up = $this->db->prepare("UPDATE uso_veiculos SET custo_aproximado = :custo WHERE id = :id");
            $up->bindParam(':custo', $cost);
            $up->bindParam(':id', $usageId, PDO::PARAM_INT);
            $up->execute();
        } catch (Exception $e) {
            error_log('updateCostApprox error: ' . $e->getMessage());
        }
    }

    /**
     * Buscar registros ativos (em uso)
     * GET /usage/active
     */
    public function getActive() {
        try {
            $query = "SELECT * FROM uso_veiculos
                      WHERE status = 'em_uso'
                      ORDER BY data_hora_saida DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            sendResponse([
                'success' => true,
                'data' => $records,
                'count' => count($records)
            ]);

        } catch (Exception $e) {
            error_log("Get active usage error: " . $e->getMessage());
            sendError('Erro ao buscar usos ativos', 500);
        }
    }

    /**
     * Criar novo registro de uso
     * POST /usage
     */
    public function create($data) {
        try {
            // Validar dados
            if (empty($data['vehicleId']) || empty($data['driverId']) ||
                empty($data['departureTime']) || empty($data['kmDeparture'])) {
                sendError('Veículo, motorista, data/hora de saída e KM de saída são obrigatórios', 400);
            }

            // Buscar km_atual do veículo
            $vehicleQuery = "SELECT km_atual FROM veiculos WHERE id = :id AND ativo = 1";
            $vehicleStmt = $this->db->prepare($vehicleQuery);
            $vehicleStmt->bindParam(':id', $data['vehicleId'], PDO::PARAM_INT);
            $vehicleStmt->execute();
            $vehicle = $vehicleStmt->fetch(PDO::FETCH_ASSOC);

            if (!$vehicle) {
                sendError('Veículo não encontrado', 404);
            }

            // Validar km_saida >= km_atual
            if ($data['kmDeparture'] < $vehicle['km_atual']) {
                sendError('KM de saída (' . $data['kmDeparture'] . ' km) não pode ser menor que o KM atual do veículo (' . $vehicle['km_atual'] . ' km)', 400);
            }

            $userId = $_SESSION['user_id'];

            // ⚠️ CRÍTICO: Liberar lock da sessão imediatamente após ler
            // Isso permite que outras requisições (admin dashboard) acessem a sessão
            // enquanto esta requisição processa a criação do uso
            session_write_close();

            // Processar foto de intercorrência
            $incidentPhotoData = null;
            $incidentPhotoType = null;

            if (!empty($data['incidentPhoto'])) {
                $photo = $data['incidentPhoto'];
                if (preg_match('/^data:image\/(\w+);base64,/', $photo, $matches)) {
                    $incidentPhotoType = $matches[1];
                    $photo = substr($photo, strpos($photo, ',') + 1);
                }
                $incidentPhotoData = base64_decode($photo);
            }

            // Iniciar transação
            $this->db->beginTransaction();

            // Inserir registro
            $query = "INSERT INTO uso_veiculos
                      (veiculo_id, motorista_id, usuario_id, data_hora_saida, km_saida,
                       destino, destino_id, rota, finalidade, observacoes,
                       intercorrencia_photo, intercorrencia_photo_type, status)
                      VALUES
                      (:veiculo_id, :motorista_id, :usuario_id, :data_hora_saida, :km_saida,
                       :destino, :destino_id, :rota, :finalidade, :observacoes,
                       :intercorrencia_photo, :intercorrencia_photo_type, 'em_uso')";

            $stmt = $this->db->prepare($query);

            // Campos opcionais com valores default null
            $destination = $data['destination'] ?? null;
            $destinationId = $data['destinationId'] ?? null;
            $route = $data['route'] ?? null;
            $purpose = $data['purpose'] ?? null;
            $notes = $data['incidentNotes'] ?? $data['notes'] ?? null;

            $stmt->bindParam(':veiculo_id', $data['vehicleId'], PDO::PARAM_INT);
            $stmt->bindParam(':motorista_id', $data['driverId'], PDO::PARAM_INT);
            $stmt->bindParam(':usuario_id', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':data_hora_saida', $data['departureTime']);
            $stmt->bindParam(':km_saida', $data['kmDeparture'], PDO::PARAM_INT);
            $stmt->bindParam(':destino', $destination);
            $stmt->bindParam(':destino_id', $destinationId);
            $stmt->bindParam(':rota', $route);
            $stmt->bindParam(':finalidade', $purpose);
            $stmt->bindParam(':observacoes', $notes);
            $stmt->bindParam(':intercorrencia_photo', $incidentPhotoData, PDO::PARAM_LOB);
            $stmt->bindParam(':intercorrencia_photo_type', $incidentPhotoType);

            $stmt->execute();
            $usageId = $this->db->lastInsertId();

            // Atualizar status do veículo
            $updateVehicle = "UPDATE veiculos SET status = 'em_uso' WHERE id = :id";
            $stmtVehicle = $this->db->prepare($updateVehicle);
            $stmtVehicle->bindParam(':id', $data['vehicleId'], PDO::PARAM_INT);
            $stmtVehicle->execute();

            $this->db->commit();

            sendResponse([
                'success' => true,
                'message' => 'Registro de uso criado com sucesso',
                'data' => [
                    'id' => (int)$usageId
                ]
            ], 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Create usage error: " . $e->getMessage());
            sendError('Erro ao criar registro de uso', 500);
        }
    }

    /**
     * Finalizar uso de veículo
     * POST /usage/finalize/{id}
     */
    public function finalize($id, $data) {
        try {
            if (!$id) {
                sendError('ID do registro não fornecido', 400);
            }

            if (empty($data['returnTime']) || empty($data['kmReturn'])) {
                sendError('Data/hora de retorno e KM de retorno são obrigatórios', 400);
            }

            // Buscar km_saida do registro
            $getUsage = "SELECT km_saida FROM uso_veiculos WHERE id = :id";
            $getStmt = $this->db->prepare($getUsage);
            $getStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $getStmt->execute();
            $usageRecord = $getStmt->fetch(PDO::FETCH_ASSOC);

            if (!$usageRecord) {
                sendError('Registro de uso não encontrado', 404);
            }

            // Validar km_retorno > km_saida
            if ($data['kmReturn'] <= $usageRecord['km_saida']) {
                sendError('KM de retorno (' . $data['kmReturn'] . ' km) deve ser maior que o KM de saída (' . $usageRecord['km_saida'] . ' km)', 400);
            }

            // Iniciar transação
            $this->db->beginTransaction();

            // Atualizar registro
            // IMPORTANTE: status 'finalizado' corresponde ao ENUM do banco
            // Trigger tr_finalizar_viagem_rota precisa ser atualizado para usar 'finalizado'
            $query = "UPDATE uso_veiculos
                      SET data_hora_retorno = :data_hora_retorno,
                          km_retorno = :km_retorno,
                          status = 'finalizado'
                      WHERE id = :id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':data_hora_retorno', $data['returnTime']);
            $stmt->bindParam(':km_retorno', $data['kmReturn'], PDO::PARAM_INT);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            // Buscar vehicleId
            $getVehicle = "SELECT veiculo_id FROM uso_veiculos WHERE id = :id";
            $stmtGet = $this->db->prepare($getVehicle);
            $stmtGet->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtGet->execute();
            $usage = $stmtGet->fetch(PDO::FETCH_ASSOC);

            // Atualizar status e KM do veículo
            $updateVehicle = "UPDATE veiculos
                              SET status = 'disponivel',
                                  km_atual = :km_atual
                              WHERE id = :id";
            $stmtVehicle = $this->db->prepare($updateVehicle);
            $stmtVehicle->bindParam(':km_atual', $data['kmReturn'], PDO::PARAM_INT);
            $stmtVehicle->bindParam(':id', $usage['veiculo_id'], PDO::PARAM_INT);
            $stmtVehicle->execute();

            $this->db->commit();

            // Atualizar custo aproximado
            $this->ensureCostColumn();
            $this->updateCostApprox($id);

            sendResponse([
                'success' => true,
                'message' => 'Uso de veículo finalizado com sucesso'
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Finalize usage error: " . $e->getMessage());
            sendError('Erro ao finalizar uso', 500);
        }
    }

    /**
     * Aprovar uso de veículo (opcionalmente finaliza se ainda estiver em uso)
     * POST /usage/approve/{id}
     */
    public function approve($id, $data) {
        try {
            if (!$id) sendError('ID do registro não fornecido', 400);

            $this->ensureApprovalTable();

            // Verificar status atual do uso
            $get = "SELECT status, km_saida FROM uso_veiculos WHERE id = :id";
            $stmt = $this->db->prepare($get);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $usage = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$usage) sendError('Registro de uso não encontrado', 404);

            $this->db->beginTransaction();

            // Se ainda em uso e foram enviados dados de retorno, finalizar
            if ($usage['status'] === 'em_uso' && !empty($data['kmReturn']) && !empty($data['returnTime'])) {
                if ($data['kmReturn'] <= $usage['km_saida']) {
                    $this->db->rollBack();
                    sendError('KM de retorno deve ser maior que KM de saída', 400);
                }
                $finalize = "UPDATE uso_veiculos
                             SET data_hora_retorno = :retorno,
                                 km_retorno = :km,
                                 status = 'finalizado'
                             WHERE id = :id";
                $stf = $this->db->prepare($finalize);
                $stf->bindParam(':retorno', $data['returnTime']);
                $stf->bindParam(':km', $data['kmReturn'], PDO::PARAM_INT);
                $stf->bindParam(':id', $id, PDO::PARAM_INT);
                $stf->execute();

                // Atualizar veículo com km atual e status disponivel
                $getVehicle = "SELECT veiculo_id FROM uso_veiculos WHERE id = :id";
                $stmtGet = $this->db->prepare($getVehicle);
                $stmtGet->bindParam(':id', $id, PDO::PARAM_INT);
                $stmtGet->execute();
                $u = $stmtGet->fetch(PDO::FETCH_ASSOC);

                $upVehicle = "UPDATE veiculos SET status = 'disponivel', km_atual = :km WHERE id = :id";
                $stv = $this->db->prepare($upVehicle);
                $stv->bindParam(':km', $data['kmReturn'], PDO::PARAM_INT);
                $stv->bindParam(':id', $u['veiculo_id'], PDO::PARAM_INT);
                $stv->execute();
            }

            // Upsert na tabela de aprovações
            $userId = $_SESSION['user_id'] ?? null;
            $now = date('Y-m-d H:i:s');

            // Verificar se já existe
            $sel = $this->db->prepare("SELECT id FROM uso_veiculos_aprovacoes WHERE uso_id = :uso_id");
            $sel->bindParam(':uso_id', $id, PDO::PARAM_INT);
            $sel->execute();
            $exists = $sel->fetch(PDO::FETCH_ASSOC);

            if ($exists) {
                $upd = $this->db->prepare("UPDATE uso_veiculos_aprovacoes
                                            SET status = 'aprovado', reason = NULL, approved_by = :by, approved_at = :at
                                            WHERE uso_id = :uso_id");
                $upd->bindParam(':by', $userId, PDO::PARAM_INT);
                $upd->bindParam(':at', $now);
                $upd->bindParam(':uso_id', $id, PDO::PARAM_INT);
                $upd->execute();
            } else {
                $ins = $this->db->prepare("INSERT INTO uso_veiculos_aprovacoes
                                            (uso_id, status, reason, approved_by, approved_at)
                                            VALUES (:uso_id, 'aprovado', NULL, :by, :at)");
                $ins->bindParam(':uso_id', $id, PDO::PARAM_INT);
                $ins->bindParam(':by', $userId, PDO::PARAM_INT);
                $ins->bindParam(':at', $now);
                $ins->execute();
            }

            $this->db->commit();

            // Atualizar custo aproximado
            $this->ensureCostColumn();
            $this->updateCostApprox($id);

            sendResponse([
                'success' => true,
                'message' => 'Rota aprovada com sucesso'
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Approve usage error: " . $e->getMessage());
            sendError('Erro ao aprovar uso', 500);
        }
    }

    /**
     * Rejeitar uso de veículo
     * POST /usage/reject/{id}
     */
    public function reject($id, $data) {
        try {
            if (!$id) sendError('ID do registro não fornecido', 400);
            $this->ensureApprovalTable();

            $reason = isset($data['reason']) ? trim($data['reason']) : null;
            $userId = $_SESSION['user_id'] ?? null;
            $now = date('Y-m-d H:i:s');

            // Upsert rejeição
            $sel = $this->db->prepare("SELECT id FROM uso_veiculos_aprovacoes WHERE uso_id = :uso_id");
            $sel->bindParam(':uso_id', $id, PDO::PARAM_INT);
            $sel->execute();
            $exists = $sel->fetch(PDO::FETCH_ASSOC);

            if ($exists) {
                $upd = $this->db->prepare("UPDATE uso_veiculos_aprovacoes
                                            SET status = 'rejeitado', reason = :reason, approved_by = :by, approved_at = :at
                                            WHERE uso_id = :uso_id");
                $upd->bindParam(':reason', $reason);
                $upd->bindParam(':by', $userId, PDO::PARAM_INT);
                $upd->bindParam(':at', $now);
                $upd->bindParam(':uso_id', $id, PDO::PARAM_INT);
                $upd->execute();
            } else {
                $ins = $this->db->prepare("INSERT INTO uso_veiculos_aprovacoes
                                            (uso_id, status, reason, approved_by, approved_at)
                                            VALUES (:uso_id, 'rejeitado', :reason, :by, :at)");
                $ins->bindParam(':uso_id', $id, PDO::PARAM_INT);
                $ins->bindParam(':reason', $reason);
                $ins->bindParam(':by', $userId, PDO::PARAM_INT);
                $ins->bindParam(':at', $now);
                $ins->execute();
            }

            sendResponse([
                'success' => true,
                'message' => 'Rota rejeitada com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Reject usage error: " . $e->getMessage());
            sendError('Erro ao rejeitar uso', 500);
        }
    }

    /**
     * Deletar registro de uso
     * DELETE /usage/{id}
     */
    public function delete($id) {
        try {
            // Buscar registro antes de deletar
            $getQuery = "SELECT veiculo_id, status FROM uso_veiculos WHERE id = :id";
            $getStmt = $this->db->prepare($getQuery);
            $getStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $getStmt->execute();
            $usage = $getStmt->fetch(PDO::FETCH_ASSOC);

            if (!$usage) {
                sendError('Registro não encontrado', 404);
            }

            $this->db->beginTransaction();

            // Deletar registro
            $query = "DELETE FROM uso_veiculos WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            // Se estava em uso, liberar veículo
            if ($usage['status'] === 'em_uso') {
                $updateVehicle = "UPDATE veiculos SET status = 'disponivel' WHERE id = :id";
                $stmtVehicle = $this->db->prepare($updateVehicle);
                $stmtVehicle->bindParam(':id', $usage['veiculo_id'], PDO::PARAM_INT);
                $stmtVehicle->execute();
            }

            $this->db->commit();

            sendResponse([
                'success' => true,
                'message' => 'Registro removido com sucesso'
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Delete usage error: " . $e->getMessage());
            sendError('Erro ao deletar registro', 500);
        }
    }

    public function getById($id) {
        // Implementação simples
        sendError('Método não implementado', 501);
    }

    public function update($id, $data) {
        // Implementação simples
        sendError('Método não implementado', 501);
    }
}
