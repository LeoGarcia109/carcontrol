<?php
/**
 * Inspections API - Vehicle Inspections
 * GET /inspections/vehicle/{vehicleId} - Get inspections by vehicle
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

// Extrair ID do veículo da URL
$uri = $_SERVER['REQUEST_URI'];
$uriParts = explode('/', trim($uri, '/'));
$vehicleId = end($uriParts);

if (!is_numeric($vehicleId)) {
    sendError('ID do veículo inválido', 400);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller->getByVehicle($vehicleId);
} else {
    sendError('Método não permitido', 405);
}
