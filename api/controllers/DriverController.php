<?php
/**
 * Driver Controller
 * Gerencia CRUD de motoristas com upload de foto em base64
 */

class DriverController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Listar todos os motoristas
     * GET /drivers
     */
    public function getAll() {
        try {
            $query = "SELECT
                        id, nome as name, cnh, categoria_cnh,
                        validade_cnh as cnhExpiry, telefone as phone,
                        celular, email, cpf, rg, endereco,
                        data_nascimento, estado_civil, ativo as status,
                        observacoes, photo, photo_type,
                        created_at as createdAt, updated_at as updatedAt
                      FROM motoristas
                      WHERE ativo = 1
                      ORDER BY nome ASC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $drivers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Converter foto para base64
            foreach ($drivers as &$driver) {
                if ($driver['photo']) {
                    $driver['photo'] = base64_encode($driver['photo']);
                }
                $driver['id'] = (int)$driver['id'];
                $driver['status'] = $driver['status'] ? 'ativo' : 'inativo';
            }

            sendResponse([
                'success' => true,
                'data' => $drivers,
                'count' => count($drivers)
            ]);

        } catch (Exception $e) {
            error_log("Get drivers error: " . $e->getMessage());
            sendError('Erro ao buscar motoristas', 500);
        }
    }

    /**
     * Buscar motorista por ID
     * GET /drivers/{id}
     */
    public function getById($id) {
        try {
            $query = "SELECT
                        id, nome as name, cnh, categoria_cnh,
                        validade_cnh as cnhExpiry, telefone as phone,
                        celular, email, cpf, rg, endereco,
                        data_nascimento, estado_civil, ativo as status,
                        observacoes, photo, photo_type,
                        created_at as createdAt, updated_at as updatedAt
                      FROM motoristas
                      WHERE id = :id
                      LIMIT 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $driver = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$driver) {
                sendError('Motorista não encontrado', 404);
            }

            // Converter foto para base64
            if ($driver['photo']) {
                $driver['photo'] = base64_encode($driver['photo']);
            }
            $driver['id'] = (int)$driver['id'];
            $driver['status'] = $driver['status'] ? 'ativo' : 'inativo';

            sendResponse([
                'success' => true,
                'data' => $driver
            ]);

        } catch (Exception $e) {
            error_log("Get driver error: " . $e->getMessage());
            sendError('Erro ao buscar motorista', 500);
        }
    }

    /**
     * Criar novo motorista
     * POST /drivers
     */
    public function create($data) {
        try {
            // Validar dados obrigatórios
            if (empty($data['name']) || empty($data['cnh']) || empty($data['cnhExpiry']) ||
                empty($data['phone']) || empty($data['email']) || empty($data['password'])) {
                sendError('Nome, CNH, validade CNH, telefone, email e senha são obrigatórios', 400);
            }

            // Verificar se CNH já existe
            $checkQuery = "SELECT id FROM motoristas WHERE cnh = :cnh LIMIT 1";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':cnh', $data['cnh']);
            $checkStmt->execute();

            if ($checkStmt->fetch()) {
                sendError('Já existe um motorista com esta CNH', 400);
            }

            // Verificar se email já existe
            if (!empty($data['email'])) {
                $checkEmailQuery = "SELECT id FROM motoristas WHERE email = :email LIMIT 1";
                $checkEmailStmt = $this->db->prepare($checkEmailQuery);
                $checkEmailStmt->bindParam(':email', $data['email']);
                $checkEmailStmt->execute();

                if ($checkEmailStmt->fetch()) {
                    sendError('Já existe um motorista com este email', 400);
                }

                // Verificar também na tabela de usuários
                $checkUserQuery = "SELECT id FROM usuarios WHERE email = :email LIMIT 1";
                $checkUserStmt = $this->db->prepare($checkUserQuery);
                $checkUserStmt->bindParam(':email', $data['email']);
                $checkUserStmt->execute();

                if ($checkUserStmt->fetch()) {
                    sendError('Este email já está em uso no sistema', 400);
                }
            }

            // Processar foto se existir
            $photoData = null;
            $photoType = null;

            if (!empty($data['photo'])) {
                // Se é base64, remover prefixo data:image/...;base64,
                $photo = $data['photo'];
                if (preg_match('/^data:image\/(\w+);base64,/', $photo, $matches)) {
                    $photoType = $matches[1];
                    $photo = substr($photo, strpos($photo, ',') + 1);
                }
                $photoData = base64_decode($photo);

                if ($photoData === false) {
                    sendError('Foto em formato inválido', 400);
                }
            }

            // Iniciar transação
            $this->db->beginTransaction();

            // Inserir motorista
            $query = "INSERT INTO motoristas
                      (nome, cnh, categoria_cnh, validade_cnh, telefone, celular,
                       email, cpf, rg, endereco, data_nascimento, estado_civil,
                       observacoes, photo, photo_type, ativo)
                      VALUES
                      (:nome, :cnh, :categoria_cnh, :validade_cnh, :telefone, :celular,
                       :email, :cpf, :rg, :endereco, :data_nascimento, :estado_civil,
                       :observacoes, :photo, :photo_type, 1)";

            $stmt = $this->db->prepare($query);

            // Campos opcionais com valores default null
            $categoria_cnh = $data['categoria_cnh'] ?? null;
            $celular = $data['celular'] ?? null;
            $cpf = $data['cpf'] ?? null;
            $rg = $data['rg'] ?? null;
            $endereco = $data['endereco'] ?? null;
            $data_nascimento = $data['data_nascimento'] ?? null;
            $estado_civil = $data['estado_civil'] ?? null;
            $observacoes = $data['observacoes'] ?? null;

            $stmt->bindParam(':nome', $data['name']);
            $stmt->bindParam(':cnh', $data['cnh']);
            $stmt->bindParam(':categoria_cnh', $categoria_cnh);
            $stmt->bindParam(':validade_cnh', $data['cnhExpiry']);
            $stmt->bindParam(':telefone', $data['phone']);
            $stmt->bindParam(':celular', $celular);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':cpf', $cpf);
            $stmt->bindParam(':rg', $rg);
            $stmt->bindParam(':endereco', $endereco);
            $stmt->bindParam(':data_nascimento', $data_nascimento);
            $stmt->bindParam(':estado_civil', $estado_civil);
            $stmt->bindParam(':observacoes', $observacoes);
            $stmt->bindParam(':photo', $photoData, PDO::PARAM_LOB);
            $stmt->bindParam(':photo_type', $photoType);

            $stmt->execute();
            $motoristaId = $this->db->lastInsertId();

            // Criar usuário para o motorista
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);

            $userQuery = "INSERT INTO usuarios
                          (username, password, name, email, role, motorista_id, active)
                          VALUES
                          (:username, :password, :name, :email, 'motorista', :motorista_id, 1)";

            $userStmt = $this->db->prepare($userQuery);

            $userStmt->bindParam(':username', $data['email']); // email como username
            $userStmt->bindParam(':password', $hashedPassword);
            $userStmt->bindParam(':name', $data['name']);
            $userStmt->bindParam(':email', $data['email']);
            $userStmt->bindParam(':motorista_id', $motoristaId, PDO::PARAM_INT);

            $userStmt->execute();

            // Commit da transação
            $this->db->commit();

            sendResponse([
                'success' => true,
                'message' => 'Motorista cadastrado com sucesso',
                'data' => [
                    'id' => (int)$motoristaId,
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'username' => $data['email']
                ]
            ], 201);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Create driver error: " . $e->getMessage());
            sendError('Erro ao criar motorista: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Atualizar motorista
     * PUT /drivers/{id}
     */
    public function update($id, $data) {
        try {
            // Verificar se motorista existe
            $checkQuery = "SELECT id FROM motoristas WHERE id = :id LIMIT 1";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();

            if (!$checkStmt->fetch()) {
                sendError('Motorista não encontrado', 404);
            }

            // Verificar CNH duplicada
            if (!empty($data['cnh'])) {
                $checkCnhQuery = "SELECT id FROM motoristas WHERE cnh = :cnh AND id != :id LIMIT 1";
                $checkCnhStmt = $this->db->prepare($checkCnhQuery);
                $checkCnhStmt->bindParam(':cnh', $data['cnh']);
                $checkCnhStmt->bindParam(':id', $id, PDO::PARAM_INT);
                $checkCnhStmt->execute();

                if ($checkCnhStmt->fetch()) {
                    sendError('Já existe outro motorista com esta CNH', 400);
                }
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

                if ($photoData === false) {
                    sendError('Foto em formato inválido', 400);
                }
            }

            // Construir query de atualização dinamicamente
            $updates = [];
            $params = [':id' => $id];

            if (isset($data['name'])) {
                $updates[] = "nome = :nome";
                $params[':nome'] = $data['name'];
            }
            if (isset($data['cnh'])) {
                $updates[] = "cnh = :cnh";
                $params[':cnh'] = $data['cnh'];
            }
            if (isset($data['cnhExpiry'])) {
                $updates[] = "validade_cnh = :validade_cnh";
                $params[':validade_cnh'] = $data['cnhExpiry'];
            }
            if (isset($data['phone'])) {
                $updates[] = "telefone = :telefone";
                $params[':telefone'] = $data['phone'];
            }
            if (isset($data['email'])) {
                $updates[] = "email = :email";
                $params[':email'] = $data['email'];
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

            $query = "UPDATE motoristas SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->db->prepare($query);

            foreach ($params as $key => $value) {
                if ($key === ':photo') {
                    $stmt->bindParam($key, $params[$key], PDO::PARAM_LOB);
                } else {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();

            // Atualizar usuário se senha foi alterada
            if (!empty($data['password'])) {
                $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
                $userUpdateQuery = "UPDATE usuarios SET password = :password WHERE motorista_id = :motorista_id";
                $userUpdateStmt = $this->db->prepare($userUpdateQuery);
                $userUpdateStmt->bindParam(':password', $hashedPassword);
                $userUpdateStmt->bindParam(':motorista_id', $id, PDO::PARAM_INT);
                $userUpdateStmt->execute();
            }

            sendResponse([
                'success' => true,
                'message' => 'Motorista atualizado com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Update driver error: " . $e->getMessage());
            sendError('Erro ao atualizar motorista', 500);
        }
    }

    /**
     * Deletar motorista
     * DELETE /drivers/{id}
     */
    public function delete($id) {
        try {
            // Soft delete - apenas marca como inativo
            $query = "UPDATE motoristas SET ativo = 0 WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                sendError('Motorista não encontrado', 404);
            }

            // Desativar usuário também
            $userQuery = "UPDATE usuarios SET active = 0 WHERE motorista_id = :motorista_id";
            $userStmt = $this->db->prepare($userQuery);
            $userStmt->bindParam(':motorista_id', $id, PDO::PARAM_INT);
            $userStmt->execute();

            sendResponse([
                'success' => true,
                'message' => 'Motorista removido com sucesso'
            ]);

        } catch (Exception $e) {
            error_log("Delete driver error: " . $e->getMessage());
            sendError('Erro ao deletar motorista', 500);
        }
    }
}
