<?php
/**
 * GET /gps/history/{id}
 * Retorna histórico de rota de uma viagem
 */

// Sessão já iniciada pelo router
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../controllers/GPSController.php';

// Apenas GET é permitido
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

// Obter ID da URL
$usageId = isset($_GET['id']) ? $_GET['id'] : null;

if (empty($usageId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID da viagem é obrigatório']);
    exit;
}

// Criar controller e processar
$controller = new GPSController();
$controller->getRouteHistory($usageId);
