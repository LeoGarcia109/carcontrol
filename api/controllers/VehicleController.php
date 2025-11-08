<?php
/**
 * Vehicle Controller
 * Gerencia CRUD de veículos com upload de foto
 */

class VehicleController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Listar todos os veículos
     * GET /vehicles
     */
    public function getAll() {
        try {
            $query = "SELECT
                        id, placa as plate, marca as brand, modelo as model,
                        ano as year, cor as color, combustivel as fuel,
                        chassi, renavam, km_atual as currentKm,
                        km_ultima_revisao as lastMaintenanceKm,
                        status, data_ultima_manutencao as lastMaintenanceDate,
                        data_proxima_revisao as nextReviewDate,
                        valor_fipe, observacoes as notes, photo, photo_type,
                        ativo, created_at as createdAt, updated_at as updatedAt
                      FROM veiculos
                      WHERE ativo = 1
                      ORDER BY placa ASC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Converter foto para base64
            foreach ($vehicles as &$vehicle) {
                if ($vehicle['photo']) {
                    $vehicle['photo'] = base64_encode($vehicle['photo']);
                }
                $vehicle['id'] = (int)$vehicle['id'];
                $vehicle['year'] = (int)$vehicle['year'];
                $vehicle['currentKm'] = (int)$vehicle['currentKm'];
                $vehicle['lastMaintenanceKm'] = (int)$vehicle['lastMaintenanceKm'];
            }

            sendResponse([
                'success' => true,
                'data' => $vehicles,
                'count' => count($vehicles)
            ]);

        } catch (Exception $e) {
            error_log("Get vehicles error: " . $e->getMessage());
            sendError('Erro ao buscar veículos', 500);
        }
    }

    /**
     * Buscar veículo por ID
     * GET /vehicles/{id}
     */
    public function getById($id) {
        try {
            $query = "SELECT * FROM veiculos WHERE id = :id AND ativo = 1 LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$vehicle) {
                sendError('Veículo não encontrado', 404);
            }

            if ($vehicle['photo']) {
                $vehicle['photo'] = base64_encode($vehicle['photo']);
            }

            sendResponse([
                'success' => true,
                'data' => $vehicle
            ]);

        } catch (Exception $e) {
            error_log("Get vehicle error: " . $e->getMessage());
            sendError('Erro ao buscar veículo', 500);
        }
    }

    /**
     * Criar novo veículo
     * POST /vehicles
     */
    public function create($data) {
        try {
            // Validar dados obrigatórios
            if (empty($data['plate']) || empty($data['brand']) ||
                empty($data['model']) || empty($data['year'])) {
                sendError('Placa, marca, modelo e ano são obrigatórios', 400);
            }

            // Verificar se placa já existe (apenas veículos ativos)
            $checkQuery = "SELECT id FROM veiculos WHERE placa = :placa AND ativo = 1 LIMIT 1";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':placa', $data['plate']);
            $checkStmt->execute();

            if ($checkStmt->fetch()) {
                sendError('Já existe um veículo com esta placa', 400);
            }

            // Processar foto
            $photoData = null;
            $photoType = null;

            if (!empty($data['photo'])) {
                $photo = $data['photo'];
                if (preg_match('/^data:image\/(\w+);base64,/', $photo, $matches)) {
                    $photoType = $matches[1];
                    $photo = substr($photo, strpos($photo, ',') + 1);
                }
                $photoData = base64_decode($photo);
            }

            // Inserir veículo
            $query = "INSERT INTO veiculos
                      (placa, marca, modelo, ano, cor, combustivel, chassi, renavam,
                       km_atual, km_ultima_revisao, status, observacoes,
                       photo, photo_type, ativo)
                      VALUES
                      (:placa, :marca, :modelo, :ano, :cor, :combustivel, :chassi, :renavam,
                       :km_atual, :km_ultima_revisao, :status, :observacoes,
                       :photo, :photo_type, 1)";

            $stmt = $this->db->prepare($query);

            // Campos opcionais com valores default null
            $color = $data['color'] ?? null;
            $fuel = $data['fuel'] ?? null;
            $chassi = $data['chassi'] ?? null;
            $renavam = $data['renavam'] ?? null;
            $notes = $data['notes'] ?? null;

            $stmt->bindParam(':placa', $data['plate']);
            $stmt->bindParam(':marca', $data['brand']);
            $stmt->bindParam(':modelo', $data['model']);
            $stmt->bindParam(':ano', $data['year'], PDO::PARAM_INT);
            $stmt->bindParam(':cor', $color);
            $stmt->bindParam(':combustivel', $fuel);
            $stmt->bindParam(':chassi', $chassi);
            $stmt->bindParam(':renavam', $renavam);

            $km = $data['currentKm'] ?? 0;
            $stmt->bindParam(':km_atual', $km, PDO::PARAM_INT);

            $lastKm = $data['lastMaintenanceKm'] ?? 0;
            $stmt->bindParam(':km_ultima_revisao', $lastKm, PDO::PARAM_INT);

            $status = $data['status'] ?? 'disponivel';
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':observacoes', $notes);
            $stmt->bindParam(':photo', $photoData, PDO::PARAM_LOB);
            $stmt->bindParam(':photo_type', $photoType);

            $stmt->execute();
            $vehicleId = $this->db->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Veículo cadastrado com sucesso',
                'data' => [
                    'id' => (int)$vehicleId,
                    'plate' => $data['plate']
                ]
            ], 201);

        } catch (Exception $e) {
            error_log("Create vehicle error: " . $e->getMessage());
            sendError('Erro ao criar veículo', 500);
        }
    }

    /**
     * Atualizar veículo
     * PUT /vehicles/{id}
     */
    public function update($id, $data) {
        try {
            // Verificar se veículo existe
            $checkQuery = "SELECT id FROM veiculos WHERE id = :id LIMIT 1";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();

            if (!$checkStmt->fetch()) {
                sendError('Veículo não encontrado', 404);
            }

            // Processar foto se existir
            $photoData = null;
            $photoType = null;

            if (isset($data['photo']) && !empty($data['photo'])) {
                $photo = $data['photo'];
                if (preg_match('/^data:image\/(\w+);base64,/', $photo, $matches)) {
                    $photoType = $matches[1];
                    $photo = substr($photo, strpos($photo, ',') + 1);
                }
                $photoData = base64_decode($photo);
            }

            // Construir query dinamicamente
            $updates = [];
            $params = [':id' => $id];

            $fieldMap = [
                'plate' => 'placa',
                'brand' => 'marca',
                'model' => 'modelo',
                'year' => 'ano',
                'color' => 'cor',
                'fuel' => 'combustivel',
                'currentKm' => 'km_atual',
                'status' => 'status',
                'notes' => 'observacoes'
            ];

            foreach ($fieldMap as $jsonField => $dbField) {
                if (isset($data[$jsonField])) {
                    $updates[] = "$dbField = :$dbField";
                    $params[":$dbField"] = $data[$jsonField];
                }
            }

            if ($photoData !== null) {
                $updates[] = "photo = :photo";
                $updates[] = "photo_type = :photo_type";
                $params[':photo'] = $photoData;
                $params[':photo_type'] = $photoType;
            }

            if (empty($updates)) {
                sendError('Nenhum campo para atualizar', 400);
            }

            $query = "UPDATE veiculos SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->db->prepare($query);

            foreach ($params as $key => $value) {
                if ($key === ':photo') {
                    $stmt->bindParam($key, $params[$key], PDO::PARAM_LOB);
                } else {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();

            sendResponse([
                'success' => true,
                'message' => 'Veículo atualizado com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Update vehicle error: " . $e->getMessage());
            sendError('Erro ao atualizar veículo', 500);
        }
    }

    /**
     * Deletar veículo
     * DELETE /vehicles/{id}
     */
    public function delete($id) {
        try {
            $query = "UPDATE veiculos SET ativo = 0 WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                sendError('Veículo não encontrado', 404);
            }

            sendResponse([
                'success' => true,
                'message' => 'Veículo removido com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Delete vehicle error: " . $e->getMessage());
            sendError('Erro ao deletar veículo', 500);
        }
    }
}
