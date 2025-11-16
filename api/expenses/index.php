<?php
/**
 * Expenses API - Main Routes
 * GET /expenses - List all expenses
 * POST /expenses - Create new expense
 */

require_once '../config/cors.php';
require_once '../config/database.php';

// Helper function para enviar respostas JSON
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

// Processar requisição
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar todas as despesas
        try {
            $stmt = $pdo->query("
                SELECT
                    d.*,
                    v.placa as vehicle_plate,
                    v.marca as vehicle_brand,
                    v.modelo as vehicle_model
                FROM despesas d
                LEFT JOIN veiculos v ON d.veiculo_id = v.id
                WHERE d.ativo = 1
                ORDER BY d.data DESC, d.created_at DESC
            ");

            $expenses = $stmt->fetchAll();

            // Compatibilidade com novo e antigo schema
            $expenses = array_map(function($expense) {
                // Se novo schema (categoria), manter
                if (isset($expense['categoria'])) {
                    return $expense;
                }

                // Se antigo schema (tipo), mapear para categoria
                if (isset($expense['tipo'])) {
                    $expense['categoria'] = $expense['tipo'];
                    $expense['valor_total'] = $expense['valor'];
                }

                return $expense;
            }, $expenses);

            sendResponse([
                'success' => true,
                'data' => $expenses,
                'count' => count($expenses)
            ]);
        } catch (PDOException $e) {
            error_log("Erro ao listar despesas: " . $e->getMessage());
            sendError('Erro ao listar despesas', 500);
        }
        break;

    case 'POST':
        // Criar nova despesa
        $data = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError('JSON inválido', 400);
        }

        // Validações
        if (empty($data['vehicleId'])) {
            sendError('ID do veículo é obrigatório', 400);
        }

        if (empty($data['category'])) {
            sendError('Categoria é obrigatória', 400);
        }

        try {
            // Preparar dados
            $vehicleId = $data['vehicleId'];
            $category = $data['category'];
            $date = $data['date'] ?? date('Y-m-d H:i:s');
            $currentKm = $data['currentKm'] ?? null;
            $liters = $data['liters'] ?? null;
            $pricePerLiter = $data['pricePerLiter'] ?? null;
            $totalValue = $data['totalValue'] ?? null;
            $notes = $data['notes'] ?? null;

            // Auto-calcular valor total para abastecimento
            if ($category === 'abastecimento' && $liters && $pricePerLiter && !$totalValue) {
                $totalValue = $liters * $pricePerLiter;
            }

            // Inserir despesa
            $stmt = $pdo->prepare("
                INSERT INTO despesas (
                    veiculo_id,
                    categoria,
                    data,
                    km_atual,
                    litros,
                    preco_por_litro,
                    valor_total,
                    observacoes,
                    ativo,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            ");

            $stmt->execute([
                $vehicleId,
                $category,
                $date,
                $currentKm,
                $liters,
                $pricePerLiter,
                $totalValue,
                $notes
            ]);

            $expenseId = $pdo->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Despesa criada com sucesso',
                'data' => [
                    'id' => $expenseId
                ]
            ], 201);

        } catch (PDOException $e) {
            error_log("Erro ao criar despesa: " . $e->getMessage());
            sendError('Erro ao criar despesa: ' . $e->getMessage(), 500);
        }
        break;

    default:
        sendError('Método não permitido', 405);
}
