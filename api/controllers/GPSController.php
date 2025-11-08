<?php
/**
 * GPS Controller - CarControl
 * Gerencia rastreamento GPS em tempo real dos veículos
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';

class GPSController {
    private $db;

    public function __construct() {
        $this->db = getConnection();
    }

    /**
     * POST /gps/update
     * Recebe e armazena localização GPS do veículo
     */
    public function updateLocation($data) {
        try {
            // Validar sessão
            if (!isset($_SESSION['user_id'])) {
                sendError('Não autorizado', 401);
            }

            // Validar dados obrigatórios
            if (empty($data['vehicleId']) || empty($data['driverId']) ||
                !isset($data['latitude']) || !isset($data['longitude'])) {
                sendError('Dados incompletos: vehicleId, driverId, latitude e longitude são obrigatórios', 400);
            }

            $userId = $_SESSION['user_id'];
            $userRole = $_SESSION['role'];

            // ⚠️ CRÍTICO: Liberar lock da sessão imediatamente após ler
            // GPS updates acontecem a cada 3 minutos e não devem bloquear outras requisições
            session_write_close();

            $vehicleId = (int)$data['vehicleId'];
            $driverId = (int)$data['driverId'];
            $usageId = isset($data['usageId']) ? (int)$data['usageId'] : null;

            // Validar se motorista pode enviar GPS deste veículo
            if ($userRole === 'motorista') {
                // Motorista só pode enviar GPS do próprio veículo em uso ativo
                $checkQuery = "SELECT id FROM uso_veiculos
                              WHERE id = :usage_id
                              AND veiculo_id = :vehicle_id
                              AND motorista_id = :driver_id
                              AND status = 'em_uso'";

                $stmt = $this->db->prepare($checkQuery);
                $stmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
                $stmt->bindParam(':vehicle_id', $vehicleId, PDO::PARAM_INT);
                $stmt->bindParam(':driver_id', $driverId, PDO::PARAM_INT);
                $stmt->execute();

                if ($stmt->rowCount() === 0) {
                    sendError('Você não tem permissão para enviar GPS deste veículo', 403);
                }
            }

            // Inserir localização GPS
            $query = "INSERT INTO gps_tracking
                      (veiculo_id, motorista_id, uso_veiculo_id, latitude, longitude,
                       precisao, velocidade, altitude, heading, timestamp, active)
                      VALUES
                      (:veiculo_id, :motorista_id, :uso_veiculo_id, :latitude, :longitude,
                       :precisao, :velocidade, :altitude, :heading, NOW(), 1)";

            $stmt = $this->db->prepare($query);

            $latitude = (float)$data['latitude'];
            $longitude = (float)$data['longitude'];
            $precisao = isset($data['accuracy']) ? (float)$data['accuracy'] : null;
            $velocidade = isset($data['speed']) ? (float)$data['speed'] : null;
            $altitude = isset($data['altitude']) ? (float)$data['altitude'] : null;
            $heading = isset($data['heading']) ? (float)$data['heading'] : null;

            $stmt->bindParam(':veiculo_id', $vehicleId, PDO::PARAM_INT);
            $stmt->bindParam(':motorista_id', $driverId, PDO::PARAM_INT);
            $stmt->bindParam(':uso_veiculo_id', $usageId, PDO::PARAM_INT);
            $stmt->bindParam(':latitude', $latitude);
            $stmt->bindParam(':longitude', $longitude);
            $stmt->bindParam(':precisao', $precisao);
            $stmt->bindParam(':velocidade', $velocidade);
            $stmt->bindParam(':altitude', $altitude);
            $stmt->bindParam(':heading', $heading);

            $stmt->execute();

            sendSuccess('Localização atualizada com sucesso', [
                'id' => $this->db->lastInsertId(),
                'timestamp' => date('Y-m-d H:i:s')
            ]);

        } catch (Exception $e) {
            sendError('Erro ao atualizar localização: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /gps/active
     * Retorna veículos ativos com última localização
     */
    public function getActiveVehicles() {
        try {
            // Usar a view otimizada - apenas veículos ativos com GPS recente
            $query = "SELECT
                        veiculo_id as vehicleId,
                        placa as plate,
                        marca as brand,
                        modelo as model,
                        motorista_id as driverId,
                        motorista_nome as driverName,
                        uso_veiculo_id as usageId,
                        latitude,
                        longitude,
                        precisao as accuracy,
                        velocidade as speed,
                        altitude,
                        heading,
                        ultima_atualizacao as timestamp,
                        segundos_desde_atualizacao as secondsSinceUpdate
                      FROM vw_ultima_localizacao
                      WHERE segundos_desde_atualizacao < 180
                      ORDER BY ultima_atualizacao DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Converter tipos
            foreach ($vehicles as &$vehicle) {
                $vehicle['vehicleId'] = (int)$vehicle['vehicleId'];
                $vehicle['driverId'] = (int)$vehicle['driverId'];
                $vehicle['usageId'] = isset($vehicle['usageId']) ? (int)$vehicle['usageId'] : null;
                $vehicle['latitude'] = (float)$vehicle['latitude'];
                $vehicle['longitude'] = (float)$vehicle['longitude'];
                $vehicle['accuracy'] = isset($vehicle['accuracy']) ? (float)$vehicle['accuracy'] : null;
                $vehicle['speed'] = isset($vehicle['speed']) ? (float)$vehicle['speed'] : null;
                $vehicle['altitude'] = isset($vehicle['altitude']) ? (float)$vehicle['altitude'] : null;
                $vehicle['heading'] = isset($vehicle['heading']) ? (float)$vehicle['heading'] : null;
                $vehicle['secondsSinceUpdate'] = (int)$vehicle['secondsSinceUpdate'];
            }

            sendSuccess('Veículos ativos obtidos com sucesso', [
                'vehicles' => $vehicles,
                'count' => count($vehicles)
            ]);

        } catch (Exception $e) {
            sendError('Erro ao obter veículos ativos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /gps/history/{usageId}
     * Retorna histórico de rota de uma viagem específica
     */
    public function getRouteHistory($usageId) {
        try {
            $usageId = (int)$usageId;

            // Buscar pontos GPS da viagem
            $query = "SELECT
                        id,
                        latitude,
                        longitude,
                        precisao as accuracy,
                        velocidade as speed,
                        altitude,
                        heading,
                        timestamp
                      FROM gps_tracking
                      WHERE uso_veiculo_id = :usage_id
                      ORDER BY timestamp ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $stmt->execute();

            $points = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Converter tipos
            foreach ($points as &$point) {
                $point['id'] = (int)$point['id'];
                $point['latitude'] = (float)$point['latitude'];
                $point['longitude'] = (float)$point['longitude'];
                $point['accuracy'] = isset($point['accuracy']) ? (float)$point['accuracy'] : null;
                $point['speed'] = isset($point['speed']) ? (float)$point['speed'] : null;
                $point['altitude'] = isset($point['altitude']) ? (float)$point['altitude'] : null;
                $point['heading'] = isset($point['heading']) ? (float)$point['heading'] : null;
            }

            // Buscar dados do histórico de rota (se existir)
            $histQuery = "SELECT
                            rota_geojson as routeGeoJSON,
                            total_pontos as totalPoints,
                            distancia_total as totalDistance,
                            duracao_minutos as durationMinutes,
                            velocidade_media as averageSpeed,
                            velocidade_maxima as maxSpeed
                          FROM rotas_historico
                          WHERE uso_veiculo_id = :usage_id
                          LIMIT 1";

            $histStmt = $this->db->prepare($histQuery);
            $histStmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $histStmt->execute();

            $history = $histStmt->fetch(PDO::FETCH_ASSOC);

            // Buscar dados da viagem (uso_veiculos) para incluir destino e outras informações
            $usageQuery = "SELECT
                            COALESCE(d.nome, uv.destino, uv.finalidade, 'Sem destino informado') as destination,
                            uv.data_hora_saida as departureTime,
                            uv.data_hora_retorno as returnTime,
                            v.placa as vehiclePlate,
                            m.nome as driverName
                           FROM uso_veiculos uv
                           LEFT JOIN veiculos v ON uv.veiculo_id = v.id
                           LEFT JOIN motoristas m ON uv.motorista_id = m.id
                           LEFT JOIN destinos d ON uv.destino_id = d.id
                           WHERE uv.id = :usage_id
                           LIMIT 1";

            $usageStmt = $this->db->prepare($usageQuery);
            $usageStmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $usageStmt->execute();

            $usageData = $usageStmt->fetch(PDO::FETCH_ASSOC);

            sendSuccess('Histórico de rota obtido com sucesso', [
                'points' => $points,
                'totalPoints' => count($points),
                'history' => $history ? $history : null,
                'usage' => $usageData ? $usageData : null
            ]);

        } catch (Exception $e) {
            sendError('Erro ao obter histórico de rota: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /gps/stop
     * Para rastreamento GPS ao finalizar viagem
     */
    public function stopTracking($data) {
        try {
            // Validar sessão
            if (!isset($_SESSION['user_id'])) {
                sendError('Não autorizado', 401);
            }

            // ⚠️ CRÍTICO: Liberar lock da sessão após validação
            session_write_close();

            if (empty($data['usageId'])) {
                sendError('ID da viagem (usageId) é obrigatório', 400);
            }

            $usageId = (int)$data['usageId'];

            // Desativar todos os pontos GPS desta viagem
            $query = "UPDATE gps_tracking
                      SET active = 0
                      WHERE uso_veiculo_id = :usage_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $stmt->execute();

            $affectedRows = $stmt->rowCount();

            sendSuccess('Rastreamento parado com sucesso', [
                'pointsDeactivated' => $affectedRows
            ]);

        } catch (Exception $e) {
            sendError('Erro ao parar rastreamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /gps/vehicle/{vehicleId}
     * Retorna última localização de um veículo específico
     */
    public function getVehicleLocation($vehicleId) {
        try {
            $vehicleId = (int)$vehicleId;

            $query = "SELECT
                        veiculo_id as vehicleId,
                        placa as plate,
                        marca as brand,
                        modelo as model,
                        motorista_id as driverId,
                        motorista_nome as driverName,
                        uso_veiculo_id as usageId,
                        latitude,
                        longitude,
                        precisao as accuracy,
                        velocidade as speed,
                        altitude,
                        heading,
                        ultima_atualizacao as lastUpdate,
                        segundos_desde_atualizacao as secondsSinceUpdate
                      FROM vw_ultima_localizacao
                      WHERE veiculo_id = :vehicle_id
                      LIMIT 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':vehicle_id', $vehicleId, PDO::PARAM_INT);
            $stmt->execute();

            $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$vehicle) {
                sendError('Nenhuma localização encontrada para este veículo', 404);
            }

            // Converter tipos
            $vehicle['vehicleId'] = (int)$vehicle['vehicleId'];
            $vehicle['driverId'] = (int)$vehicle['driverId'];
            $vehicle['usageId'] = isset($vehicle['usageId']) ? (int)$vehicle['usageId'] : null;
            $vehicle['latitude'] = (float)$vehicle['latitude'];
            $vehicle['longitude'] = (float)$vehicle['longitude'];
            $vehicle['accuracy'] = isset($vehicle['accuracy']) ? (float)$vehicle['accuracy'] : null;
            $vehicle['speed'] = isset($vehicle['speed']) ? (float)$vehicle['speed'] : null;
            $vehicle['altitude'] = isset($vehicle['altitude']) ? (float)$vehicle['altitude'] : null;
            $vehicle['heading'] = isset($vehicle['heading']) ? (float)$vehicle['heading'] : null;
            $vehicle['secondsSinceUpdate'] = (int)$vehicle['secondsSinceUpdate'];

            sendSuccess('Localização do veículo obtida com sucesso', $vehicle);

        } catch (Exception $e) {
            sendError('Erro ao obter localização do veículo: ' . $e->getMessage(), 500);
        }
    }
}

// Helper functions
function sendSuccess($message, $data = null) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}
