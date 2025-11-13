<?php
/**
 * Inspection Compliance API
 * GET /inspections/compliance/{vehicleId} - Check if vehicle is inspection compliant
 */

require_once '../config/cors.php';
require_once '../config/database.php';

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

// Verificar autenticação
session_start();
if (!isset($_SESSION['user_id'])) {
    sendError('Não autorizado', 401);
}

// Obter ID do veículo da URL
$uri = $_SERVER['REQUEST_URI'];
$uriParts = explode('/', trim($uri, '/'));
$vehicleId = end($uriParts);

if (!is_numeric($vehicleId)) {
    sendError('ID do veículo inválido', 400);
}

try {
    // Configuração de dias para conformidade (7 dias por padrão)
    $INSPECTION_REQUIRED_DAYS = 7;
    $WARNING_DAYS = 5; // Avisar quando tem 5-7 dias

    // Buscar última inspeção do veículo
    $query = "SELECT
                i.id,
                i.data_inspecao as inspectionDate,
                i.status,
                i.tipo as type,
                DATEDIFF(CURRENT_DATE, i.data_inspecao) as daysSinceInspection
              FROM inspecoes i
              WHERE i.veiculo_id = ?
                AND i.tipo = 'pre_viagem'
                AND i.ativo = TRUE
              ORDER BY i.data_inspecao DESC
              LIMIT 1";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$vehicleId]);
    $lastInspection = $stmt->fetch(PDO::FETCH_ASSOC);

    // Calcular status de conformidade
    $response = [
        'success' => true,
        'vehicleId' => (int)$vehicleId,
        'requiredDays' => $INSPECTION_REQUIRED_DAYS,
        'warningDays' => $WARNING_DAYS
    ];

    if ($lastInspection) {
        $daysSince = (int)$lastInspection['daysSinceInspection'];
        $isCompliant = $daysSince <= $INSPECTION_REQUIRED_DAYS;
        $isDueSoon = $daysSince >= $WARNING_DAYS && $daysSince <= $INSPECTION_REQUIRED_DAYS;
        $isOverdue = $daysSince > $INSPECTION_REQUIRED_DAYS;

        $response['compliant'] = $isCompliant;
        $response['status'] = $isOverdue ? 'overdue' : ($isDueSoon ? 'due_soon' : 'ok');
        $response['lastInspection'] = [
            'id' => (int)$lastInspection['id'],
            'date' => $lastInspection['inspectionDate'],
            'daysSince' => $daysSince,
            'status' => $lastInspection['status'],
            'type' => $lastInspection['type']
        ];
        $response['daysOverdue'] = $isOverdue ? ($daysSince - $INSPECTION_REQUIRED_DAYS) : 0;
        $response['daysRemaining'] = $isCompliant ? ($INSPECTION_REQUIRED_DAYS - $daysSince) : 0;

        // Mensagem descritiva
        if ($isOverdue) {
            $response['message'] = "Inspeção vencida há {$response['daysOverdue']} dia(s)";
            $response['severity'] = 'danger';
        } elseif ($isDueSoon) {
            $response['message'] = "Inspeção vence em {$response['daysRemaining']} dia(s)";
            $response['severity'] = 'warning';
        } else {
            $response['message'] = "Inspeção em dia (realizada há $daysSince dia(s))";
            $response['severity'] = 'success';
        }
    } else {
        // Veículo nunca foi inspecionado
        $response['compliant'] = false;
        $response['status'] = 'never_inspected';
        $response['lastInspection'] = null;
        $response['daysOverdue'] = null;
        $response['daysRemaining'] = 0;
        $response['message'] = "Veículo nunca foi inspecionado";
        $response['severity'] = 'danger';
    }

    // Adicionar informações do veículo
    $vehicleQuery = "SELECT placa, marca, modelo FROM veiculos WHERE id = ? AND ativo = TRUE";
    $vehicleStmt = $pdo->prepare($vehicleQuery);
    $vehicleStmt->execute([$vehicleId]);
    $vehicle = $vehicleStmt->fetch(PDO::FETCH_ASSOC);

    if ($vehicle) {
        $response['vehicle'] = $vehicle;
    }

    sendResponse($response);

} catch (Exception $e) {
    error_log("Inspection compliance error: " . $e->getMessage());
    sendError('Erro ao verificar conformidade de inspeção', 500);
}