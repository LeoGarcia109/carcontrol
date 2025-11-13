<?php
/**
 * Inspections API - Statistics
 * GET /inspections/stats - Get inspection statistics
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller->getStats();
} else {
    sendError('Método não permitido', 405);
}
