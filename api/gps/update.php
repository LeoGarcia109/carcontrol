<?php
/**
 * POST /gps/update
 * Atualiza localização GPS do veículo
 */

// Desabilitar exibição de erros HTML (JSON-only API)
ini_set('display_errors', 0);
error_reporting(0);

// Sessão já iniciada pelo router
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../controllers/GPSController.php';

// Apenas POST é permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

// Obter dados do corpo da requisição
$data = json_decode(file_get_contents('php://input'), true);

// Criar controller e processar
$controller = new GPSController();
$controller->updateLocation($data);
