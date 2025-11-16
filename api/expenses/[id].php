<?php
/**
 * Expenses API - Individual Expense Routes
 * DELETE /expenses/{id} - Delete expense
 */

require_once '../config/cors.php';
require_once '../config/database.php';

// Helper function para enviar respostas JSON
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function sendError($message, $statusCode = 400) {
    sendResponse([
        'success' => false,
        'message' => $message
    ], $statusCode);
}

// Obter ID da URL
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$id = trim($pathInfo, '/');

if (empty($id) || !is_numeric($id)) {
    sendError('ID inválido', 400);
}

// Processar requisição
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'DELETE':
        try {
            // Soft delete
            $stmt = $pdo->prepare("
                UPDATE despesas
                SET ativo = 0
                WHERE id = ?
            ");

            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                sendError('Despesa não encontrada', 404);
            }

            sendResponse([
                'success' => true,
                'message' => 'Despesa excluída com sucesso'
            ]);

        } catch (PDOException $e) {
            error_log("Erro ao excluir despesa: " . $e->getMessage());
            sendError('Erro ao excluir despesa', 500);
        }
        break;

    default:
        sendError('Método não permitido', 405);
}
