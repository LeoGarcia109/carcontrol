<?php
/**
 * Maintenance Controller
 * Gerencia registros de manutenção
 */

class MaintenanceController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll() {
        try {
            $query = "SELECT
                        m.id, m.veiculo_id as vehicleId, m.tipo as type,
                        m.descricao as description, m.data_servico as date,
                        m.km_servico as km, m.valor as cost,
                        m.fornecedor as provider, m.nota_fiscal as invoice,
                        m.observacoes as notes,
                        m.created_at as createdAt,
                        v.placa as vehiclePlate, v.marca as vehicleBrand, v.modelo as vehicleModel
                      FROM manutencao m
                      LEFT JOIN veiculos v ON m.veiculo_id = v.id
                      ORDER BY m.data_servico DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($records as &$record) {
                $record['id'] = (int)$record['id'];
                $record['vehicleId'] = (int)$record['vehicleId'];
                $record['km'] = (int)$record['km'];
                $record['cost'] = (float)$record['cost'];
            }

            sendResponse([
                'success' => true,
                'data' => $records,
                'count' => count($records)
            ]);

        } catch (Exception $e) {
            error_log("Get maintenance error: " . $e->getMessage());
            sendError('Erro ao buscar manutenções', 500);
        }
    }

    public function create($data) {
        try {
            if (empty($data['vehicleId']) || empty($data['type']) ||
                empty($data['date']) || empty($data['km'])) {
                sendError('Veículo, tipo, data e KM são obrigatórios', 400);
            }

            $query = "INSERT INTO manutencao
                      (veiculo_id, tipo, descricao, data_servico, km_servico,
                       valor, fornecedor, nota_fiscal, observacoes)
                      VALUES
                      (:veiculo_id, :tipo, :descricao, :data_servico, :km_servico,
                       :valor, :fornecedor, :nota_fiscal, :observacoes)";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(':veiculo_id', $data['vehicleId'], PDO::PARAM_INT);
            $stmt->bindParam(':tipo', $data['type']);
            $stmt->bindParam(':descricao', $data['description']);
            $stmt->bindParam(':data_servico', $data['date']);
            $stmt->bindParam(':km_servico', $data['km'], PDO::PARAM_INT);
            $stmt->bindParam(':valor', $data['cost']);
            $stmt->bindParam(':fornecedor', $data['provider']);
            $stmt->bindParam(':nota_fiscal', $data['invoice']);
            $stmt->bindParam(':observacoes', $data['notes']);

            $stmt->execute();
            $maintenanceId = $this->db->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Manutenção registrada com sucesso',
                'data' => ['id' => (int)$maintenanceId]
            ], 201);

        } catch (Exception $e) {
            error_log("Create maintenance error: " . $e->getMessage());
            sendError('Erro ao criar manutenção', 500);
        }
    }

    public function delete($id) {
        try {
            $query = "DELETE FROM manutencao WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                sendError('Manutenção não encontrada', 404);
            }

            sendResponse([
                'success' => true,
                'message' => 'Manutenção removida com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Delete maintenance error: " . $e->getMessage());
            sendError('Erro ao deletar manutenção', 500);
        }
    }

    public function getAlerts() {
        try {
            // Buscar veículos que precisam de manutenção
            $query = "SELECT
                        v.id, v.placa, v.marca, v.modelo,
                        v.km_atual, v.km_ultima_revisao,
                        (v.km_atual - v.km_ultima_revisao) as km_desde_revisao
                      FROM veiculos v
                      WHERE v.ativo = 1
                      AND (v.km_atual - v.km_ultima_revisao) >= 10000
                      ORDER BY km_desde_revisao DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            sendResponse([
                'success' => true,
                'data' => $alerts,
                'count' => count($alerts)
            ]);

        } catch (Exception $e) {
            error_log("Get maintenance alerts error: " . $e->getMessage());
            sendError('Erro ao buscar alertas', 500);
        }
    }

    public function getById($id) {
        sendError('Método não implementado', 501);
    }
}
