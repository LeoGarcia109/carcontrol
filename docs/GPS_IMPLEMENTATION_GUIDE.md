# Guia Completo de Implementação - Sistema de Rastreamento GPS em Tempo Real

**Versão**: 2.0
**Data**: Janeiro 2025
**Projeto Base**: CarControl - Sistema de Gestão de Frotas
**Stack**: PHP 8.4, MySQL 9.5, Vanilla JavaScript, Leaflet.js

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Requisitos e Dependências](#requisitos-e-dependências)
4. [Estrutura de Banco de Dados](#estrutura-de-banco-de-dados)
5. [Implementação Backend](#implementação-backend)
6. [Implementação Frontend](#implementação-frontend)
7. [Integração com Mapas](#integração-com-mapas)
8. [Indicadores Visuais](#indicadores-visuais)
9. [Configurações de Performance](#configurações-de-performance)
10. [Testes e Validação](#testes-e-validação)
11. [Troubleshooting](#troubleshooting)
12. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Visão Geral

### O que é este sistema?

Sistema de rastreamento GPS em tempo real para monitoramento de veículos de frota, com:

- **Captura automática de GPS** a cada 3 minutos (configurável)
- **Visualização em mapa** com marcadores personalizados
- **Atualização em tempo real** via polling (3 minutos)
- **Histórico de rotas** com replay de trajeto
- **Otimização de dados** (só envia se movimento > 10 metros)
- **Indicadores visuais** de status de GPS
- **Suporte mobile** para motoristas

### Características Principais

| Característica | Valor |
|----------------|-------|
| **Precisão GPS** | Alta (enableHighAccuracy: true) |
| **Intervalo de Captura** | 3 minutos (180s) |
| **Intervalo de Atualização Mapa** | 3 minutos (180s) |
| **Timeout GPS Ativo** | 3 minutos (180s) |
| **Distância Mínima** | 10 metros (otimização) |
| **Biblioteca de Mapas** | Leaflet.js 1.9.4 |
| **Provedor de Tiles** | OpenStreetMap |
| **Backend** | PHP 8.4 + MySQL 9.5 |
| **Frontend** | Vanilla JavaScript |

---

## 🏗️ Arquitetura do Sistema

### Diagrama de Fluxo

```
┌─────────────────┐
│  Motorista      │
│  (Mobile App)   │
└────────┬────────┘
         │ 1. Inicia Viagem
         ↓
┌─────────────────┐
│ Geolocation API │ ← 2. Solicita Permissão
│  (Navegador)    │
└────────┬────────┘
         │ 3. Captura Coordenadas (a cada 3min)
         ↓
┌─────────────────┐
│  GPS Tracking   │
│   JavaScript    │ ← 4. Calcula Distância (Haversine)
└────────┬────────┘
         │ 5. Se movimento > 10m
         ↓
┌─────────────────┐
│  POST /gps/     │
│    update       │ ← 6. Envia para Backend
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ GPSController   │
│    (PHP)        │ ← 7. Valida e Armazena
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  MySQL Table    │
│  gps_tracking   │ ← 8. Persiste no BD
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  VIEW: vw_      │
│ ultima_         │ ← 9. View Otimizada
│ localizacao     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ GET /gps/active │ ← 10. Dashboard consulta
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Leaflet.js    │
│   Map View      │ ← 11. Exibe no Mapa
└─────────────────┘
```

### Componentes do Sistema

#### Backend (PHP)
- **GPSController.php**: Controlador principal de GPS
- **router.php**: Roteador para PHP built-in server
- **database.php**: Conexão e função helper
- **cors.php**: Configuração CORS

#### Frontend (JavaScript)
- **mobile-driver.js**: Captura GPS do motorista
- **gps-tracking.js**: Visualização de mapa
- **api.js**: Funções de integração com backend

#### Banco de Dados
- **gps_tracking**: Tabela principal de pontos GPS
- **rotas_historico**: Histórico consolidado de rotas
- **vw_ultima_localizacao**: View otimizada

---

## 📦 Requisitos e Dependências

### Backend

```json
{
  "php": ">=8.4",
  "extensions": ["pdo", "pdo_mysql", "session"],
  "database": "MySQL 9.5+"
}
```

### Frontend

```html
<!-- Leaflet.js - Mapas Interativos -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""></script>
```

### Bibliotecas JavaScript

| Biblioteca | Versão | Uso |
|------------|--------|-----|
| Leaflet.js | 1.9.4 | Renderização de mapas |
| Geolocation API | Nativa | Captura de coordenadas GPS |
| Fetch API | Nativa | Comunicação com backend |

### Permissões Necessárias

```javascript
// Permissão de Geolocalização
navigator.permissions.query({ name: 'geolocation' })
```

**Configuração HTTPS**: Para produção, GPS requer HTTPS (exceto localhost)

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: `gps_tracking`

```sql
CREATE TABLE `gps_tracking` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `veiculo_id` INT UNSIGNED NOT NULL,
  `motorista_id` INT UNSIGNED NOT NULL,
  `uso_veiculo_id` INT UNSIGNED NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `precisao` DECIMAL(8, 2) NULL COMMENT 'Precisão em metros',
  `velocidade` DECIMAL(6, 2) NULL COMMENT 'Velocidade em m/s',
  `altitude` DECIMAL(8, 2) NULL COMMENT 'Altitude em metros',
  `heading` DECIMAL(5, 2) NULL COMMENT 'Direção em graus (0-360)',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_veiculo` (`veiculo_id`),
  KEY `idx_motorista` (`motorista_id`),
  KEY `idx_uso_veiculo` (`uso_veiculo_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_active` (`active`),
  CONSTRAINT `fk_gps_veiculo` FOREIGN KEY (`veiculo_id`)
    REFERENCES `veiculos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gps_motorista` FOREIGN KEY (`motorista_id`)
    REFERENCES `motoristas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gps_uso` FOREIGN KEY (`uso_veiculo_id`)
    REFERENCES `uso_veiculos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos Importantes**:
- `latitude/longitude`: Coordenadas GPS (DECIMAL para precisão)
- `precisao`: Precisão em metros (do GPS do dispositivo)
- `velocidade`: Em m/s (converter para km/h: `speed * 3.6`)
- `heading`: Direção do movimento (0-360 graus)
- `active`: Flag para filtrar pontos ativos (1) ou históricos (0)
- `timestamp`: Data/hora da captura (automático)

### Tabela: `rotas_historico`

```sql
CREATE TABLE `rotas_historico` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uso_veiculo_id` INT UNSIGNED NOT NULL,
  `rota_geojson` TEXT NULL COMMENT 'Rota em formato GeoJSON',
  `total_pontos` INT UNSIGNED DEFAULT 0,
  `distancia_total` DECIMAL(10, 2) NULL COMMENT 'Distância em KM',
  `duracao_minutos` INT UNSIGNED NULL,
  `velocidade_media` DECIMAL(6, 2) NULL COMMENT 'km/h',
  `velocidade_maxima` DECIMAL(6, 2) NULL COMMENT 'km/h',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uso_veiculo` (`uso_veiculo_id`),
  CONSTRAINT `fk_rota_uso` FOREIGN KEY (`uso_veiculo_id`)
    REFERENCES `uso_veiculos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### View: `vw_ultima_localizacao`

```sql
CREATE OR REPLACE VIEW `vw_ultima_localizacao` AS
SELECT
    t1.veiculo_id,
    v.placa,
    v.marca,
    v.modelo,
    t1.motorista_id,
    m.nome AS motorista_nome,
    t1.uso_veiculo_id,
    t1.latitude,
    t1.longitude,
    t1.precisao,
    t1.velocidade,
    t1.altitude,
    t1.heading,
    t1.timestamp AS ultima_atualizacao,
    TIMESTAMPDIFF(SECOND, t1.timestamp, NOW()) AS segundos_desde_atualizacao
FROM gps_tracking t1
INNER JOIN (
    SELECT veiculo_id, MAX(timestamp) AS max_timestamp
    FROM gps_tracking
    GROUP BY veiculo_id
) t2 ON t1.veiculo_id = t2.veiculo_id AND t1.timestamp = t2.max_timestamp
LEFT JOIN veiculos v ON t1.veiculo_id = v.id
LEFT JOIN motoristas m ON t1.motorista_id = m.id
ORDER BY t1.timestamp DESC;
```

**Otimização**: Esta view retorna apenas a última posição de cada veículo, evitando varredura completa da tabela.

### Trigger: Auto-consolidação de Rotas

**IMPORTANTE**: Status padronizado para `'finalizado'` (não `'concluido'`)

```sql
DELIMITER $$

CREATE TRIGGER `tr_finalizar_viagem_rota`
AFTER UPDATE ON `uso_veiculos`
FOR EACH ROW
BEGIN
    DECLARE total_distancia DECIMAL(10,3) DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    DECLARE lat_anterior DECIMAL(10,8);
    DECLARE lon_anterior DECIMAL(11,8);
    DECLARE lat_atual DECIMAL(10,8);
    DECLARE lon_atual DECIMAL(11,8);

    -- Cursor para percorrer pontos GPS em ordem cronológica
    DECLARE cursor_pontos CURSOR FOR
        SELECT latitude, longitude
        FROM gps_tracking
        WHERE uso_veiculo_id = NEW.id
        ORDER BY timestamp ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Quando viagem é finalizada (status mudou para 'finalizado')
    -- CORRIGIDO: Usar 'finalizado' em vez de 'concluido'
    IF NEW.status = 'finalizado' AND OLD.status != 'finalizado' THEN

        -- Desativar todos os pontos GPS desta viagem
        UPDATE gps_tracking
        SET active = 0
        WHERE uso_veiculo_id = NEW.id;

        -- Calcular distância total usando Haversine
        OPEN cursor_pontos;
        FETCH cursor_pontos INTO lat_anterior, lon_anterior;

        read_loop: LOOP
            FETCH cursor_pontos INTO lat_atual, lon_atual;
            IF done THEN
                LEAVE read_loop;
            END IF;

            SET total_distancia = total_distancia +
                calcular_distancia_haversine(lat_anterior, lon_anterior, lat_atual, lon_atual);

            SET lat_anterior = lat_atual;
            SET lon_anterior = lon_atual;
        END LOOP;

        CLOSE cursor_pontos;

        -- Criar registro de histórico de rota com estatísticas completas
        INSERT INTO rotas_historico (
            uso_veiculo_id,
            rota_geojson,
            total_pontos,
            distancia_total,
            duracao_minutos,
            velocidade_media,
            velocidade_maxima,
            latitude_inicio,
            longitude_inicio,
            latitude_fim,
            longitude_fim
        )
        SELECT
            NEW.id,
            CONCAT(
                '{"type":"LineString","coordinates":[',
                GROUP_CONCAT(
                    CONCAT('[', longitude, ',', latitude, ']')
                    ORDER BY timestamp
                    SEPARATOR ','
                ),
                ']}'
            ) as rota_geojson,
            COUNT(*) as total_pontos,
            total_distancia as distancia_total,
            TIMESTAMPDIFF(MINUTE, MIN(timestamp), MAX(timestamp)) as duracao_minutos,
            CASE
                WHEN SUM(CASE WHEN velocidade IS NOT NULL THEN 1 ELSE 0 END) > 0
                THEN AVG(velocidade)
                ELSE NULL
            END as velocidade_media,
            MAX(velocidade) as velocidade_maxima,
            (SELECT latitude FROM gps_tracking WHERE uso_veiculo_id = NEW.id ORDER BY timestamp ASC LIMIT 1),
            (SELECT longitude FROM gps_tracking WHERE uso_veiculo_id = NEW.id ORDER BY timestamp ASC LIMIT 1),
            (SELECT latitude FROM gps_tracking WHERE uso_veiculo_id = NEW.id ORDER BY timestamp DESC LIMIT 1),
            (SELECT longitude FROM gps_tracking WHERE uso_veiculo_id = NEW.id ORDER BY timestamp DESC LIMIT 1)
        FROM gps_tracking
        WHERE uso_veiculo_id = NEW.id
        HAVING total_pontos > 0;

    END IF;
END$$

DELIMITER ;
```

### Script de Manutenção: Recalcular Rotas Antigas

**Arquivo**: `database/fix_route_statistics.sql`

Após migração de `concluido` para `finalizado`, use este script para recalcular estatísticas de rotas antigas que foram finalizadas antes da atualização do trigger.

```sql
-- Criar procedure para recalcular estatísticas de uma rota específica
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS recalcular_estatisticas_rota(IN p_uso_veiculo_id INT)
BEGIN
    DECLARE total_distancia DECIMAL(10,3) DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    DECLARE lat_anterior DECIMAL(10,8);
    DECLARE lon_anterior DECIMAL(11,8);
    DECLARE lat_atual DECIMAL(10,8);
    DECLARE lon_atual DECIMAL(11,8);

    DECLARE cursor_pontos CURSOR FOR
        SELECT latitude, longitude
        FROM gps_tracking
        WHERE uso_veiculo_id = p_uso_veiculo_id
        ORDER BY timestamp ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Calcular distância total
    OPEN cursor_pontos;
    FETCH cursor_pontos INTO lat_anterior, lon_anterior;

    read_loop: LOOP
        FETCH cursor_pontos INTO lat_atual, lon_atual;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET total_distancia = total_distancia +
            calcular_distancia_haversine(lat_anterior, lon_anterior, lat_atual, lon_atual);

        SET lat_anterior = lat_atual;
        SET lon_anterior = lon_atual;
    END LOOP;

    CLOSE cursor_pontos;

    -- Atualizar registro em rotas_historico
    UPDATE rotas_historico rh
    SET
        rh.distancia_total = total_distancia,
        rh.duracao_minutos = (
            SELECT TIMESTAMPDIFF(MINUTE, MIN(timestamp), MAX(timestamp))
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.velocidade_media = (
            SELECT
                CASE
                    WHEN SUM(CASE WHEN velocidade IS NOT NULL THEN 1 ELSE 0 END) > 0
                    THEN AVG(velocidade)
                    ELSE NULL
                END
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.velocidade_maxima = (
            SELECT MAX(velocidade)
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        ),
        rh.total_pontos = (
            SELECT COUNT(*)
            FROM gps_tracking
            WHERE uso_veiculo_id = p_uso_veiculo_id
        )
    WHERE rh.uso_veiculo_id = p_uso_veiculo_id;
END$$

DELIMITER ;

-- Recalcular todas as rotas com distância NULL
CALL recalcular_todas_rotas();
```

---

## 🔧 Implementação Backend

### Estrutura de Arquivos

```
api/
├── router.php                  # Roteador principal
├── index.php                   # Fallback router
├── config/
│   ├── database.php           # Conexão + helper getConnection()
│   └── cors.php               # Headers CORS
├── controllers/
│   └── GPSController.php      # Controller GPS
└── gps/
    ├── active.php             # GET /gps/active
    ├── update.php             # POST /gps/update
    ├── stop.php               # POST /gps/stop
    ├── history.php            # GET /gps/history/{id}
    └── vehicle.php            # GET /gps/vehicle/{id}
```

### 1. Router Configuration (`router.php`)

```php
<?php
/**
 * Router para PHP Built-in Server
 * IMPORTANTE: Iniciar servidor com: php -S localhost:5000 router.php
 */

// Iniciar sessão ANTES de qualquer output
session_start();

// Definir diretório base
define('BASE_DIR', __DIR__);

// Parsear URL e método
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Log de requisições (opcional, para debug)
error_log("[$method] $uri");

// Rotas GPS (arquivos separados para melhor organização)
$routes = [
    '/gps/active' => '/gps/active.php',
    '/gps/update' => '/gps/update.php',
    '/gps/stop' => '/gps/stop.php'
];

// Rotas dinâmicas com parâmetros
$dynamicRoutes = [
    '/gps/history/' => '/gps/history.php',
    '/gps/vehicle/' => '/gps/vehicle.php'
];

// Verificar rota exata
if (isset($routes[$uri])) {
    $file = BASE_DIR . $routes[$uri];
    if (file_exists($file)) {
        require $file;
        exit();
    }
}

// Verificar rotas dinâmicas
foreach ($dynamicRoutes as $pattern => $file) {
    if (strpos($uri, $pattern) === 0) {
        $filePath = BASE_DIR . $file;
        if (file_exists($filePath)) {
            // Extrair ID da URL
            $id = substr($uri, strlen($pattern));
            $_GET['id'] = $id;
            require $filePath;
            exit();
        }
    }
}

// Fallback: passar para index.php (outras rotas)
require BASE_DIR . '/index.php';
exit();
```

### 2. Database Helper (`config/database.php`)

```php
<?php
/**
 * Adicionar ao final do arquivo database.php existente
 */

/**
 * Função helper global para obter conexão com banco de dados
 * @return PDO Conexão PDO com o banco
 */
function getConnection() {
    $database = new Database();
    return $database->getConnection();
}
```

### 3. CORS Configuration (`config/cors.php`)

```php
<?php
/**
 * Configuração CORS - CRÍTICO para funcionamento do GPS
 */

$allowed_origins = [
    'http://localhost:5179',
    'http://127.0.0.1:5179',
    // Adicione suas origens de produção aqui
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else if (!empty($origin)) {
    // Desenvolvimento: refletir origem
    header("Access-Control-Allow-Origin: {$origin}");
}

header('Vary: Origin');
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Responder OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

### 4. GPS Controller (`controllers/GPSController.php`)

```php
<?php
/**
 * GPS Controller - Controlador principal
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
     * Recebe e armazena localização GPS
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
                sendError('Dados incompletos', 400);
            }

            $vehicleId = (int)$data['vehicleId'];
            $driverId = (int)$data['driverId'];
            $usageId = isset($data['usageId']) ? (int)$data['usageId'] : null;

            // Inserir localização
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
            // Usar view otimizada
            // IMPORTANTE: Timeout de 180 segundos (3 minutos)
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

            // Converter tipos para JSON correto
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
     * POST /gps/stop
     * Para rastreamento GPS ao finalizar viagem
     */
    public function stopTracking($data) {
        try {
            if (!isset($_SESSION['user_id'])) {
                sendError('Não autorizado', 401);
            }

            if (empty($data['usageId'])) {
                sendError('ID da viagem é obrigatório', 400);
            }

            $usageId = (int)$data['usageId'];

            // Desativar todos os pontos GPS desta viagem
            $query = "UPDATE gps_tracking
                      SET active = 0
                      WHERE uso_veiculo_id = :usage_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $stmt->execute();

            sendSuccess('Rastreamento parado com sucesso', [
                'pointsDeactivated' => $stmt->rowCount()
            ]);

        } catch (Exception $e) {
            sendError('Erro ao parar rastreamento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /gps/history/{id}
     * Retorna histórico completo de rota com estatísticas e dados da viagem
     */
    public function getRouteHistory($usageId) {
        try {
            if (!isset($_SESSION['user_id'])) {
                sendError('Não autorizado', 401);
            }

            if (empty($usageId)) {
                sendError('ID da viagem é obrigatório', 400);
            }

            $usageId = (int)$usageId;

            // Buscar pontos GPS da rota
            $pointsQuery = "SELECT
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

            $pointsStmt = $this->db->prepare($pointsQuery);
            $pointsStmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $pointsStmt->execute();
            $points = $pointsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Buscar estatísticas do histórico
            $historyQuery = "SELECT
                            total_pontos as totalPoints,
                            distancia_total,
                            duracao_minutos as durationMinutes,
                            velocidade_media,
                            velocidade_maxima,
                            latitude_inicio,
                            longitude_inicio,
                            latitude_fim,
                            longitude_fim
                           FROM rotas_historico
                           WHERE uso_veiculo_id = :usage_id
                           LIMIT 1";

            $historyStmt = $this->db->prepare($historyQuery);
            $historyStmt->bindParam(':usage_id', $usageId, PDO::PARAM_INT);
            $historyStmt->execute();
            $history = $historyStmt->fetch(PDO::FETCH_ASSOC);

            // Buscar dados da viagem com COALESCE para destino
            // IMPORTANTE: JOIN com tabela destinos para obter nome via foreign key
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
            sendError('Erro ao obter histórico: ' . $e->getMessage(), 500);
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
```

### 5. GPS Routes

**Arquivo**: `api/gps/active.php`
```php
<?php
// Sessão já iniciada pelo router
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../controllers/GPSController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

$controller = new GPSController();
$controller->getActiveVehicles();
```

**Arquivo**: `api/gps/update.php`
```php
<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../controllers/GPSController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$controller = new GPSController();
$controller->updateLocation($data);
```

**Arquivo**: `api/gps/stop.php`
```php
<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../controllers/GPSController.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$controller = new GPSController();
$controller->stopTracking($data);
```

**Arquivo**: `api/gps/history.php`
```php
<?php
/**
 * GET /gps/history/{id}
 * Retorna histórico de rota de uma viagem com estatísticas completas
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

// Obter ID da URL (passado pelo router)
$usageId = isset($_GET['id']) ? $_GET['id'] : null;

if (empty($usageId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID da viagem é obrigatório']);
    exit;
}

// Criar controller e processar
$controller = new GPSController();
$controller->getRouteHistory($usageId);
```

**Exemplo de Resposta** (`/gps/history/15`):
```json
{
  "success": true,
  "message": "Histórico de rota obtido com sucesso",
  "data": {
    "points": [
      {
        "id": 123,
        "latitude": -23.5505,
        "longitude": -46.6333,
        "accuracy": 15.5,
        "speed": 12.5,
        "altitude": 760.0,
        "heading": 90.0,
        "timestamp": "2025-01-07 10:00:00"
      },
      ...
    ],
    "totalPoints": 45,
    "history": {
      "totalPoints": 45,
      "distancia_total": "12.50",
      "durationMinutes": 45,
      "velocidade_media": "35.20",
      "velocidade_maxima": "60.00",
      "latitude_inicio": -23.5505,
      "longitude_inicio": -46.6333,
      "latitude_fim": -23.5525,
      "longitude_fim": -46.6353
    },
    "usage": {
      "destination": "Posto Jaçanã",
      "departureTime": "2025-01-07 10:00:00",
      "returnTime": "2025-01-07 10:45:00",
      "vehiclePlate": "ABC-1234",
      "driverName": "Leonardo Selvaggi"
    }
  }
}
```

**IMPORTANTE - COALESCE para Destino**:
A query usa `COALESCE(d.nome, uv.destino, uv.finalidade, 'Sem destino informado')` para garantir que sempre haja um valor de destino, priorizando:
1. `d.nome` - Nome do destino via JOIN na tabela `destinos` (foreign key `destino_id`)
2. `uv.destino` - Campo texto legacy (pode ser NULL)
3. `uv.finalidade` - Finalidade da viagem como fallback
4. `'Sem destino informado'` - Valor padrão

---

## 💻 Implementação Frontend

### Estrutura de Arquivos

```
js/
├── api.js               # Funções de API
├── mobile-driver.js     # Captura GPS (motorista)
└── gps-tracking.js      # Visualização mapa (dashboard)
```

### 1. API Integration (`js/api.js`)

```javascript
const API_URL = 'http://localhost:5000';

/**
 * Enviar coordenadas GPS para o backend
 */
async function apiSendGPS(gpsData) {
    return await apiRequest('/gps/update', {
        method: 'POST',
        body: JSON.stringify(gpsData)
    });
}

/**
 * Obter veículos ativos com GPS
 */
async function apiGetActiveVehicles() {
    return await apiRequest('/gps/active');
}

/**
 * Parar rastreamento GPS
 */
async function apiStopGPS(usageId) {
    return await apiRequest('/gps/stop', {
        method: 'POST',
        body: JSON.stringify({ usageId })
    });
}

/**
 * Função genérica de requisição (já existe no projeto)
 */
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = 'index.html';
            throw new Error('Sessão expirada');
        }
        throw new Error(`Erro ${response.status}`);
    }

    return await response.json();
}
```

### 2. GPS Capture - Mobile Driver (`js/mobile-driver.js`)

```javascript
// ===========================
// VARIÁVEIS GLOBAIS GPS
// ===========================
let gpsTracking = false;
let gpsInterval = null;
let currentUsageId = null;
let lastGpsPosition = null;

// ===========================
// INICIAR RASTREAMENTO GPS
// ===========================
async function startGPSTracking(usageId, vehicleId) {
    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada');
        showToast('GPS não disponível neste dispositivo', 'error');
        return false;
    }

    try {
        // Solicitar permissão
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,  // IMPORTANTE: Alta precisão
                timeout: 10000,
                maximumAge: 0
            });
        });

        console.log('GPS autorizado, iniciando rastreamento...');
        currentUsageId = usageId;
        gpsTracking = true;

        // Atualizar indicador visual IMEDIATAMENTE
        updateGPSIndicator(true);

        // Capturar posição inicial
        await captureAndSendGPS(position, vehicleId);

        // Rastreamento contínuo a cada 3 minutos
        gpsInterval = setInterval(async () => {
            if (!gpsTracking) {
                clearInterval(gpsInterval);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await captureAndSendGPS(pos, vehicleId);
                },
                (error) => {
                    console.error('Erro ao obter GPS:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }, 180000); // 3 minutos = 180000 ms

        showToast('Rastreamento GPS ativado', 'success');
        return true;

    } catch (error) {
        console.error('Erro ao iniciar GPS:', error);
        let errorMsg = 'Erro ao ativar GPS';

        // Mensagens de erro específicas
        if (error.code === 1) {
            errorMsg = 'GPS negado. Por favor, autorize o acesso à localização';
        } else if (error.code === 2) {
            errorMsg = 'Localização indisponível';
        } else if (error.code === 3) {
            errorMsg = 'Tempo esgotado ao obter localização';
        }

        showToast(errorMsg, 'error');
        return false;
    }
}

// ===========================
// PARAR RASTREAMENTO GPS
// ===========================
async function stopGPSTracking() {
    if (!gpsTracking) return;

    gpsTracking = false;

    if (gpsInterval) {
        clearInterval(gpsInterval);
        gpsInterval = null;
    }

    // Notificar backend
    if (currentUsageId) {
        try {
            await apiStopGPS(currentUsageId);
            console.log('Rastreamento GPS finalizado');
        } catch (error) {
            console.error('Erro ao parar GPS no servidor:', error);
        }
    }

    currentUsageId = null;
    lastGpsPosition = null;

    // Atualizar indicador visual
    updateGPSIndicator(false);

    showToast('Rastreamento GPS desativado', 'info');
}

// ===========================
// CAPTURAR E ENVIAR GPS
// ===========================
async function captureAndSendGPS(position, vehicleId) {
    const coords = position.coords;

    // Preparar dados GPS
    const gpsData = {
        vehicleId: vehicleId,
        driverId: currentDriver.id,
        usageId: currentUsageId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null,
        speed: coords.speed || null,
        altitude: coords.altitude || null,
        heading: coords.heading || null,
        timestamp: new Date().toISOString()
    };

    // OTIMIZAÇÃO: Só enviar se movimento > 10 metros
    if (lastGpsPosition) {
        const distance = calculateDistance(
            lastGpsPosition.latitude,
            lastGpsPosition.longitude,
            coords.latitude,
            coords.longitude
        );

        if (distance < 10) {
            console.log('Posição não mudou significativamente, ignorando...');
            return;
        }
    }

    try {
        // Enviar para o servidor
        await apiSendGPS(gpsData);
        console.log('GPS enviado:', {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            accuracy: Math.round(coords.accuracy) + 'm'
        });

        lastGpsPosition = {
            latitude: coords.latitude,
            longitude: coords.longitude
        };

        // Atualizar indicador visual
        updateGPSIndicator(true);

    } catch (error) {
        console.error('Erro ao enviar GPS:', error);
        updateGPSIndicator(false);
    }
}

// ===========================
// CALCULAR DISTÂNCIA (Haversine)
// ===========================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
}

// ===========================
// ATUALIZAR INDICADOR VISUAL
// ===========================
function updateGPSIndicator(active) {
    const indicator = document.getElementById('gpsIndicator');
    if (indicator) {
        if (active) {
            indicator.innerHTML = `
                <svg width="16" height="16" fill="currentColor" class="gps-active">
                    <circle cx="8" cy="8" r="3" fill="#10b981"/>
                    <path d="M8 0v3m0 10v3M0 8h3m10 0h3" stroke="#10b981" stroke-width="2"/>
                </svg>
                <span>GPS Ativo</span>
            `;
            indicator.className = 'gps-indicator active';
        } else {
            indicator.innerHTML = `
                <svg width="16" height="16" fill="currentColor" class="gps-inactive">
                    <circle cx="8" cy="8" r="3" fill="#94a3b8"/>
                    <path d="M8 0v3m0 10v3M0 8h3m10 0h3" stroke="#94a3b8" stroke-width="1"/>
                </svg>
                <span>GPS Inativo</span>
            `;
            indicator.className = 'gps-indicator inactive';
        }
    }
}

// ===========================
// INTEGRAÇÃO COM CRIAÇÃO DE ROTA
// ===========================
async function createNewRoute() {
    // ... código existente de criação de rota ...

    const newUsageId = response.data?.id || response.id;

    // Iniciar GPS para esta viagem
    if (newUsageId) {
        const gpsStarted = await startGPSTracking(newUsageId, vehicleId);
        if (gpsStarted) {
            console.log('GPS iniciado para viagem ID:', newUsageId);
        }
    }

    // ... resto do código ...
}

// ===========================
// INTEGRAÇÃO COM FINALIZAÇÃO
// ===========================
async function finalizeRoute() {
    const routeId = parseInt(document.getElementById('finalizeRouteId').value);

    // Parar GPS se estiver rastreando esta rota
    if (currentUsageId === routeId) {
        await stopGPSTracking();
    }

    // ... resto do código de finalização ...
}

// ===========================
// INICIALIZAÇÃO
// ===========================
document.addEventListener('DOMContentLoaded', async function() {
    // ... código existente ...

    // Inicializar indicador GPS baseado no estado atual
    if (gpsTracking) {
        updateGPSIndicator(true);
    } else {
        updateGPSIndicator(false);
    }
});
```

---

## 🗺️ Integração com Mapas

### 1. Incluir Leaflet.js no HTML

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>

    <style>
        /* Container do mapa */
        #gpsMapContainer {
            height: 600px;
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div id="gpsMapContainer"></div>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>

    <script src="js/gps-tracking.js"></script>
</body>
</html>
```

### 2. GPS Tracking Map (`js/gps-tracking.js`)

```javascript
// ===========================
// VARIÁVEIS GLOBAIS
// ===========================
let gpsMap = null;
let vehicleMarkers = {};
let updateInterval = null;

// ===========================
// INICIALIZAR MAPA
// ===========================
function initGPSMap() {
    // Criar mapa centrado no Brasil
    gpsMap = L.map('gpsMapContainer').setView([-14.235, -51.9253], 4);

    // Adicionar tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 3
    }).addTo(gpsMap);

    // Carregar veículos imediatamente
    updateVehicleMarkers();

    // Iniciar atualização automática
    startAutoUpdate();

    console.log('Mapa GPS inicializado com sucesso');
}

// ===========================
// ATUALIZAR MARCADORES
// ===========================
async function updateVehicleMarkers() {
    if (!gpsMap) {
        console.warn('Mapa GPS não inicializado');
        return;
    }

    try {
        // Buscar veículos ativos da API
        const data = await apiGetActiveVehicles();
        console.log('📡 Resposta da API /gps/active:', data);

        const vehicles = data.vehicles || [];
        console.log(`🚗 Atualizando ${vehicles.length} veículos ativos no mapa`);

        if (vehicles.length > 0) {
            console.log('🔍 Primeiro veículo:', vehicles[0]);
        }

        // Limpar marcadores antigos
        Object.keys(vehicleMarkers).forEach(vehicleId => {
            const stillActive = vehicles.find(v => v.vehicleId == vehicleId);
            if (!stillActive) {
                gpsMap.removeLayer(vehicleMarkers[vehicleId]);
                delete vehicleMarkers[vehicleId];
            }
        });

        // Atualizar ou criar marcadores
        vehicles.forEach(vehicle => {
            const { vehicleId, plate, model, latitude, longitude, driverName, timestamp, speed } = vehicle;

            console.log(`📍 Processando veículo ${plate}:`, {
                vehicleId,
                latitude,
                longitude,
                driverName
            });

            if (!latitude || !longitude) {
                console.warn(`⚠️ Veículo ${plate} sem coordenadas GPS`);
                return;
            }

            const position = [parseFloat(latitude), parseFloat(longitude)];
            console.log(`✅ Posição válida para ${plate}:`, position);

            // Se marcador já existe, atualizar
            if (vehicleMarkers[vehicleId]) {
                console.log(`🔄 Atualizando marcador existente de ${plate}`);
                vehicleMarkers[vehicleId].setLatLng(position);
                vehicleMarkers[vehicleId].setPopupContent(createPopupContent(vehicle));
            } else {
                // Criar novo marcador
                console.log(`➕ Criando novo marcador para ${plate}`);
                const marker = L.marker(position, {
                    icon: createVehicleIcon('#3b82f6')
                }).addTo(gpsMap);

                marker.bindPopup(createPopupContent(vehicle));
                vehicleMarkers[vehicleId] = marker;
                console.log(`✨ Marcador criado com sucesso para ${plate}`);
            }
        });

        // Ajustar zoom para mostrar todos os veículos
        if (vehicles.length > 0 && Object.keys(vehicleMarkers).length > 0) {
            const group = L.featureGroup(Object.values(vehicleMarkers));
            gpsMap.fitBounds(group.getBounds().pad(0.1));
        }

    } catch (error) {
        console.error('Erro ao atualizar marcadores:', error);
    }
}

// ===========================
// CRIAR ÍCONE DE VEÍCULO (SVG)
// ===========================
function createVehicleIcon(color = '#3b82f6') {
    return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
            <div style="position: relative;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="${color}">
                    <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M5 11V17C5 17.5523 5.44772 18 6 18H7C7.55228 18 8 17.5523 8 17V16M19 11H21M19 11V17C19 17.5523 18.5523 18 18 18H17C16.4477 18 16 17.5523 16 17V16M8 16H16M8 16C8 17.1046 7.10457 18 6 18C4.89543 18 4 17.1046 4 16C4 14.8954 4.89543 14 6 14C7.10457 14 8 14.8954 8 16ZM16 16C16 17.1046 16.8954 18 18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16Z" stroke="white" stroke-width="1.5"/>
                </svg>
                <!-- Indicador pulsante -->
                <div style="position: absolute; top: -8px; right: -8px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; animation: pulse 2s infinite;"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

// ===========================
// CRIAR CONTEÚDO DO POPUP
// ===========================
function createPopupContent(vehicle) {
    const { plate, model, driverName, timestamp, speed, accuracy } = vehicle;

    const timeAgo = timestamp ? getTimeAgo(new Date(timestamp)) : 'Desconhecido';
    const speedText = speed ? `${Math.round(speed * 3.6)} km/h` : 'N/A';
    const accuracyText = accuracy ? `±${Math.round(accuracy)}m` : 'N/A';

    return `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
                <strong>${plate}</strong>
            </h4>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Modelo:</strong> ${model || 'N/A'}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Motorista:</strong> ${driverName || 'N/A'}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Velocidade:</strong> ${speedText}
            </p>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">
                <strong>Precisão:</strong> ${accuracyText}
            </p>
            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">
                <strong>Atualizado:</strong> ${timeAgo}
            </p>
        </div>
    `;
}

// ===========================
// ATUALIZAÇÃO AUTOMÁTICA
// ===========================
function startAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    updateInterval = setInterval(() => {
        updateVehicleMarkers();
    }, 180000); // 3 minutos

    console.log('Atualização automática do mapa GPS iniciada (3 minutos)');
}

function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('Atualização automática do mapa GPS parada');
    }
}

// ===========================
// HELPER: Tempo Decorrido
// ===========================
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
}

// ===========================
// CSS PARA ANIMAÇÃO PULSANTE
// ===========================
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.7;
        }
    }

    .custom-vehicle-marker {
        background: transparent;
        border: none;
    }
`;
document.head.appendChild(style);

// ===========================
// EXPORTAR FUNÇÕES
// ===========================
window.initGPSMap = initGPSMap;
window.updateVehicleMarkers = updateVehicleMarkers;
window.stopAutoUpdate = stopAutoUpdate;
```

---

## 🗺️ Route History - Overlay Glassmorphic Moderno

### Visão Geral

Sistema de visualização de histórico de rotas com overlay translúcido moderno exibindo 5 informações-chave:
- **Pontos**: Total de coordenadas GPS capturadas
- **Distância**: Distância total percorrida (km)
- **Duração**: Tempo total da viagem (minutos)
- **Vel. Média**: Velocidade média (km/h)
- **Destino**: Nome do destino da viagem

### Arquitetura do Sistema

```
┌──────────────────┐
│ Sidebar Rotas    │ ← Usuário clica em card de rota
│  (Cards)         │
└────────┬─────────┘
         │ 1. selectRouteFromSidebar(id, element, routeData)
         ↓
┌──────────────────┐
│ currentRouteData │ ← Armazena dados completos da rota
│  (Global Var)    │   (destino, horários, veículo, etc)
└────────┬─────────┘
         │ 2. loadRouteHistoryFromSidebar(id)
         ↓
┌──────────────────┐
│ GET /gps/        │ ← API retorna points + history + usage
│  history/{id}    │
└────────┬─────────┘
         │ 3. displayRouteInfoOverlay(data)
         ↓
┌──────────────────┐
│ Overlay          │ ← Renderiza 5 stats no mapa
│  Glassmorphic    │   Posição: inferior esquerdo
└──────────────────┘
```

### 1. HTML Structure

```html
<!-- No dashboard.html, dentro do container do mapa -->
<div id="routeMapContainer" style="position: relative; height: 600px;">
    <!-- Mapa Leaflet -->
    <div id="routeMap" style="width: 100%; height: 100%;"></div>

    <!-- Overlay de informações da rota -->
    <div id="routeInfoOverlay" class="route-info-capsule" style="display: none;">
        <!-- Conteúdo será renderizado dinamicamente pelo JavaScript -->
    </div>
</div>
```

### 2. CSS Glassmorphic

```css
/* Overlay principal - Glassmorphic translúcido */
.route-info-capsule {
    position: absolute;
    bottom: 20px;
    left: 20px;              /* Inferior esquerdo */
    z-index: 1000;

    /* Formato cápsula vertical - GLASSMORPHIC TRANSLÚCIDO */
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 20px;
    padding: 16px 20px;
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);

    /* Layout vertical em coluna */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
    flex-wrap: nowrap;

    /* Largura reduzida para vertical */
    min-width: 200px;
    max-width: 350px;

    /* Transições suaves */
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Hover effect */
.route-info-capsule:hover {
    background: rgba(255, 255, 255, 0.2);
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
}

/* Item de estatística */
.route-stat-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0;
    border: none;
    white-space: nowrap;
    width: 100%;
}

/* Separador entre items */
.route-stat-item:not(:last-child) {
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.25);
}

/* Label do stat */
.route-stat-label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Valor do stat */
.route-stat-value {
    font-size: 15px;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Responsivo - Mobile */
@media (max-width: 768px) {
    .route-info-capsule {
        left: 10px;
        bottom: 10px;
        min-width: 180px;
        max-width: 300px;
        padding: 12px 16px;
        gap: 8px;
    }

    .route-stat-label {
        font-size: 11px;
    }

    .route-stat-value {
        font-size: 13px;
    }
}
```

### 3. JavaScript - Sidebar Integration

```javascript
// ===========================
// VARIÁVEL GLOBAL
// ===========================
let currentRouteData = null; // Armazena dados completos da rota selecionada

// ===========================
// RENDERIZAR SIDEBAR DE ROTAS
// ===========================
function renderRouteSidebar(routes) {
    const sidebar = document.getElementById('routeSidebar');

    if (routes.length === 0) {
        sidebar.innerHTML = '<p>Nenhuma rota disponível</p>';
        return;
    }

    const html = routes.map(route => {
        // Preparar dados da rota para data-attribute
        const routeJson = JSON.stringify(route);

        return `
            <div class="route-card"
                 data-route="${routeJson.replace(/"/g, '&quot;')}"
                 onclick="selectRouteFromSidebar(${route.id}, this, JSON.parse(this.dataset.route))">
                <div class="route-header">
                    <span class="route-vehicle">${route.vehiclePlate}</span>
                    <span class="route-date">${formatDate(route.departureTime)}</span>
                </div>
                <div class="route-info">
                    <span>${route.driverName}</span>
                    <span>${route.destination || 'N/A'}</span>
                </div>
            </div>
        `;
    }).join('');

    sidebar.innerHTML = html;
}

// ===========================
// SELECIONAR ROTA DO SIDEBAR
// ===========================
function selectRouteFromSidebar(usageId, element, routeData = null) {
    console.log(`🎯 Rota selecionada: ${usageId}`);

    // Armazenar dados completos da rota
    currentRouteData = routeData;
    console.log('📦 Dados da rota armazenados:', currentRouteData);

    // Remover active de todos os cards
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.remove('active');
    });

    // Adicionar active ao card clicado
    if (element) {
        element.classList.add('active');
    }

    // Carregar rota no mapa
    loadRouteHistoryFromSidebar(usageId);
}

// ===========================
// CARREGAR HISTÓRICO DA ROTA
// ===========================
async function loadRouteHistoryFromSidebar(usageId) {
    try {
        const response = await fetch(`${API_URL}/gps/history/${usageId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro ao carregar rota');
        }

        // Exibir rota no mapa
        displayRouteOnMap(data.data);

        // Exibir overlay com informações
        displayRouteInfoOverlay(data.data);

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        alert('Erro ao carregar rota: ' + error.message);
    }
}
```

### 4. JavaScript - Overlay Rendering

```javascript
// ===========================
// EXIBIR OVERLAY DE INFORMAÇÕES
// ===========================
function displayRouteInfoOverlay(data) {
    const overlay = document.getElementById('routeInfoOverlay');

    if (!overlay) {
        console.warn('⚠️ Overlay não encontrado');
        return;
    }

    const points = data.points || [];
    const history = data.history || calculateRouteStats(points);
    const usage = data.usage || {}; // Dados da viagem da API

    // Fallback: usar currentRouteData se usage não estiver disponível
    const routeData = usage.destination ? usage : (currentRouteData || {});

    const totalPontos = data.totalPoints || points.length;
    const distancia = history.distancia_total ? history.distancia_total.toFixed(2) + ' km' : 'N/A';

    // Priorizar duração do banco de dados (usage ou currentRouteData)
    let duracao = 'N/A';
    if (usage.departureTime && usage.returnTime) {
        // Calcular duração a partir de timestamps da API
        const saida = new Date(usage.departureTime).getTime();
        const retorno = new Date(usage.returnTime).getTime();
        const minutos = Math.round((retorno - saida) / 1000 / 60);
        duracao = minutos + ' min';
    } else if (routeData.departureTime && routeData.returnTime) {
        // Fallback para currentRouteData
        const saida = new Date(routeData.departureTime).getTime();
        const retorno = new Date(routeData.returnTime).getTime();
        const minutos = Math.round((retorno - saida) / 1000 / 60);
        duracao = minutos + ' min';
    } else if (history.duracao_minutos || history.durationMinutes) {
        // Fallback para dados do histórico
        duracao = Math.round(history.duracao_minutos || history.durationMinutes) + ' min';
    }

    const velocidade = history.velocidade_media ? Math.round(history.velocidade_media) + ' km/h' : 'N/A';

    // Obter destino (priorizar API, fallback para currentRouteData)
    const destino = usage.destination || routeData.destination || routeData.destino || 'N/A';

    console.log('🔍 DEBUG Overlay - usage:', usage);
    console.log('🔍 DEBUG Overlay - destino:', destino);

    // Renderizar overlay
    overlay.innerHTML = `
        <div class="route-stat-item">
            <span class="route-stat-label">Pontos:</span>
            <span class="route-stat-value">${totalPontos}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Distância:</span>
            <span class="route-stat-value">${distancia}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Duração:</span>
            <span class="route-stat-value">${duracao}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Vel. Média:</span>
            <span class="route-stat-value">${velocidade}</span>
        </div>
        <div class="route-stat-item">
            <span class="route-stat-label">Destino:</span>
            <span class="route-stat-value">${destino}</span>
        </div>
    `;

    overlay.style.display = 'block';
    console.log('✅ Overlay de informações exibido com destino:', destino);
}
```

### 5. Cache Busting

Sempre que atualizar `gps-tracking.js`, incrementar a versão no HTML:

```html
<script src="js/gps-tracking.js?v=24"></script>
```

### Debugging

**Console Logs Importantes**:
```javascript
console.log('📦 Dados da rota armazenados:', currentRouteData);
console.log('🔍 DEBUG Overlay - usage:', usage);
console.log('🔍 DEBUG Overlay - destino:', destino);
```

**Verificar Dados no Network Tab**:
- Request: `GET /gps/history/15`
- Response deve ter: `data.usage.destination = "Posto Jaçanã"`

**Problema Comum**: Destino mostrando N/A
- Verificar se campo `destino_id` está preenchido em `uso_veiculos`
- Verificar se JOIN com `destinos` está retornando dados
- Executar query COALESCE diretamente no MySQL para testar

---

## 🎨 Indicadores Visuais

### HTML do Indicador GPS

```html
<!-- No header do mobile-driver.html -->
<div id="gpsIndicator" class="gps-indicator inactive">
    <svg width="16" height="16" fill="currentColor">
        <circle cx="8" cy="8" r="3" fill="#94a3b8"/>
        <path d="M8 0v3m0 10v3M0 8h3m10 0h3" stroke="#94a3b8" stroke-width="1"/>
    </svg>
    <span>GPS Inativo</span>
</div>
```

### CSS do Indicador

```css
.gps-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.3s ease;
}

.gps-indicator.inactive {
    background: rgba(148, 163, 184, 0.1);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.2);
}

