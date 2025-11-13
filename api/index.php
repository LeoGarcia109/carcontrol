<?php
/**
 * CarControl API - Entry Point
 * API REST para gerenciamento de veículos e motoristas
 * Porta: 5000
 */

// Iniciar sessão (se ainda não iniciada)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Incluir configurações
require_once 'config/cors.php';
require_once 'config/database.php';

// Incluir controllers
require_once 'controllers/AuthController.php';
require_once 'controllers/DriverController.php';
require_once 'controllers/VehicleController.php';
require_once 'controllers/UsageController.php';
require_once 'controllers/MaintenanceController.php';
require_once 'controllers/DestinationController.php';
require_once 'controllers/DashboardController.php';
require_once 'controllers/ExpenseController.php';

// Incluir middleware
require_once 'middleware/auth.php';

// Configurar timezone
date_default_timezone_set('America/Sao_Paulo');

// Habilitar exibição de erros em desenvolvimento
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Função para enviar resposta JSON
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// Função para enviar erro
function sendError($message, $statusCode = 400, $details = null) {
    $response = [
        'success' => false,
        'error' => $message
    ];

    if ($details !== null) {
        $response['details'] = $details;
    }

    sendResponse($response, $statusCode);
}

// Obter método HTTP e URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remover /api/ do início da URI se existir
$uri = preg_replace('#^/api#', '', $uri);
$uri = trim($uri, '/');

// Dividir URI em partes
$uriParts = explode('/', $uri);

// Obter dados do corpo da requisição
$input = json_decode(file_get_contents('php://input'), true);

// Instanciar database
$database = new Database();
$db = $database->getConnection();

