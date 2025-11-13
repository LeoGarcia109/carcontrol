<?php
/**
 * Inspections API - Main Routes
 * GET /inspections - List all inspections
 * POST /inspections - Create new inspection
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../controllers/InspectionController.php';

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

// Instanciar controller
$controller = new InspectionController($pdo);

// Processar requisição
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $controller->getAll();
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError('JSON inválido', 400);
        }
        $controller->create($data);
        break;

    default:
        sendError('Método não permitido', 405);
}