.gps-indicator.active {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
    0%, 100% {
        box-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
    }
    50% {
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
    }
}
```

---

## ⚙️ Configurações de Performance

### Intervalos Recomendados

| Uso | Intervalo Captura | Intervalo Mapa | Timeout Ativo |
|-----|------------------|----------------|---------------|
| **Padrão** | 3 min (180s) | 3 min (180s) | 3 min (180s) |
| **Alta Frequência** | 1 min (60s) | 1 min (60s) | 2 min (120s) |
| **Economia** | 5 min (300s) | 5 min (300s) | 10 min (600s) |
| **Tempo Real** | 30s | 30s | 1 min (60s) |

### Otimizações Aplicadas

1. **Filtro de Movimento**: Só envia GPS se movimento > 10 metros
2. **View Otimizada**: `vw_ultima_localizacao` usa MAX() e GROUP BY
3. **Índices no Banco**: Em `veiculo_id`, `timestamp`, `active`
4. **Timeout no Frontend**: Ignora GPS > 3 minutos
5. **Limpeza de Marcadores**: Remove marcadores inativos do mapa

### Configurar Intervalos

**Mobile (Captura)**:
```javascript
// js/mobile-driver.js - linha 66
}, 180000); // Alterar para o intervalo desejado em ms
```

**Dashboard (Mapa)**:
```javascript
// js/gps-tracking.js - linha 385
}, 180000); // Alterar para o intervalo desejado em ms
```

**Backend (Timeout)**:
```php
// api/controllers/GPSController.php - linha 122
WHERE segundos_desde_atualizacao < 180 // Alterar para timeout em segundos
```

---

## 🧪 Testes e Validação

### Checklist de Testes

#### Backend
- [ ] `curl -s http://localhost:5000/gps/active` retorna JSON válido
- [ ] Envio POST para `/gps/update` salva no banco
- [ ] CORS headers presentes em OPTIONS request
- [ ] Session validation funciona corretamente
- [ ] View `vw_ultima_localizacao` retorna dados