try {
    // ============================================================
    // ROTEAMENTO DA API
    // ============================================================

    // Rota raiz
    if (empty($uri) || $uri === 'index.php') {
        sendResponse([
            'success' => true,
            'message' => 'CarControl API v1.0',
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoints' => [
                'auth' => '/auth/login, /auth/logout, /auth/profile',
                'drivers' => '/drivers (GET, POST, PUT, DELETE)',
                'vehicles' => '/vehicles (GET, POST, PUT, DELETE)',
                'usage' => '/usage (GET, POST, PUT)',
                'maintenance' => '/maintenance (GET, POST, DELETE)',
                'destinations' => '/destinations (GET, POST, PUT, DELETE), /destinations/geocode (POST)',
                'dashboard' => '/dashboard/stats',
                'gps' => '/gps/active, /gps/history/{id}, /gps/update, /gps/stop, /gps/vehicle/{id}',
                'routes' => '/routes/calculate (POST)',
                'inspections' => '/inspections (GET, POST), /inspections/{id} (GET, DELETE), /inspections/templates, /inspections/pending, /inspections/stats, /inspections/vehicle/{id}'
            ]
        ]);
    }

    // ============================================================
    // ROTAS DE AUTENTICAÇÃO (sem middleware)
    // ============================================================

    if ($uriParts[0] === 'auth') {
        $authController = new AuthController($db);

        switch ($uriParts[1] ?? '') {
            case 'login':
                if ($method === 'POST') {
                    $authController->login($input);
                }
                break;

            case 'logout':
                if ($method === 'POST') {
                    $authController->logout();
                }
                break;

            case 'profile':
                if ($method === 'GET') {
                    requireAuth(); // Requer autenticação
                    $authController->getProfile();
                }
                break;

            case 'check':
                if ($method === 'GET') {
                    $authController->checkAuth();
                }
                break;

            default:
                sendError('Rota de autenticação não encontrada', 404);
        }
        exit();
    }

    // ============================================================
    // MIDDLEWARE - Todas as rotas abaixo requerem autenticação
    // ============================================================
    requireAuth();

    // ============================================================
    // ROTAS DE MOTORISTAS
    // ============================================================

    if ($uriParts[0] === 'drivers') {
        $driverController = new DriverController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1])) {
                    // GET /drivers/{id}
                    $driverController->getById($uriParts[1]);
                } else {
                    // GET /drivers
                    $driverController->getAll();
                }
                break;

            case 'POST':
                // POST /drivers
                $driverController->create($input);
                break;

            case 'PUT':
                // PUT /drivers/{id}
                if (isset($uriParts[1])) {
                    $driverController->update($uriParts[1], $input);
                } else {
                    sendError('ID do motorista não fornecido', 400);
                }
                break;

            case 'DELETE':
                // DELETE /drivers/{id}
                if (isset($uriParts[1])) {
                    $driverController->delete($uriParts[1]);
                } else {
                    sendError('ID do motorista não fornecido', 400);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE VEÍCULOS
    // ============================================================

    if ($uriParts[0] === 'vehicles') {
        $vehicleController = new VehicleController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1])) {
                    // GET /vehicles/{id}
                    $vehicleController->getById($uriParts[1]);
                } else {
                    // GET /vehicles
                    $vehicleController->getAll();
                }
                break;

            case 'POST':
                // POST /vehicles
                $vehicleController->create($input);
                break;

            case 'PUT':
                // PUT /vehicles/{id}
                if (isset($uriParts[1])) {
                    $vehicleController->update($uriParts[1], $input);
                } else {
                    sendError('ID do veículo não fornecido', 400);
                }
                break;

            case 'DELETE':
                // DELETE /vehicles/{id}
                if (isset($uriParts[1])) {
                    $vehicleController->delete($uriParts[1]);
                } else {
                    sendError('ID do veículo não fornecido', 400);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE USO DE VEÍCULOS
    // ============================================================

    if ($uriParts[0] === 'usage') {
        $usageController = new UsageController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1]) && $uriParts[1] === 'active') {
                    // GET /usage/active
                    $usageController->getActive();
                } else if (isset($uriParts[1])) {
                    // GET /usage/{id}
                    $usageController->getById($uriParts[1]);
                } else {
                    // GET /usage
                    $usageController->getAll();
                }
                break;

            case 'POST':
                if (isset($uriParts[1]) && $uriParts[1] === 'finalize') {
                    // POST /usage/finalize/{id}
                    $usageController->finalize($uriParts[2] ?? null, $input);
                } else if (isset($uriParts[1]) && $uriParts[1] === 'approve') {
                    // POST /usage/approve/{id}
                    $usageController->approve($uriParts[2] ?? null, $input);
                } else if (isset($uriParts[1]) && $uriParts[1] === 'reject') {
                    // POST /usage/reject/{id}
                    $usageController->reject($uriParts[2] ?? null, $input);
                } else {
                    // POST /usage
                    $usageController->create($input);
                }
                break;

            case 'PUT':
                // PUT /usage/{id}
                if (isset($uriParts[1])) {
                    $usageController->update($uriParts[1], $input);
                } else {
                    sendError('ID do registro não fornecido', 400);
                }
                break;

            case 'DELETE':
                // DELETE /usage/{id}
                if (isset($uriParts[1])) {
                    $usageController->delete($uriParts[1]);
                } else {
                    sendError('ID do registro não fornecido', 400);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE MANUTENÇÃO
    // ============================================================

    if ($uriParts[0] === 'maintenance') {
        $maintenanceController = new MaintenanceController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1]) && $uriParts[1] === 'alerts') {
                    // GET /maintenance/alerts
                    $maintenanceController->getAlerts();
                } else if (isset($uriParts[1])) {
                    // GET /maintenance/{id}
                    $maintenanceController->getById($uriParts[1]);
                } else {
                    // GET /maintenance
                    $maintenanceController->getAll();
                }
                break;

            case 'POST':
                // POST /maintenance
                $maintenanceController->create($input);
                break;

            case 'DELETE':
                // DELETE /maintenance/{id}
                if (isset($uriParts[1])) {
                    $maintenanceController->delete($uriParts[1]);
                } else {
                    sendError('ID do registro não fornecido', 400);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE DESTINOS
    // ============================================================

    if ($uriParts[0] === 'destinations') {
        // Rota especial: POST /destinations/geocode
        if (isset($uriParts[1]) && $uriParts[1] === 'geocode' && $method === 'POST') {
            require_once 'services/GeocodingService.php';

            $address = $input['address'] ?? '';

            if (empty($address)) {
                sendError('Endereço é obrigatório', 400);
            }

            $result = GeocodingService::geocodeAddress($address);

            if ($result === false) {
                sendResponse([
                    'success' => false,
                    'message' => 'Endereço não encontrado. Tente ajustar ou usar o mapa.'
                ]);
            } else {
                sendResponse([
                    'success' => true,
                    'latitude' => $result['latitude'],
                    'longitude' => $result['longitude'],
                    'formatted_address' => $result['display_name']
                ]);
            }
            exit();
        }

        // Rotas normais de CRUD
        $destinationController = new DestinationController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1])) {
                    $destinationController->getById($uriParts[1]);
                } else {
                    $destinationController->getAll();
                }
                break;

            case 'POST':
                $destinationController->create($input);
                break;

            case 'PUT':
                if (isset($uriParts[1])) {
                    $destinationController->update($uriParts[1], $input);
                } else {
                    sendError('ID do destino não fornecido', 400);
                }
                break;

            case 'DELETE':
                if (isset($uriParts[1])) {
                    $destinationController->delete($uriParts[1]);
                } else {
                    sendError('ID do destino não fornecido', 400);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE DASHBOARD
    // ============================================================

    if ($uriParts[0] === 'dashboard') {
        $dashboardController = new DashboardController($db);

        if ($method === 'GET' && ($uriParts[1] ?? '') === 'stats') {
            $dashboardController->getStats();
        } else {
            sendError('Rota de dashboard não encontrada', 404);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE DESPESAS
    // ============================================================

    if ($uriParts[0] === 'expenses') {
        $expenseController = new ExpenseController($db);

        switch ($method) {
            case 'GET':
                $expenseController->getAll();
                break;
            case 'POST':
                $expenseController->create($input);
                break;
            case 'DELETE':
                if (isset($uriParts[1])) {
                    $expenseController->delete($uriParts[1]);
                } else {
                    sendError('ID da despesa não fornecido', 400);
                }
                break;
            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE GPS TRACKING
    // ============================================================

    if ($uriParts[0] === 'gps') {
        require_once 'controllers/GPSController.php';
        $gpsController = new GPSController($db);

        switch ($method) {
            case 'GET':
                if (isset($uriParts[1]) && $uriParts[1] === 'active') {
                    // GET /gps/active
                    $gpsController->getActiveVehicles();
                } else if (isset($uriParts[1]) && $uriParts[1] === 'history' && isset($uriParts[2])) {
                    // GET /gps/history/{id}
                    $gpsController->getRouteHistory($uriParts[2]);
                } else if (isset($uriParts[1]) && $uriParts[1] === 'vehicle' && isset($uriParts[2])) {
                    // GET /gps/vehicle/{id}
                    $gpsController->getVehicleLocation($uriParts[2]);
                } else {
                    sendError('Rota GPS não encontrada', 404);
                }
                break;

            case 'POST':
                if (isset($uriParts[1]) && $uriParts[1] === 'update') {
                    // POST /gps/update
                    $gpsController->updateLocation($input);
                } else if (isset($uriParts[1]) && $uriParts[1] === 'stop') {
                    // POST /gps/stop
                    $gpsController->stopTracking($input);
                } else {
                    sendError('Rota GPS não encontrada', 404);
                }
                break;

            default:
                sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE CÁLCULO DE ROTAS (ROUTING)
    // ============================================================

    if ($uriParts[0] === 'routes' && isset($uriParts[1]) && $uriParts[1] === 'calculate') {
        if ($method === 'POST') {
            require_once 'services/RoutingService.php';

            $fromLat = $input['fromLat'] ?? null;
            $fromLon = $input['fromLon'] ?? null;
            $toLat = $input['toLat'] ?? null;
            $toLon = $input['toLon'] ?? null;

            if (!$fromLat || !$fromLon || !$toLat || !$toLon) {
                sendError('Coordenadas de origem e destino são obrigatórias', 400);
            }

            $route = RoutingService::calculateRoute($fromLat, $fromLon, $toLat, $toLon);

            if ($route === false) {
                sendResponse([
                    'success' => false,
                    'message' => 'Não foi possível calcular a rota. Verifique as coordenadas.'
                ]);
            } else {
                sendResponse([
                    'success' => true,
                    'route' => $route
                ]);
            }
        } else {
            sendError('Método não permitido', 405);
        }
        exit();
    }

    // ============================================================
    // ROTAS DE INSPEÇÕES
    // ============================================================
    if ($uriParts[0] === 'inspections') {
        require_once 'controllers/InspectionController.php';
        $inspectionController = new InspectionController($db);

        // GET /inspections/templates
        if (isset($uriParts[1]) && $uriParts[1] === 'templates') {
            if ($method === 'GET') {
                // GET /inspections/templates/{id}
                if (isset($uriParts[2]) && is_numeric($uriParts[2])) {
                    $inspectionController->getTemplate($uriParts[2]);
                } else {
                    // GET /inspections/templates
                    $inspectionController->getTemplates();
                }
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }

        // GET /inspections/pending
        if (isset($uriParts[1]) && $uriParts[1] === 'pending') {
            if ($method === 'GET') {
                $inspectionController->getPending();
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }

        // GET /inspections/stats
        if (isset($uriParts[1]) && $uriParts[1] === 'stats') {
            if ($method === 'GET') {
                $inspectionController->getStats();
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }

        // GET /inspections/vehicle/{id}
        if (isset($uriParts[1]) && $uriParts[1] === 'vehicle' && isset($uriParts[2])) {
            if ($method === 'GET') {
                $inspectionController->getByVehicle($uriParts[2]);
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }

        // GET /inspections/{id} ou DELETE /inspections/{id}
        if (isset($uriParts[1]) && is_numeric($uriParts[1])) {
            if ($method === 'GET') {
                $inspectionController->getById($uriParts[1]);
            } elseif ($method === 'DELETE') {
                $inspectionController->delete($uriParts[1]);
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }

        // GET /inspections ou POST /inspections
        if (count($uriParts) === 1) {
            if ($method === 'GET') {
                $inspectionController->getAll();
            } elseif ($method === 'POST') {
                $inspectionController->create($input);
            } else {
                sendError('Método não permitido', 405);
            }
            exit();
        }
    }

    // Rota não encontrada
    sendError('Endpoint não encontrado', 404);

} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    sendError('Erro interno do servidor: ' . $e->getMessage(), 500);
}
