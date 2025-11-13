<?php
/**
 * Inspections API - Pending Inspections
 * GET /inspections/pending - Get pending/overdue inspections
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
    $controller->getPending();
} else {
    sendError('Método não permitido', 405);
}