#### Frontend (Mobile)
- [ ] Navegador solicita permissão GPS
- [ ] Indicador muda para "GPS Ativo" (verde)
- [ ] Console mostra logs de GPS enviado
- [ ] Indicador volta para inativo ao finalizar rota
- [ ] Funciona em dispositivos móveis reais

#### Frontend (Dashboard)
- [ ] Mapa Leaflet.js carrega corretamente
- [ ] Marcadores aparecem nas coordenadas corretas
- [ ] Popup mostra informações do veículo
- [ ] Atualização automática funciona
- [ ] Marcadores antigos são removidos

### Comandos de Teste

**Testar Backend**:
```bash
# Testar endpoint active
curl -s http://localhost:5000/gps/active | jq

# Testar CORS
curl -v -X OPTIONS http://localhost:5000/gps/active \
  -H "Origin: http://localhost:5179"

# Enviar GPS manualmente
curl -X POST http://localhost:5000/gps/update \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 1,
    "driverId": 1,
    "usageId": 1,
    "latitude": -14.235,
    "longitude": -51.9253,
    "accuracy": 20
  }'
```

**Verificar Banco**:
```sql
-- Últimos 10 pontos GPS
SELECT * FROM gps_tracking
ORDER BY timestamp DESC
LIMIT 10;

-- Veículos com GPS ativo
SELECT * FROM vw_ultima_localizacao
WHERE segundos_desde_atualizacao < 180;

-- Contar pontos por veículo
SELECT veiculo_id, COUNT(*) as total
FROM gps_tracking
WHERE active = 1
GROUP BY veiculo_id;
```

