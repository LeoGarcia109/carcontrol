<?php
/**
 * Destination Controller
 * Gerencia destinos/locais frequentes
 */

class DestinationController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll() {
        try {
            $query = "SELECT
                        id, nome as name, endereco as address,
                        distancia_km as distanceKm, observacoes as notes,
                        ativo as active, created_at as createdAt
                      FROM destinos
                      WHERE ativo = 1
                      ORDER BY nome ASC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $destinations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($destinations as &$dest) {
                $dest['id'] = (int)$dest['id'];
                $dest['distanceKm'] = $dest['distanceKm'] ? (int)$dest['distanceKm'] : null;
            }

            sendResponse([
                'success' => true,
                'data' => $destinations,
                'count' => count($destinations)
            ]);

        } catch (Exception $e) {
            error_log("Get destinations error: " . $e->getMessage());
            sendError('Erro ao buscar destinos', 500);
        }
    }

    public function create($data) {
        try {
            if (empty($data['name'])) {
                sendError('Nome do destino é obrigatório', 400);
            }

            $query = "INSERT INTO destinos
                      (nome, endereco, distancia_km, observacoes, ativo)
                      VALUES
                      (:nome, :endereco, :distancia_km, :observacoes, 1)";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(':nome', $data['name']);
            $stmt->bindParam(':endereco', $data['address']);
            $stmt->bindParam(':distancia_km', $data['distance']);
            $stmt->bindParam(':observacoes', $data['notes']);

            $stmt->execute();
            $destinationId = $this->db->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Destino cadastrado com sucesso',
                'data' => ['id' => (int)$destinationId]
            ], 201);

        } catch (Exception $e) {
            error_log("Create destination error: " . $e->getMessage());
            sendError('Erro ao criar destino', 500);
        }
    }

    public function update($id, $data) {
        try {
            $updates = [];
            $params = [':id' => $id];

            if (isset($data['name'])) {
                $updates[] = "nome = :nome";
                $params[':nome'] = $data['name'];
            }
            if (isset($data['address'])) {
                $updates[] = "endereco = :endereco";
                $params[':endereco'] = $data['address'];
            }
            if (isset($data['distance'])) {
                $updates[] = "distancia_km = :distancia_km";
                $params[':distancia_km'] = $data['distance'];
            }

            if (empty($updates)) {
                sendError('Nenhum campo para atualizar', 400);
            }

            $query = "UPDATE destinos SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->db->prepare($query);

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }

            $stmt->execute();

            sendResponse([
                'success' => true,
                'message' => 'Destino atualizado com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Update destination error: " . $e->getMessage());
            sendError('Erro ao atualizar destino', 500);
        }
    }

    public function delete($id) {
        try {
            $query = "UPDATE destinos SET ativo = 0 WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                sendError('Destino não encontrado', 404);
            }

            sendResponse([
                'success' => true,
                'message' => 'Destino removido com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Delete destination error: " . $e->getMessage());
            sendError('Erro ao deletar destino', 500);
        }
    }

    public function getById($id) {
        sendError('Método não implementado', 501);
    }
}
