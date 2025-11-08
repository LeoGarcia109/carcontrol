<?php
/**
 * Authentication Middleware
 * Verifica se o usuário está autenticado
 */

function requireAuth() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_logged_in'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Acesso não autorizado. Faça login primeiro.',
            'code' => 'UNAUTHORIZED'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Renovar sessão a cada requisição
    $_SESSION['last_activity'] = time();

    return true;
}

function requireRole($allowedRoles = []) {
    requireAuth();

    if (!isset($_SESSION['user_role'])) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Role não definida',
            'code' => 'FORBIDDEN'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if (!in_array($_SESSION['user_role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Você não tem permissão para acessar este recurso',
            'code' => 'FORBIDDEN'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    return true;
}

function getCurrentUser() {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }

    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'name' => $_SESSION['user_name'] ?? '',
        'email' => $_SESSION['user_email'] ?? '',
        'role' => $_SESSION['user_role'] ?? '',
        'motorista_id' => $_SESSION['motorista_id'] ?? null
    ];
}