---

## 🔧 Troubleshooting

### Problema: CORS Error

**Sintoma**: Console mostra "Access-Control-Allow-Origin: Missing Header"

**Solução**:
1. Verificar se `cors.php` está incluído em todos os endpoints GPS
2. Garantir que `session_start()` vem ANTES de incluir `cors.php`
3. Reiniciar servidor PHP: `php -S localhost:5000 router.php`

### Problema: GPS não captura

**Sintoma**: Navegador não solicita permissão ou erro de timeout

**Solução**:
1. **HTTPS**: Em produção, GPS requer HTTPS (exceto localhost)
2. **Permissões**: Verificar configurações do navegador
3. **Timeout**: Aumentar timeout em `getCurrentPosition()` para 15000ms
4. **Device**: Testar em dispositivo com GPS real (não emulador)

### Problema: Veículos não aparecem no mapa

**Sintoma**: Mapa carrega mas sem marcadores

**Soluções**:
1. Abrir console e verificar logs
2. Verificar se `/gps/active` retorna veículos
3. Confirmar que GPS foi enviado há menos de 3 minutos
4. Verificar coordenadas são válidas (não null)

```javascript
// Debug no console
console.log('Veículos:', data.vehicles);
console.log('Total:', data.count);
```

### Problema: JSON Inválido

