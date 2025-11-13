<?php
/**
 * Inspections API - Single Inspection Routes
 * GET /inspections/{id} - Get specific inspection
 * DELETE /inspections/{id} - Delete inspection
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../controllers/InspectionController.php';

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

$controller = new InspectionController($pdo);

// Extrair ID da URL
$uri = $_SERVER['REQUEST_URI'];
$uriParts = explode('/', trim($uri, '/'));
$id = end($uriParts);

if (!is_numeric($id)) {
    sendError('ID inválido', 400);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $controller->getById($id);
        break;

    case 'DELETE':
        $controller->delete($id);
        break;

    default:
        sendError('Método não permitido', 405);
}
