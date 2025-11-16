<?php
/**
 * Vehicle Inspection Status API
 * GET /inspections/vehicle-status - Get inspection status for all vehicles
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
if (!isset($_SESSION['user_id'])) {
    sendError('Não autorizado', 401);
}

try {
    // Configuração de dias para conformidade
    $INSPECTION_REQUIRED_DAYS = 7;
    $WARNING_DAYS = 5;

    // Buscar status de inspeção para todos os veículos ativos
    $query = "SELECT
                v.id,
                v.placa,
                v.marca,
                v.modelo,
                v.status as vehicleStatus,
                v.km_atual as currentKm,
                MAX(i.data_inspecao) as lastInspectionDate,
                DATEDIFF(CURRENT_DATE, MAX(i.data_inspecao)) as daysSinceInspection,
                COUNT(i.id) as totalInspections
              FROM veiculos v
              LEFT JOIN inspecoes i ON v.id = i.veiculo_id
                AND i.tipo = 'pre_viagem'
                AND i.ativo = TRUE
              WHERE v.ativo = TRUE
              GROUP BY v.id, v.placa, v.marca, v.modelo, v.status, v.km_atual
              ORDER BY daysSinceInspection DESC NULLS FIRST, v.placa ASC";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $statistics = [
        'total' => 0,
        'compliant' => 0,
        'dueSoon' => 0,
        'overdue' => 0,
        'neverInspected' => 0
    ];

    $vehicleStatuses = [];

    foreach ($vehicles as $vehicle) {
        $vehicleData = [
            'id' => (int)$vehicle['id'],
            'placa' => $vehicle['placa'],
            'marca' => $vehicle['marca'],
            'modelo' => $vehicle['modelo'],
            'vehicleStatus' => $vehicle['vehicleStatus'],
            'currentKm' => (int)$vehicle['currentKm'],
            'totalInspections' => (int)$vehicle['totalInspections']
        ];

        if ($vehicle['lastInspectionDate']) {
            $daysSince = (int)$vehicle['daysSinceInspection'];
            $isCompliant = $daysSince <= $INSPECTION_REQUIRED_DAYS;
            $isDueSoon = $daysSince >= $WARNING_DAYS && $daysSince <= $INSPECTION_REQUIRED_DAYS;
            $isOverdue = $daysSince > $INSPECTION_REQUIRED_DAYS;

            $vehicleData['lastInspectionDate'] = $vehicle['lastInspectionDate'];
            $vehicleData['daysSinceInspection'] = $daysSince;
            $vehicleData['compliant'] = $isCompliant;
            $vehicleData['status'] = $isOverdue ? 'overdue' : ($isDueSoon ? 'due_soon' : 'ok');

            if ($isOverdue) {
                $vehicleData['daysOverdue'] = $daysSince - $INSPECTION_REQUIRED_DAYS;
                $vehicleData['message'] = "Vencida há {$vehicleData['daysOverdue']} dia(s)";
                $vehicleData['severity'] = 'danger';
                $statistics['overdue']++;
            } elseif ($isDueSoon) {
                $vehicleData['daysRemaining'] = $INSPECTION_REQUIRED_DAYS - $daysSince;
                $vehicleData['message'] = "Vence em {$vehicleData['daysRemaining']} dia(s)";
                $vehicleData['severity'] = 'warning';
                $statistics['dueSoon']++;
            } else {
                $vehicleData['daysRemaining'] = $INSPECTION_REQUIRED_DAYS - $daysSince;
                $vehicleData['message'] = "Em dia ({$daysSince} dia(s) atrás)";
                $vehicleData['severity'] = 'success';
                $statistics['compliant']++;
            }
        } else {
            // Veículo nunca foi inspecionado
            $vehicleData['lastInspectionDate'] = null;
            $vehicleData['daysSinceInspection'] = null;
            $vehicleData['compliant'] = false;
            $vehicleData['status'] = 'never_inspected';
            $vehicleData['message'] = "Nunca inspecionado";
            $vehicleData['severity'] = 'danger';
            $statistics['neverInspected']++;
        }

        $statistics['total']++;
        $vehicleStatuses[] = $vehicleData;
    }

    // Calcular percentual de conformidade
    $compliancePercentage = $statistics['total'] > 0
        ? round(($statistics['compliant'] / $statistics['total']) * 100, 1)
        : 0;

    sendResponse([
        'success' => true,
        'statistics' => $statistics,
        'compliancePercentage' => $compliancePercentage,
        'vehicles' => $vehicleStatuses,
        'settings' => [
            'requiredDays' => $INSPECTION_REQUIRED_DAYS,
            'warningDays' => $WARNING_DAYS
        ]
    ]);

} catch (Exception $e) {
    error_log("Vehicle inspection status error: " . $e->getMessage());
    sendError('Erro ao buscar status de inspeção dos veículos', 500);
}