**Sintoma**: "Unexpected non-whitespace character after JSON"

**Solução**:
1. Verificar se `exit()` está presente após `sendSuccess()` e `sendError()`
2. Garantir que nenhum HTML/text está sendo enviado antes do JSON
3. Verificar warnings PHP não estão sendo exibidos

### Problema: Indicador GPS não muda

**Sintoma**: Indicador permanece inativo após permitir GPS

**Solução**:
Verificar se `updateGPSIndicator(true)` está sendo chamado:
- Após permissão concedida (linha 44 de mobile-driver.js)
- Após envio bem-sucedido de GPS (linha 163)
- Na inicialização da página (linha 343)

### Problema: Destino mostrando N/A no Overlay

**Sintoma**: Overlay de rota exibe "N/A" para destino mesmo com destino cadastrado

**Diagnóstico**:
1. Abrir DevTools → Network → Verificar resposta de `GET /gps/history/{id}`
2. Verificar se `data.usage.destination` está NULL
3. Consultar banco: `SELECT destino, destino_id FROM uso_veiculos WHERE id = X`

**Soluções**:

**Caso 1**: Campo `destino_id` é NULL
```sql
-- Verificar se destinos existem
SELECT * FROM destinos WHERE ativo = 1;

-- Atualizar viagem com destino
UPDATE uso_veiculos SET destino_id = 1 WHERE id = X;
```

**Caso 2**: COALESCE não está funcionando
```sql
-- Testar query COALESCE manualmente
SELECT
    uv.id,
    uv.destino,
    uv.destino_id,
    d.nome as destination_from_join,
    COALESCE(d.nome, uv.destino, uv.finalidade, 'Sem destino informado') as final_destination
FROM uso_veiculos uv
LEFT JOIN destinos d ON uv.destino_id = d.id
WHERE uv.id = X;
```

Se retornar NULL, verificar:
- Tabela `destinos` tem registros com ID correspondente
- Foreign key `destino_id` está correto
- JOIN está usando coluna certa

**Caso 3**: Frontend não está recebendo dados
- Verificar versão do cache: `?v=24` (incrementar se necessário)
- Limpar cache do navegador (Ctrl+Shift+R)
- Verificar console logs: `console.log('🔍 DEBUG Overlay - usage:', usage)`

### Problema: Rotas antigas sem estatísticas (distância/duração NULL)

**Sintoma**: Rotas finalizadas antes da migração para `status = 'finalizado'` não têm estatísticas

**Causa**: Trigger `tr_finalizar_viagem_rota` só dispara para status 'finalizado', rotas antigas usavam 'concluido'

