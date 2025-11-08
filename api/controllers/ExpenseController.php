<?php
/**
 * Expense Controller
 * Registra despesas de veículos (inclui abastecimento)
 */

class ExpenseController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->ensureTable();
    }

    private function ensureTable() {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS despesas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    veiculo_id INT NOT NULL,
                    categoria ENUM('abastecimento','pedagio','estacionamento','manutencao','outros') NOT NULL,
                    data DATETIME NOT NULL,
                    km_atual INT NULL,
                    litros DECIMAL(10,2) NULL,
                    preco_litro DECIMAL(10,4) NULL,
                    valor_total DECIMAL(12,2) NULL,
                    observacoes TEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            $this->db->exec($sql);
        } catch (Exception $e) {
            // Tentar fallback sem ENUM (caso permissão ou versão cause erro)
            try {
                $sql2 = "CREATE TABLE IF NOT EXISTS despesas (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        veiculo_id INT NOT NULL,
                        categoria VARCHAR(32) NOT NULL,
                        data DATETIME NOT NULL,
                        km_atual INT NULL,
                        litros DECIMAL(10,2) NULL,
                        preco_litro DECIMAL(10,4) NULL,
                        valor_total DECIMAL(12,2) NULL,
                        observacoes TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                $this->db->exec($sql2);
            } catch (Exception $e2) {
                error_log('ensureTable despesas error: ' . $e2->getMessage());
            }
        }
    }

    private function tableExists($name) {
        try {
            if (!$this->db) {
                error_log('ExpenseController::tableExists - Database connection is null!');
                return false;
            }
            // SHOW TABLES LIKE doesn't work well with prepared statements in some MySQL versions
            // Using quote() method to safely escape the table name
            $safeName = $this->db->quote($name);
            $query = "SHOW TABLES LIKE $safeName";
            $stmt = $this->db->query($query);
            $count = $stmt->rowCount();
            error_log("ExpenseController::tableExists - Checking table '$name', found: $count");
            return $count > 0;
        } catch (Exception $e) {
            error_log('ExpenseController::tableExists - Exception: ' . $e->getMessage());
            return false;
        }
    }

    public function getAll() {
        try {
            // Se não existir a tabela e não for possível criá-la agora, retornar vazio ao invés de erro
            if (!$this->tableExists('despesas')) {
                error_log('ExpenseController: Table despesas does not exist');
                try { $this->ensureTable(); } catch (Exception $e) {}
            }
            if (!$this->tableExists('despesas')) {
                error_log('ExpenseController: Could not create table despesas');
                sendResponse(['success' => true, 'data' => [], 'count' => 0]);
                return;  // IMPORTANTE: parar execução aqui
            }

            // Detectar esquema da tabela para compatibilidade
            $cols = [];
            try {
                $cstmt = $this->db->query("SHOW COLUMNS FROM despesas");
                $cols = $cstmt->fetchAll(PDO::FETCH_COLUMN, 0) ?: [];
                error_log('ExpenseController: Found columns: ' . implode(', ', $cols));
            } catch (Exception $e) {
                error_log('ExpenseController: Error getting columns: ' . $e->getMessage());
                $cols = [];
            }

            if (in_array('tipo', $cols, true)) {
                error_log('ExpenseController: Using tipo/descricao schema');
                // Esquema tipo/descricao/valor/data_despesa/km_veiculo (com suporte a litros e preco_litro se existirem)
                $query = "SELECT d.id, d.veiculo_id as vehicleId,
                                 d.tipo, d.descricao, d.valor as totalValue,
                                 d.data_despesa as date, d.km_veiculo as currentKm,
                                 d.observacoes as notes,
                                 " . (in_array('litros', $cols) ? 'd.litros' : 'NULL') . " as liters,
                                 " . (in_array('preco_litro', $cols) ? 'd.preco_litro' : 'NULL') . " as pricePerLiter,
                                 " . (in_array('valor_total', $cols) ? 'd.valor_total' : 'd.valor') . " as totalValueCalc,
                                 v.placa as vehiclePlate, v.modelo as vehicleModel, v.marca as vehicleBrand
                          FROM despesas d
                          LEFT JOIN veiculos v ON v.id = d.veiculo_id
                          ORDER BY d.data_despesa DESC, d.id DESC";
                error_log('ExpenseController: Query = ' . $query);
                $stmt = $this->db->prepare($query);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                error_log('ExpenseController: Found ' . count($rows) . ' rows');

                $categoryMap = [
                    'combustivel' => 'abastecimento',
                    'pedagio' => 'pedagio',
                    'estacionamento' => 'estacionamento',
                    'outros' => 'outros',
                    'multa' => 'outros',
                    'seguro' => 'outros',
                    'ipva' => 'outros',
                    'licenciamento' => 'outros',
                    'lavagem' => 'outros'
                ];

                foreach ($rows as &$r) {
                    $r['id'] = (int)$r['id'];
                    $r['vehicleId'] = (int)$r['vehicleId'];
                    $r['currentKm'] = isset($r['currentKm']) ? (int)$r['currentKm'] : null;

                    // Usar totalValueCalc se existir, senão usar totalValue
                    $r['totalValue'] = isset($r['totalValueCalc']) ? (float)$r['totalValueCalc'] : (isset($r['totalValue']) ? (float)$r['totalValue'] : 0);
                    unset($r['totalValueCalc']);

                    $r['category'] = isset($categoryMap[$r['tipo']]) ? $categoryMap[$r['tipo']] : 'outros';

                    // Processar litros e preco_litro (se vierem do banco)
                    if (isset($r['liters']) && $r['liters'] !== null) {
                        $r['liters'] = (float)$r['liters'];
                    } else {
                        $r['liters'] = null;
                    }

                    if (isset($r['pricePerLiter']) && $r['pricePerLiter'] !== null) {
                        $r['pricePerLiter'] = (float)$r['pricePerLiter'];
                    } else {
                        $r['pricePerLiter'] = null;
                    }

                    // Se não tem litros/preco_litro, tentar parsear da descrição (fallback)
                    if ($r['tipo'] === 'combustivel' && !empty($r['descricao']) && $r['liters'] === null) {
                        if (preg_match('/(\d+(?:\.\d+)?)\s*L\s*a\s*R\$\s*(\d+(?:[,\.]\d+)?)/i', $r['descricao'], $matches)) {
                            $r['liters'] = (float)str_replace(',', '.', $matches[1]);
                            $r['pricePerLiter'] = (float)str_replace(',', '.', $matches[2]);
                        }
                    }

                    unset($r['tipo']);
                }

                sendResponse(['success' => true, 'data' => $rows, 'count' => count($rows)]);
                return;
            }

            // Esquema categoria/litros/preco_litro/valor_total/data/km_atual - construir SELECT com colunas existentes
            $has = function($name) use ($cols) { return in_array($name, $cols, true); };
            $parts = [];
            $parts[] = 'd.id';
            $parts[] = 'd.veiculo_id as vehicleId';
            $parts[] = ($has('categoria') ? 'd.categoria' : 'NULL') . ' as category';
            $parts[] = ($has('valor_total') ? 'd.valor_total' : ($has('valor') ? 'd.valor' : 'NULL')) . ' as totalValue';
            $parts[] = ($has('data') ? 'd.data' : ($has('data_despesa') ? 'd.data_despesa' : 'NULL')) . ' as date';
            $parts[] = ($has('km_atual') ? 'd.km_atual' : ($has('km_veiculo') ? 'd.km_veiculo' : 'NULL')) . ' as currentKm';
            $parts[] = ($has('litros') ? 'd.litros' : 'NULL') . ' as liters';
            $parts[] = ($has('preco_litro') ? 'd.preco_litro' : 'NULL') . ' as pricePerLiter';
            $parts[] = ($has('observacoes') ? 'd.observacoes' : ($has('obs') ? 'd.obs' : 'NULL')) . ' as notes';
            $parts[] = 'v.placa as vehiclePlate';
            $parts[] = 'v.modelo as vehicleModel';

            $orderCol = $has('data') ? 'd.data' : ($has('data_despesa') ? 'd.data_despesa' : 'd.id');

            $query = "SELECT " . implode(', ', $parts) . "
                      FROM despesas d
                      LEFT JOIN veiculos v ON v.id = d.veiculo_id
                      ORDER BY $orderCol DESC, d.id DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows as &$r) {
                $r['id'] = (int)$r['id'];
                $r['vehicleId'] = (int)$r['vehicleId'];
                if (isset($r['currentKm'])) $r['currentKm'] = (int)$r['currentKm'];
                if (isset($r['liters'])) $r['liters'] = (float)$r['liters'];
                if (isset($r['pricePerLiter'])) $r['pricePerLiter'] = (float)$r['pricePerLiter'];
                if (isset($r['totalValue'])) $r['totalValue'] = (float)$r['totalValue'];
            }

            sendResponse(['success' => true, 'data' => $rows, 'count' => count($rows)]);
        } catch (Exception $e) {
            error_log('Get expenses error: ' . $e->getMessage());
            sendError('Erro ao buscar despesas', 500);
        }
    }

    public function create($data) {
        try {
            if (empty($data['vehicleId']) || empty($data['category'])) {
                sendError('Veículo e categoria são obrigatórios', 400);
            }

            $vehicleId = (int)$data['vehicleId'];
            $category = $data['category'];
            $date = isset($data['date']) ? $data['date'] : date('Y-m-d H:i:s');
            $km = isset($data['currentKm']) ? (int)$data['currentKm'] : null;
            $liters = isset($data['liters']) ? (float)$data['liters'] : null;
            $price = isset($data['pricePerLiter']) ? (float)$data['pricePerLiter'] : null;
            $total = isset($data['totalValue']) ? (float)$data['totalValue'] : null;
            $notes = isset($data['notes']) ? $data['notes'] : null;

            // Calcular valor total se não fornecido em abastecimento
            if ($total === null && $category === 'abastecimento' && $liters && $price) {
                $total = $liters * $price;
            }

            // Detectar esquema da tabela
            $cols = [];
            try {
                $cstmt = $this->db->query("SHOW COLUMNS FROM despesas");
                $cols = $cstmt->fetchAll(PDO::FETCH_COLUMN, 0) ?: [];
            } catch (Exception $e) { $cols = []; }

            if (in_array('tipo', $cols, true)) {
                // Esquema tipo/descricao/valor/data_despesa/km_veiculo
                $tipoMap = [
                    'abastecimento' => 'combustivel',
                    'pedagio' => 'pedagio',
                    'estacionamento' => 'estacionamento',
                    'manutencao' => 'outros',
                    'outros' => 'outros'
                ];
                $tipo = isset($tipoMap[$category]) ? $tipoMap[$category] : 'outros';
                $descricaoMap = [
                    'abastecimento' => 'Abastecimento',
                    'pedagio' => 'Pedágio',
                    'estacionamento' => 'Estacionamento',
                    'manutencao' => 'Manutenção',
                    'outros' => 'Outras despesas'
                ];
                $descricao = isset($descricaoMap[$category]) ? $descricaoMap[$category] : 'Despesa';
                if ($category === 'abastecimento' && $liters && $price) {
                    $descricao .= " - {$liters}L a R$ " . number_format($price, 2, ',', '.');
                }

                $query = "INSERT INTO despesas (veiculo_id, tipo, descricao, valor, data_despesa, km_veiculo, observacoes)
                          VALUES (:veiculo_id, :tipo, :descricao, :valor, :data_despesa, :km_veiculo, :observacoes)";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':veiculo_id', $vehicleId, PDO::PARAM_INT);
                $stmt->bindParam(':tipo', $tipo);
                $stmt->bindParam(':descricao', $descricao);
                $stmt->bindValue(':valor', $total !== null ? $total : 0);
                $stmt->bindValue(':data_despesa', substr($date, 0, 10)); // Apenas a data
                $stmt->bindValue(':km_veiculo', $km, $km === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                $stmt->bindValue(':observacoes', $notes, $notes === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                $stmt->execute();
            } else {
                // Esquema categoria/litros/preco_litro/valor_total/data/km_atual
                $litersStr = $liters !== null ? number_format($liters, 2, '.', '') : null;
                $priceStr = $price !== null ? number_format($price, 2, '.', '') : null;
                $totalStr = $total !== null ? number_format($total, 2, '.', '') : null;

                $query = "INSERT INTO despesas (veiculo_id, categoria, data, km_atual, litros, preco_litro, valor_total, observacoes)
                          VALUES (:veiculo_id, :categoria, :data, :km, :litros, :preco, :total, :obs)";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':veiculo_id', $vehicleId, PDO::PARAM_INT);
                $stmt->bindParam(':categoria', $category);
                $stmt->bindParam(':data', $date);
                if ($km === null) { $stmt->bindValue(':km', null, PDO::PARAM_NULL); } else { $stmt->bindValue(':km', $km, PDO::PARAM_INT); }
                if ($litersStr === null) { $stmt->bindValue(':litros', null, PDO::PARAM_NULL); } else { $stmt->bindValue(':litros', $litersStr); }
                if ($priceStr === null) { $stmt->bindValue(':preco', null, PDO::PARAM_NULL); } else { $stmt->bindValue(':preco', $priceStr); }
                if ($totalStr === null) { $stmt->bindValue(':total', null, PDO::PARAM_NULL); } else { $stmt->bindValue(':total', $totalStr); }
                if ($notes === null) { $stmt->bindValue(':obs', null, PDO::PARAM_NULL); } else { $stmt->bindValue(':obs', $notes); }
                $stmt->execute();
            }

            sendResponse(['success' => true, 'message' => 'Despesa registrada com sucesso', 'data' => ['id' => (int)$this->db->lastInsertId()]], 201);
        } catch (Exception $e) {
            error_log('Create expense error: ' . $e->getMessage());
            sendError('Erro ao registrar despesa: ' . $e->getMessage(), 500);
        }
    }

    public function delete($id) {
        try {
            $stmt = $this->db->prepare('DELETE FROM despesas WHERE id = :id');
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                sendError('Registro não encontrado', 404);
            }
            sendResponse(['success' => true, 'message' => 'Despesa removida com sucesso']);
        } catch (Exception $e) {
            error_log('Delete expense error: ' . $e->getMessage());
            sendError('Erro ao remover despesa', 500);
        }
    }
}
