<?php
/**
 * Inspections API - Templates Routes
 * GET /inspections/templates - List all templates
 * GET /inspections/templates/{id} - Get specific template
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

// Verificar se é requisição para template específico
$uri = $_SERVER['REQUEST_URI'];
$uriParts = explode('/', trim($uri, '/'));

// Pegar o ID se existir (último segmento da URL)
$templateId = end($uriParts);

if ($templateId && is_numeric($templateId)) {
    // GET /inspections/templates/{id}
    $controller->getTemplate($templateId);
} else {
    // GET /inspections/templates
    $controller->getTemplates();
}