**Solução**:
Execute o script de manutenção:

```bash
# Conectar ao MySQL
mysql -u root -p carcontrol_db

# Executar script
source database/fix_route_statistics.sql
```

Ou execute manualmente:
```sql
-- Recalcular uma rota específica
CALL recalcular_estatisticas_rota(15);

-- Recalcular todas as rotas com problemas
CALL recalcular_todas_rotas();

-- Verificar resultados
SELECT
    id,
    uso_veiculo_id,
    total_pontos,
    distancia_total,
    duracao_minutos,
    velocidade_media
FROM rotas_historico
WHERE uso_veiculo_id IN (15, 16, 17);
```

**Nota**: Se distância = 0.000 km, pode ser:
- Poucos pontos GPS capturados (< 2 pontos)
- Pontos muito próximos (veículo parado)
- GPS não estava funcionando durante a viagem

### Problema: Overlay não aparece no mapa

**Sintoma**: Mapa carrega mas overlay não é exibido

**Diagnóstico**:
```javascript
// No console do navegador
const overlay = document.getElementById('routeInfoOverlay');
console.log('Overlay element:', overlay);
console.log('Display style:', overlay?.style.display);
```

**Soluções**:

1. **Element não existe**: Verificar HTML tem `<div id="routeInfoOverlay">`
2. **Display none**: Verificar se `displayRouteInfoOverlay()` está sendo chamada
3. **Dados vazios**: Verificar se API retorna `data.usage` e `data.history`
4. **CSS não carregado**: Verificar se `.route-info-capsule` existe no CSS
5. **Z-index baixo**: Aumentar `z-index: 1000` no CSS do overlay

---

## ✅ Checklist de Implementação

### 1. Banco de Dados
- [ ] Criar tabela `gps_tracking`
- [ ] Criar tabela `rotas_historico`
- [ ] Criar view `vw_ultima_localizacao`
- [ ] Criar trigger `trg_consolidar_rota`
- [ ] Adicionar índices (veiculo_id, timestamp, active)

### 2. Backend
- [ ] Criar `GPSController.php`
- [ ] Adicionar função `getConnection()` em `database.php`
- [ ] Configurar CORS em `cors.php`
- [ ] Criar arquivos de rota em `/api/gps/`
- [ ] Configurar `router.php` para rotas GPS
- [ ] Testar endpoints com curl

### 3. Frontend - Mobile
- [ ] Adicionar funções GPS em `mobile-driver.js`
- [ ] Criar indicador GPS em HTML
- [ ] Adicionar CSS do indicador
- [ ] Integrar com criação de rota
- [ ] Integrar com finalização de rota
- [ ] Testar em dispositivo real

### 4. Frontend - Dashboard
- [ ] Incluir Leaflet.js no HTML
- [ ] Criar container do mapa
- [ ] Implementar `gps-tracking.js`
- [ ] Criar ícone SVG de veículo
- [ ] Configurar atualização automática
- [ ] Testar visualização

### 5. Testes
- [ ] Testar captura GPS em mobile
- [ ] Testar envio para backend
- [ ] Verificar armazenamento no banco
- [ ] Testar visualização no mapa
- [ ] Testar atualização em tempo real
- [ ] Validar performance

### 6. Produção
- [ ] Configurar HTTPS
- [ ] Restringir CORS para domínios específicos
- [ ] Otimizar consultas do banco
- [ ] Configurar backup de dados GPS
- [ ] Implementar logs de erro
- [ ] Testar em diferentes navegadores/dispositivos

---

## 📚 Referências

### Documentação Oficial

- **Leaflet.js**: https://leafletjs.com/reference.html
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- **OpenStreetMap**: https://www.openstreetmap.org/
- **PHP PDO**: https://www.php.net/manual/en/book.pdo.php
- **MySQL Views**: https://dev.mysql.com/doc/refman/9.0/en/views.html

### Fórmulas e Algoritmos

- **Haversine Formula**: Cálculo de distância entre coordenadas GPS
- **GeoJSON**: Formato padrão para dados geográficos

### Bibliotecas Alternativas

| Biblioteca | Uso |
|------------|-----|
| **Google Maps** | Alternativa paga ao Leaflet |
| **Mapbox** | Mapas customizáveis (freemium) |
| **Socket.io** | Para updates em tempo real (WebSocket) |
| **Chart.js** | Gráficos de velocidade/distância |

---

## 🎓 Conclusão

Este guia fornece uma implementação completa e testada de rastreamento GPS em tempo real. O sistema é:

- ✅ **Escalável**: Suporta múltiplos veículos simultaneamente
- ✅ **Otimizado**: Minimiza uso de dados e recursos
- ✅ **Confiável**: Tratamento robusto de erros
- ✅ **Modular**: Fácil de adaptar para outros projetos
- ✅ **Documentado**: Código bem comentado e explicado

### Próximos Passos Sugeridos

1. **WebSocket**: Substituir polling por Socket.io para updates em tempo real
2. **Geocoding**: Converter coordenadas em endereços (Google Maps API)
3. **Geofencing**: Alertas quando veículo sai de área definida
4. **Histórico**: Replay animado de rotas completas
5. **Analytics**: Dashboard com métricas de velocidade, distância, tempo

---

## 📍 Sistema de GPS para Destinos

### Visão Geral

Sistema complementar que adiciona coordenadas GPS aos destinos cadastrados, permitindo:

- **Geocoding automático** via Nominatim (OpenStreetMap)
- **Seleção manual** via mapa interativo Leaflet
- **Exibição no mapa GPS** com marcadores diferenciados
- **Cálculo de rotas reais** via OSRM (opcional)
- **100% gratuito** - sem API keys necessárias

### Características Principais

| Característica | Valor |
|----------------|-------|
| **Precisão GPS** | DECIMAL(10,8) lat / DECIMAL(11,8) lon (~1.1mm) |
| **Geocoding API** | Nominatim (OpenStreetMap) |
| **Routing API** | OSRM (Open Source Routing Machine) |
| **Map UI** | Leaflet.js (mesma lib do rastreamento) |
| **Cor Marcador** | Verde (destinos) vs Azul (veículos) |
| **Rate Limit** | 1 req/seg Nominatim (aceitável) |

---

### Estrutura de Banco de Dados

#### Migration: Adicionar Coordenadas GPS

**Arquivo**: `database/gps_destinos_migration.sql`

```sql
-- Adicionar campos de GPS à tabela destinos
ALTER TABLE destinos
ADD COLUMN latitude DECIMAL(10, 8) NULL COMMENT 'Latitude do destino' AFTER endereco,
ADD COLUMN longitude DECIMAL(11, 8) NULL COMMENT 'Longitude do destino' AFTER latitude,
ADD INDEX idx_coords (latitude, longitude);

-- IMPORTANTE: NULL permite compatibilidade com destinos antigos
-- Precision: 10,8 = ~1.1mm de precisão na latitude
-- Precision: 11,8 = ~1.1mm de precisão na longitude
```

**Executar Migration**:
```bash
mysql -u root carcontrol_db < database/gps_destinos_migration.sql
```

**Verificar Estrutura**:
```sql
DESCRIBE destinos;
-- Deve mostrar:
-- latitude: decimal(10,8) NULL
-- longitude: decimal(11,8) NULL
-- idx_coords: KEY (latitude, longitude)
```

---

### Implementação Backend

#### 1. Geocoding Service

**Arquivo**: `api/services/GeocodingService.php`

```php
<?php
/**
 * Geocoding Service
 * Converte endereços em coordenadas GPS usando Nominatim (OpenStreetMap)
 * API: 100% gratuita, sem necessidade de API key
 *
 * Rate Limiting: 1 requisição por segundo (Nominatim policy)
 * User-Agent obrigatório: conforme política do Nominatim
 */

class GeocodingService {

    /**
     * Geocode address to coordinates (Endereço → Latitude/Longitude)
     *
     * @param string $address Endereço completo (ex: "Av. Paulista, 1000 - São Paulo/SP")
     * @return array|false ['latitude' => float, 'longitude' => float, 'display_name' => string] ou false
     */
    public static function geocodeAddress($address) {
        if (empty($address)) {
            error_log("GeocodingService: Empty address provided");
            return false;
        }

        // URL da API Nominatim (OpenStreetMap)
        $baseUrl = 'https://nominatim.openstreetmap.org/search';

        $params = http_build_query([
            'q' => $address,
            'format' => 'json',
            'limit' => 1,              // Retornar apenas o melhor resultado
            'addressdetails' => 1      // Incluir detalhes do endereço
        ]);

        $url = $baseUrl . '?' . $params;

        // Configurar contexto HTTP
        // User-Agent é OBRIGATÓRIO pela política do Nominatim
        $context = stream_context_create([
            'http' => [
                'header' => "User-Agent: CarControl/1.0 (Fleet Management System)\r\n",
                'timeout' => 10
            ]
        ]);

        try {
            error_log("GeocodingService: Geocoding address: $address");

            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                error_log("GeocodingService: Failed to fetch from Nominatim API");
                return false;
            }

            $data = json_decode($response, true);

            if (empty($data) || !isset($data[0])) {
                error_log("GeocodingService: No results found for address: $address");
                return false;
            }

            $result = $data[0];

            if (!isset($result['lat']) || !isset($result['lon'])) {
                error_log("GeocodingService: Invalid response - missing coordinates");
                return false;
            }

            $latitude = (float)$result['lat'];
            $longitude = (float)$result['lon'];

            error_log("GeocodingService: Success - Lat: $latitude, Lon: $longitude");

            return [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'display_name' => $result['display_name'] ?? $address,
                'type' => $result['type'] ?? null,
                'importance' => $result['importance'] ?? null
            ];

        } catch (Exception $e) {
            error_log("GeocodingService: Exception - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Reverse geocode (Latitude/Longitude → Endereço)
     */
    public static function reverseGeocode($latitude, $longitude) {
        // Validar coordenadas
        if (!is_numeric($latitude) || !is_numeric($longitude)) {
            error_log("GeocodingService: Invalid coordinates");
            return false;
        }

        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            error_log("GeocodingService: Coordinates out of range");
            return false;
        }

        $baseUrl = 'https://nominatim.openstreetmap.org/reverse';

        $params = http_build_query([
            'lat' => $latitude,
            'lon' => $longitude,
            'format' => 'json',
            'addressdetails' => 1
        ]);

        $url = $baseUrl . '?' . $params;

        $context = stream_context_create([
            'http' => [
                'header' => "User-Agent: CarControl/1.0 (Fleet Management System)\r\n",
                'timeout' => 10
            ]
        ]);

        try {
            error_log("GeocodingService: Reverse geocoding - Lat: $latitude, Lon: $longitude");

            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                error_log("GeocodingService: Failed to fetch reverse geocode");
                return false;
            }

            $data = json_decode($response, true);

            if (!isset($data['display_name'])) {
                error_log("GeocodingService: No address found for coordinates");
                return false;
            }

            return $data['display_name'];

        } catch (Exception $e) {
            error_log("GeocodingService: Reverse geocode exception - " . $e->getMessage());
            return false;
        }
    }
}
```

