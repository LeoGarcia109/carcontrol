<?php
/**
 * Dashboard Controller
 * Estatísticas e métricas do sistema
 */

class DashboardController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getStats() {
        try {
            // Total de veículos
            $vehiclesQuery = "SELECT COUNT(*) as total FROM veiculos WHERE ativo = 1";
            $vehiclesStmt = $this->db->prepare($vehiclesQuery);
            $vehiclesStmt->execute();
            $totalVehicles = $vehiclesStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Veículos disponíveis
            $availableQuery = "SELECT COUNT(*) as total FROM veiculos WHERE ativo = 1 AND status = 'disponivel'";
            $availableStmt = $this->db->prepare($availableQuery);
            $availableStmt->execute();
            $availableVehicles = $availableStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Veículos em uso
            $inUseQuery = "SELECT COUNT(*) as total FROM veiculos WHERE ativo = 1 AND status = 'em_uso'";
            $inUseStmt = $this->db->prepare($inUseQuery);
            $inUseStmt->execute();
            $inUseVehicles = $inUseStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Total de motoristas
            $driversQuery = "SELECT COUNT(*) as total FROM motoristas WHERE ativo = 1";
            $driversStmt = $this->db->prepare($driversQuery);
            $driversStmt->execute();
            $totalDrivers = $driversStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Total de usos hoje
            $usageTodayQuery = "SELECT COUNT(*) as total FROM uso_veiculos
                                WHERE DATE(data_hora_saida) = CURDATE()";
            $usageTodayStmt = $this->db->prepare($usageTodayQuery);
            $usageTodayStmt->execute();
            $usageToday = $usageTodayStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Usos ativos
            $activeUsageQuery = "SELECT COUNT(*) as total FROM uso_veiculos WHERE status = 'em_uso'";
            $activeUsageStmt = $this->db->prepare($activeUsageQuery);
            $activeUsageStmt->execute();
            $activeUsage = $activeUsageStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // CNHs vencidas
            $expiredCnhQuery = "SELECT COUNT(*) as total FROM motoristas
                                WHERE ativo = 1 AND validade_cnh < CURDATE()";
            $expiredCnhStmt = $this->db->prepare($expiredCnhQuery);
            $expiredCnhStmt->execute();
            $expiredCnh = $expiredCnhStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // CNHs vencendo em 30 dias
            $expiringSoonQuery = "SELECT COUNT(*) as total FROM motoristas
                                  WHERE ativo = 1
                                  AND validade_cnh >= CURDATE()
                                  AND validade_cnh <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
            $expiringSoonStmt = $this->db->prepare($expiringSoonQuery);
            $expiringSoonStmt->execute();
            $expiringSoon = $expiringSoonStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Veículos com manutenção pendente
            $maintenancePendingQuery = "SELECT COUNT(*) as total FROM veiculos
                                        WHERE ativo = 1
                                        AND (km_atual - km_ultima_revisao) >= 10000";
            $maintenancePendingStmt = $this->db->prepare($maintenancePendingQuery);
            $maintenancePendingStmt->execute();
            $maintenancePending = $maintenancePendingStmt->fetch(PDO::FETCH_ASSOC)['total'];

            sendResponse([
                'success' => true,
                'data' => [
                    'vehicles' => [
                        'total' => (int)$totalVehicles,
                        'available' => (int)$availableVehicles,
                        'inUse' => (int)$inUseVehicles,
                        'maintenance' => 0  // TODO: implementar
                    ],
                    'drivers' => [
                        'total' => (int)$totalDrivers,
                        'active' => (int)$totalDrivers,
                        'expiredCnh' => (int)$expiredCnh,
                        'expiringSoon' => (int)$expiringSoon
                    ],
                    'usage' => [
                        'today' => (int)$usageToday,
                        'active' => (int)$activeUsage
                    ],
                    'maintenance' => [
                        'pending' => (int)$maintenancePending
                    ]
                ]
            ]);

        } catch (Exception $e) {
            error_log("Get dashboard stats error: " . $e->getMessage());
            sendError('Erro ao buscar estatísticas', 500);
        }
    }
}
