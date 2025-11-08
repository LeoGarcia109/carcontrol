<?php
/**
 * Authentication Controller
 * Gerencia login, logout e autenticação de usuários
 */

class AuthController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Login de usuário
     * POST /auth/login
     */
    public function login($data) {
        try {
            // Validar dados (aceitar email ou username para compatibilidade)
            if ((empty($data['email']) && empty($data['username'])) || empty($data['password'])) {
                sendError('Email/Usuário e senha são obrigatórios', 400);
            }

            $password = $data['password'];
            $email = isset($data['email']) ? trim($data['email']) : null;
            $username = isset($data['username']) ? trim($data['username']) : null;

            // Buscar usuário no banco por email ou username
            if (!empty($email)) {
                $query = "SELECT u.*, m.nome as motorista_nome
                          FROM usuarios u
                          LEFT JOIN motoristas m ON u.motorista_id = m.id
                          WHERE u.email = :identifier AND u.active = 1
                          LIMIT 1";
            } else {
                $query = "SELECT u.*, m.nome as motorista_nome
                          FROM usuarios u
                          LEFT JOIN motoristas m ON u.motorista_id = m.id
                          WHERE u.username = :identifier AND u.active = 1
                          LIMIT 1";
            }

            $stmt = $this->db->prepare($query);
            $identifier = !empty($email) ? $email : $username;
            $stmt->bindParam(':identifier', $identifier);
            $stmt->execute();

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                sendError('Usuário ou senha inválidos', 401);
            }

            // Verificar senha
            // Se a senha começar com $2y$, é bcrypt hash
            if (substr($user['password'], 0, 4) === '$2y$') {
                $passwordValid = password_verify($password, $user['password']);
            } else {
                // Compatibilidade com senhas antigas (texto plano)
                // REMOVER EM PRODUÇÃO
                $passwordValid = ($password === $user['password']);

                // Se válida, atualizar para hash
                if ($passwordValid) {
                    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                    $updateQuery = "UPDATE usuarios SET password = :password WHERE id = :id";
                    $updateStmt = $this->db->prepare($updateQuery);
                    $updateStmt->bindParam(':password', $hashedPassword);
                    $updateStmt->bindParam(':id', $user['id']);
                    $updateStmt->execute();
                }
            }

            if (!$passwordValid) {
                sendError('Usuário ou senha inválidos', 401);
            }

            // Criar sessão
            $_SESSION['user_logged_in'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['motorista_id'] = $user['motorista_id'];
            $_SESSION['last_activity'] = time();

            // Atualizar último login
            $updateLogin = "UPDATE usuarios SET updated_at = NOW() WHERE id = :id";
            $stmtUpdate = $this->db->prepare($updateLogin);
            $stmtUpdate->bindParam(':id', $user['id']);
            $stmtUpdate->execute();

            // Preparar resposta
            $response = [
                'success' => true,
                'message' => 'Login realizado com sucesso',
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'motorista_id' => $user['motorista_id'] ? (int)$user['motorista_id'] : null
                ]
            ];

            sendResponse($response);

        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            sendError('Erro ao realizar login', 500);
        }
    }

    /**
     * Logout de usuário
     * POST /auth/logout
     */
    public function logout() {
        session_destroy();
        sendResponse([
            'success' => true,
            'message' => 'Logout realizado com sucesso'
        ]);
    }

    /**
     * Obter perfil do usuário logado
     * GET /auth/profile
     */
    public function getProfile() {
        try {
            $userId = $_SESSION['user_id'];

            $query = "SELECT u.*, m.nome as motorista_nome, m.photo as motorista_photo
                      FROM usuarios u
                      LEFT JOIN motoristas m ON u.motorista_id = m.id
                      WHERE u.id = :id
                      LIMIT 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $userId);
            $stmt->execute();

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                sendError('Usuário não encontrado', 404);
            }

            $response = [
                'success' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'motorista_id' => $user['motorista_id'] ? (int)$user['motorista_id'] : null,
                    'motorista_nome' => $user['motorista_nome'],
                    'motorista_photo' => $user['motorista_photo'] ? base64_encode($user['motorista_photo']) : null,
                    'created_at' => $user['created_at']
                ]
            ];

            sendResponse($response);

        } catch (Exception $e) {
            error_log("Get profile error: " . $e->getMessage());
            sendError('Erro ao obter perfil', 500);
        }
    }

    /**
     * Verificar se usuário está autenticado
     * GET /auth/check
     */
    public function checkAuth() {
        if (isset($_SESSION['user_id']) && isset($_SESSION['user_logged_in'])) {
            sendResponse([
                'success' => true,
                'authenticated' => true,
                'user' => [
                    'id' => (int)$_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['user_role'],
                    'motorista_id' => $_SESSION['motorista_id'] ?? null
                ]
            ]);
        } else {
            sendResponse([
                'success' => true,
                'authenticated' => false
            ]);
        }
    }
}