#### 2. Routing Service (Opcional)

**Arquivo**: `api/services/RoutingService.php`

```php
<?php
/**
 * Routing Service
 * Calcula rotas reais entre dois pontos usando OSRM
 * API: 100% gratuita, sem necessidade de API key
 */

class RoutingService {

    /**
     * Calcular rota real entre dois pontos GPS
     * IMPORTANTE: OSRM usa formato longitude,latitude (não latitude,longitude!)
     *
     * @return array ['distance_km', 'duration_minutes', 'geometry', 'steps']
     */
    public static function calculateRoute($fromLat, $fromLon, $toLat, $toLon) {
        // Validações
        if (!is_numeric($fromLat) || !is_numeric($fromLon) ||
            !is_numeric($toLat) || !is_numeric($toLon)) {
            error_log("RoutingService: Invalid coordinates");
            return false;
        }

        if ($fromLat < -90 || $fromLat > 90 || $toLat < -90 || $toLat > 90) {
            error_log("RoutingService: Latitude out of range");
            return false;
        }

        if ($fromLon < -180 || $fromLon > 180 || $toLon < -180 || $toLon > 180) {
            error_log("RoutingService: Longitude out of range");
            return false;
        }

        // API pública do OSRM
        $baseUrl = 'https://router.project-osrm.org/route/v1/driving';

        // FORMATO: /driving/{lon1},{lat1};{lon2},{lat2}
        $url = "{$baseUrl}/{$fromLon},{$fromLat};{$toLon},{$toLat}";
        $url .= "?overview=full&geometries=geojson&steps=true";

        try {
            error_log("RoutingService: Calculating route from ({$fromLat}, {$fromLon}) to ({$toLat}, {$toLon})");

            $context = stream_context_create([
                'http' => ['timeout' => 10]
            ]);

            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                error_log("RoutingService: Failed to fetch route from OSRM");
                return false;
            }

            $data = json_decode($response, true);

            if (!isset($data['routes']) || empty($data['routes'])) {
                error_log("RoutingService: No route found");
                return false;
            }

            $route = $data['routes'][0];

            if (!isset($route['distance']) || !isset($route['duration'])) {
                error_log("RoutingService: Invalid route data");
                return false;
            }

            $distanceMeters = (float)$route['distance'];
            $durationSeconds = (float)$route['duration'];

            $result = [
                'distance_meters' => $distanceMeters,
                'distance_km' => round($distanceMeters / 1000, 2),
                'duration_seconds' => $durationSeconds,
                'duration_minutes' => round($durationSeconds / 60, 1),
                'duration_hours' => round($durationSeconds / 3600, 2),
                'geometry' => $route['geometry'] ?? null,
                'steps' => []
            ];

            // Extrair passos da rota
            if (isset($route['legs'][0]['steps'])) {
                foreach ($route['legs'][0]['steps'] as $step) {
                    $result['steps'][] = [
                        'distance' => $step['distance'] ?? 0,
                        'duration' => $step['duration'] ?? 0,
                        'instruction' => $step['maneuver']['instruction'] ?? '',
                        'type' => $step['maneuver']['type'] ?? ''
                    ];
                }
            }

            error_log("RoutingService: Route calculated - {$result['distance_km']} km, {$result['duration_minutes']} min");

            return $result;

        } catch (Exception $e) {
            error_log("RoutingService: Exception - " . $e->getMessage());
            return false;
        }
    }
}
```

#### 3. Controller de Destinos (Atualização)

**Arquivo**: `api/controllers/DestinationController.php`

Adicionar aos métodos existentes:

```php
public function getAll() {
    try {
        $query = "SELECT
                    id, nome as name, endereco as address,
                    latitude, longitude,  /* NOVO: Coordenadas GPS */
                    distancia_km as distanceKm, observacoes as notes,
                    ativo as active, created_at as createdAt
                  FROM destinos
                  WHERE ativo = 1
                  ORDER BY nome ASC";

        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $destinations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Type casting para JSON correto
        foreach ($destinations as &$dest) {
            $dest['id'] = (int)$dest['id'];
            $dest['distanceKm'] = $dest['distanceKm'] ? (int)$dest['distanceKm'] : null;

            /* NOVO: Type casting GPS */
            $dest['latitude'] = $dest['latitude'] ? (float)$dest['latitude'] : null;
            $dest['longitude'] = $dest['longitude'] ? (float)$dest['longitude'] : null;
        }

        sendResponse([
            'success' => true,
            'data' => $destinations,
            'count' => count($destinations)
        ]);

    } catch (Exception $e) {
        error_log("Get destinations error: " . $e->getMessage());
        sendError('Erro ao listar destinos', 500);
    }
}

public function create($data) {
    try {
        if (empty($data['name'])) {
            sendError('Nome do destino é obrigatório', 400);
        }

        $query = "INSERT INTO destinos
                  (nome, endereco, latitude, longitude, distancia_km, observacoes, ativo)
                  VALUES
                  (:nome, :endereco, :latitude, :longitude, :distancia_km, :observacoes, 1)";

        $stmt = $this->db->prepare($query);

        $stmt->bindParam(':nome', $data['name']);
        $stmt->bindParam(':endereco', $data['address']);

        /* NOVO: Coordenadas GPS (opcionais) */
        $latitude = isset($data['latitude']) ? $data['latitude'] : null;
        $longitude = isset($data['longitude']) ? $data['longitude'] : null;
        $stmt->bindValue(':latitude', $latitude, $latitude === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':longitude', $longitude, $longitude === null ? PDO::PARAM_NULL : PDO::PARAM_STR);

        $stmt->bindParam(':distancia_km', $data['distance']);
        $stmt->bindParam(':observacoes', $data['notes']);

        $stmt->execute();
        $destinationId = $this->db->lastInsertId();

        sendResponse([
            'success' => true,
            'message' => 'Destino criado com sucesso',
            'id' => $destinationId
        ]);

    } catch (Exception $e) {
        error_log("Create destination error: " . $e->getMessage());
        sendError('Erro ao criar destino', 500);
    }
}

public function update($id, $data) {
    try {
        $updates = [];
        $params = [':id' => (int)$id];

        if (isset($data['name'])) {
            $updates[] = "nome = :nome";
            $params[':nome'] = $data['name'];
        }
        if (isset($data['address'])) {
            $updates[] = "endereco = :endereco";
            $params[':endereco'] = $data['address'];
        }
        if (isset($data['distance'])) {
            $updates[] = "distancia_km = :distancia_km";
            $params[':distancia_km'] = $data['distance'];
        }

        /* NOVO: Atualizar coordenadas GPS */
        if (isset($data['latitude'])) {
            $updates[] = "latitude = :latitude";
            $params[':latitude'] = $data['latitude'];
        }
        if (isset($data['longitude'])) {
            $updates[] = "longitude = :longitude";
            $params[':longitude'] = $data['longitude'];
        }

        if (empty($updates)) {
            sendError('Nenhum campo para atualizar', 400);
        }

        $query = "UPDATE destinos SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();

        sendResponse([
            'success' => true,
            'message' => 'Destino atualizado com sucesso'
        ]);

    } catch (Exception $e) {
        error_log("Update destination error: " . $e->getMessage());
        sendError('Erro ao atualizar destino', 500);
    }
}
```

#### 4. Rotas da API

**Arquivo**: `api/index.php`

Adicionar rotas:

```php
// POST /destinations/geocode
if ($uriParts[0] === 'destinations' && isset($uriParts[1]) && $uriParts[1] === 'geocode') {
    if ($method === 'POST') {
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
}

// POST /routes/calculate (Opcional)
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
                'message' => 'Não foi possível calcular a rota'
            ]);
        } else {
            sendResponse([
                'success' => true,
                'route' => $route
            ]);
        }
        exit();
    }
}
```

---

### Implementação Frontend

#### 1. Modal de Destino (HTML)

**Arquivo**: `dashboard.html`

Atualizar modal:

```html
<div id="destinationModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Cadastro de Destino</h2>
            <button class="modal-close" onclick="closeDestinationModal()">×</button>
        </div>

        <form id="destinationForm" onsubmit="event.preventDefault(); addDestination()">
            <!-- Nome -->
            <div class="form-group">
                <label>Nome do Destino:</label>
                <input type="text" id="destinationName" required>
            </div>

            <!-- NOVO: Campo de Endereço com Botão Geocode -->
            <div class="form-group">
                <label>Endereço:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="destinationAddress"
                           placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                           style="flex: 1;">
                    <button type="button" class="btn btn-primary"
                            onclick="geocodeDestinationAddress()">
                        📍 Buscar GPS
                    </button>
                </div>
            </div>

            <!-- NOVO: Mapa Interativo -->
            <div class="form-group">
                <label>Localização no Mapa:</label>
                <div id="destinationMap" style="height: 300px; border-radius: 8px;"></div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="number" id="destinationLatitude"
                           step="any" readonly placeholder="Latitude">
                    <input type="number" id="destinationLongitude"
                           step="any" readonly placeholder="Longitude">
                </div>
                <small class="help-text">
                    🖱️ Clique no mapa para ajustar a localização manualmente<br>
                    📍 Ou use "Buscar GPS" para localizar automaticamente
                </small>
            </div>

            <!-- Distância (Agora Opcional) -->
            <div class="form-group">
                <label>Distância (KM):</label>
                <input type="number" id="destinationDistance"
                       placeholder="Opcional - pode ser calculada pela rota">
                <small class="help-text">Pode ser calculada automaticamente</small>
            </div>

            <!-- Observações -->
            <div class="form-group">
                <label>Observações:</label>
                <textarea id="destinationNotes" rows="3"></textarea>
            </div>

            <button type="submit" class="btn btn-primary">Salvar Destino</button>
        </form>
    </div>
</div>
```

#### 2. JavaScript - Mapa de Destino

**Arquivo**: `js/main.js`

Adicionar funções:

