<?php
/**
 * CORS Configuration
 * Configuração de Cross-Origin Resource Sharing
 */

// Permitir requisições do frontend
$allowed_origins = [
    'http://localhost:5179',
    'http://127.0.0.1:5179',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

// Verificar origem da requisição
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    // Para desenvolvimento, refletir a origem quando disponível (necessário para credentials)
    // REMOVER/RESTRINGIR EM PRODUÇÃO
    if (!empty($origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
    } else {
        header("Access-Control-Allow-Origin: *");
    }
}
// Sinalizar que a resposta pode variar por origem (caches/proxies)
header('Vary: Origin');

// Headers permitidos
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Responder a requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
