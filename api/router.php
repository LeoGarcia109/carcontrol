<?php
/**
 * Router para PHP Built-in Server
 * Roteia requisições para os endpoints corretos
 */

// Iniciar sessão
session_start();

// Definir diretório base
define('BASE_DIR', __DIR__);

// Parsear a URL
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Log da requisição
error_log("[$method] $uri");

// Roteamento
$routes = [
    // Main index - all API routes
    '/' => '/index.php',

    // GPS routes (arquivos separados)
    '/gps/active' => '/gps/active.php',
    '/gps/update' => '/gps/update.php',
    '/gps/stop' => '/gps/stop.php'
];

// Rotas com parâmetros dinâmicos (apenas GPS)
$dynamicRoutes = [
    '/gps/history/' => '/gps/history.php',
    '/gps/vehicle/' => '/gps/vehicle.php'
];

// Verificar rota exata
if (isset($routes[$uri])) {
    $file = BASE_DIR . $routes[$uri];
    if (file_exists($file)) {
        require $file;
        return true;
    }
}

// Verificar rotas dinâmicas
foreach ($dynamicRoutes as $pattern => $file) {
    if (strpos($uri, $pattern) === 0) {
        $filePath = BASE_DIR . $file;
        if (file_exists($filePath)) {
            // Extrair ID da URL e disponibilizar via GET
            $id = substr($uri, strlen($pattern));
            $_GET['id'] = $id;
            require $filePath;
            return true;
        }
    }
}

// Se não encontrou rota GPS, passar para index.php (roteador principal)
require BASE_DIR . '/index.php';
exit();