```javascript
// ===========================
// MAPA INTERATIVO DE DESTINO
// ===========================
function initDestinationMap(lat = -23.550520, lon = -46.633308) {
    // Remover mapa existente
    if (window.destinationMapInstance) {
        window.destinationMapInstance.remove();
    }

    // Criar mapa Leaflet
    const map = L.map('destinationMap').setView([lat, lon], 13);
    window.destinationMapInstance = map;

    // Adicionar tiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Criar marcador arrastável
    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);

    // Atualizar coordenadas ao arrastar
    marker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        document.getElementById('destinationLatitude').value = pos.lat.toFixed(8);
        document.getElementById('destinationLongitude').value = pos.lng.toFixed(8);
    });

    // Atualizar marcador ao clicar no mapa
    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        document.getElementById('destinationLatitude').value = e.latlng.lat.toFixed(8);
        document.getElementById('destinationLongitude').value = e.latlng.lng.toFixed(8);
    });

    // Atualizar campos de coordenadas
    document.getElementById('destinationLatitude').value = lat.toFixed(8);
    document.getElementById('destinationLongitude').value = lon.toFixed(8);

    console.log('Mapa de destino inicializado:', { lat, lon });
}

// ===========================
// GEOCODING AUTOMÁTICO
// ===========================
async function geocodeDestinationAddress() {
    const address = document.getElementById('destinationAddress').value.trim();

    if (!address) {
        showAlert('Digite um endereço primeiro', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/destinations/geocode`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });

        const data = await response.json();

        if (data.success && data.latitude && data.longitude) {
            // Atualizar coordenadas
            document.getElementById('destinationLatitude').value = data.latitude.toFixed(8);
            document.getElementById('destinationLongitude').value = data.longitude.toFixed(8);

            // Atualizar mapa
            initDestinationMap(data.latitude, data.longitude);

            showAlert(`Coordenadas encontradas! ${data.formatted_address}`, 'success');
        } else {
            showAlert(data.message || 'Endereço não encontrado', 'warning');
        }

    } catch (error) {
        console.error('Erro ao buscar GPS:', error);
        showAlert('Erro ao buscar coordenadas GPS', 'danger');
    }
}

// ===========================
// CRIAR/ATUALIZAR DESTINO
// ===========================
async function addDestination() {
    const name = document.getElementById('destinationName').value.trim();
    const address = document.getElementById('destinationAddress').value.trim();
    const latitude = parseFloat(document.getElementById('destinationLatitude').value) || null;
    const longitude = parseFloat(document.getElementById('destinationLongitude').value) || null;
    const distance = parseInt(document.getElementById('destinationDistance').value) || null;
    const notes = document.getElementById('destinationNotes').value.trim();

    if (!name) {
        showAlert('Nome do destino é obrigatório', 'danger');
        return;
    }

    const destinationData = {
        name: name,
        address: address,
        latitude: latitude,      // NOVO
        longitude: longitude,    // NOVO
        distance: distance,
        notes: notes
    };

    try {
        let response;

        if (editingDestination) {
            response = await apiUpdateDestination(editingDestination.id, destinationData);
        } else {
            response = await apiCreateDestination(destinationData);
        }

        if (response.success) {
            showAlert(response.message, 'success');
            await loadDestinationsTable();
            closeDestinationModal();
            resetDestinationForm();
        } else {
            showAlert(response.message || 'Erro ao salvar destino', 'danger');
        }

    } catch (error) {
        console.error('Erro ao salvar destino:', error);
        showAlert('Erro ao salvar destino', 'danger');
    }
}

// ===========================
// EDITAR DESTINO
// ===========================
async function editDestination(id) {
    try {
        const response = await apiGetDestination(id);

        if (response.success && response.data) {
            const destination = response.data;

            document.getElementById('destinationName').value = destination.name || '';
            document.getElementById('destinationAddress').value = destination.address || '';
            document.getElementById('destinationDistance').value = destination.distanceKm || '';
            document.getElementById('destinationNotes').value = destination.notes || '';

            // NOVO: Carregar coordenadas GPS
            document.getElementById('destinationLatitude').value = destination.latitude || '';
            document.getElementById('destinationLongitude').value = destination.longitude || '';

            editingDestination = destination;
            openDestinationModal();

            // NOVO: Inicializar mapa com coordenadas existentes
            if (destination.latitude && destination.longitude) {
                setTimeout(() => {
                    initDestinationMap(destination.latitude, destination.longitude);
                }, 300);
            } else {
                setTimeout(() => {
                    initDestinationMap(); // Mapa padrão (São Paulo)
                }, 300);
            }
        }

    } catch (error) {
        console.error('Erro ao carregar destino:', error);
        showAlert('Erro ao carregar destino', 'danger');
    }
}

// ===========================
// RESETAR FORM
// ===========================
function resetDestinationForm() {
    document.getElementById('destinationForm').reset();
    document.getElementById('destinationAddress').value = '';
    document.getElementById('destinationLatitude').value = '';
    document.getElementById('destinationLongitude').value = '';

    // NOVO: Remover mapa
    if (window.destinationMapInstance) {
        window.destinationMapInstance.remove();
        window.destinationMapInstance = null;
    }

    editingDestination = null;
}

// ===========================
// ABRIR MODAL
// ===========================
function openDestinationModal() {
    const modal = document.getElementById('destinationModal');
    modal.style.display = 'flex';

    // Inicializar mapa após modal abrir
    setTimeout(() => {
        if (!window.destinationMapInstance) {
            initDestinationMap();
        }
    }, 300);
}

// ===========================
// SEÇÃO GPS TRACKING - Carregar Destinos
// ===========================
function showSection(sectionId) {
    // ... código existente ...

    if (sectionId === 'rastreamento') {
        setTimeout(() => {
            if (typeof initGPSMap === 'function' && !gpsMap) {
                initGPSMap();
                initRouteHistoryMap();

                // NOVO: Carregar marcadores de destinos
                if (typeof loadDestinationMarkers === 'function') {
                    loadDestinationMarkers();
                }
            }
        }, 100);
    }
}
```

#### 3. JavaScript - Marcadores de Destinos

**Arquivo**: `js/gps-tracking.js`

Adicionar função:

```javascript
// ===========================
// CARREGAR MARCADORES DE DESTINOS
// ===========================
async function loadDestinationMarkers() {
    if (!gpsMap) {
        console.warn('Mapa GPS não inicializado para carregar destinos');
        return;
    }

    try {
        const response = await apiGetDestinations();

        if (!response.success) {
            console.error('Erro ao carregar destinos:', response.message);
            return;
        }

        const destinations = response.data || [];

        // Ícone verde para destinos (diferente dos veículos azuis)
        const destinationIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        let count = 0;

        destinations.forEach(destination => {
            if (destination.latitude && destination.longitude) {
                const marker = L.marker(
                    [destination.latitude, destination.longitude],
                    { icon: destinationIcon }
                ).addTo(gpsMap);

                let popupContent = `<b>📍 ${destination.name}</b>`;
                if (destination.address) {
                    popupContent += `<br><small>${destination.address}</small>`;
                }
                if (destination.distanceKm) {
                    popupContent += `<br><small><strong>Distância:</strong> ${destination.distanceKm} km</small>`;
                }

                marker.bindPopup(popupContent);
                count++;
            }
        });

        console.log(`✅ Carregados ${count} destinos no mapa GPS`);

    } catch (error) {
        console.error('Erro ao carregar destinos no mapa:', error);
    }
}

// Exportar função globalmente
window.loadDestinationMarkers = loadDestinationMarkers;
```

---

### Fluxo de Uso

#### Criar Destino com GPS

1. Dashboard → Cadastros → Destinos → Novo Destino
2. **Opção 1 - Geocoding Automático**:
   - Digitar endereço: "Av. Paulista, 1000 - São Paulo/SP"
   - Clicar "📍 Buscar GPS"
   - Coordenadas preenchidas automaticamente
   - Ajustar no mapa se necessário
3. **Opção 2 - Seleção Manual**:
   - Clicar diretamente no mapa
   - Coordenadas atualizadas em tempo real
   - Arrastar marcador para ajustar
4. Salvar destino

#### Visualizar no Mapa GPS

1. Dashboard → Rastreamento GPS
2. Mapa exibe:
   - **Marcadores azuis**: Veículos em movimento
   - **Marcadores verdes**: Destinos cadastrados
3. Clicar no marcador verde:
   - Popup mostra nome, endereço, distância

#### Calcular Rota Real (Opcional)

```javascript
// Exemplo de uso da API de rotas
const response = await fetch('http://localhost:5000/routes/calculate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        fromLat: -23.550520,  // Origem
        fromLon: -46.633308,
        toLat: -23.561440,    // Destino
        toLon: -46.655880
    })
});

const data = await response.json();
// data.route.distance_km = 1.5
// data.route.duration_minutes = 5.2
// data.route.geometry = GeoJSON LineString
```

---

### APIs Utilizadas

| API | Função | Custo | Rate Limit |
|-----|--------|-------|------------|
| **Nominatim** | Geocoding | Grátis | 1 req/seg |
| **OSRM** | Routing | Grátis | Sem limite |
| **OpenStreetMap** | Map Tiles | Grátis | Fair use |
| **Leaflet.js** | Map Library | Open Source | N/A |

**Políticas Importantes**:
- Nominatim requer User-Agent identificado
- Nominatim: máximo 1 requisição/segundo
- OpenStreetMap tiles: uso justo (não sobrecarregar)

---

### Troubleshooting

#### Geocoding não funciona

**Sintoma**: Botão "Buscar GPS" não retorna coordenadas

**Diagnóstico**:
```bash
# Testar API diretamente
curl -H "User-Agent: Test" \
  "https://nominatim.openstreetmap.org/search?q=Av.%20Paulista%2C%201000%20-%20São%20Paulo&format=json&limit=1"
```

**Soluções**:
1. Verificar User-Agent está presente
2. Respeitar rate limit (1 req/seg)
3. Verificar endereço está completo e formatado

#### Destinos não aparecem no mapa

**Sintoma**: Marcadores verdes não são exibidos

**Diagnóstico**:
```javascript
console.log('Destinos:', await apiGetDestinations());
// Verificar se latitude e longitude não são NULL
```

**Soluções**:
1. Verificar migration foi executada
2. Confirmar coordenadas não são NULL
3. Verificar função loadDestinationMarkers() está sendo chamada

#### Coordenadas Inválidas

**Sintoma**: Marcador aparece em local errado

**Verificar Precisão**:
```sql
SELECT
    nome,
    latitude,
    longitude,
    CONCAT('https://www.google.com/maps?q=', latitude, ',', longitude) as google_maps_link
FROM destinos
WHERE latitude IS NOT NULL;
```

Abrir link do Google Maps para validar localização.

---

### Benefícios da Implementação

✅ **Precisão**: Coordenadas reais em vez de distância estimada
✅ **Visualização**: Destinos visíveis no mapa de rastreamento
✅ **Rotas Reais**: Cálculo de distância real via OSRM
✅ **Gratuito**: 100% open source, sem custos
✅ **Flexível**: Geocoding automático + seleção manual
✅ **Compatível**: Destinos antigos continuam funcionando (NULL)

---

**Desenvolvido com ❤️ por Leonardo Garcia**
**Projeto**: CarControl - Sistema de Gestão de Frotas
**Data**: Novembro 2025
