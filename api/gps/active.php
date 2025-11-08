<?php
/**
 * GET /gps/active
 * Retorna veículos ativos com última localização
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

// Criar controller e processar
$controller = new GPSController();
$controller->getActiveVehicles();
