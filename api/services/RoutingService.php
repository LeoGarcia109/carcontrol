<?php
/**
 * Routing Service
 * Calcula rotas reais entre dois pontos usando OSRM (Open Source Routing Machine)
 * API: 100% gratuita, sem necessidade de API key
 *
 * OSRM é uma solução open-source de roteamento de alta performance
 * baseada em dados do OpenStreetMap
 *
 * @link https://project-osrm.org/
 * @version 1.0
 */

class RoutingService {

    /**
     * Calcular rota real entre dois pontos GPS
     * Retorna distância real (em metros e km), duração e geometria da rota
     *
     * @param float $fromLat Latitude de origem
     * @param float $fromLon Longitude de origem
     * @param float $toLat Latitude de destino
     * @param float $toLon Longitude de destino
     * @return array|false Dados da rota ou false em caso de erro
     */
    public static function calculateRoute($fromLat, $fromLon, $toLat, $toLon) {
        // Validações das coordenadas
        if (!is_numeric($fromLat) || !is_numeric($fromLon) || !is_numeric($toLat) || !is_numeric($toLon)) {
            error_log("RoutingService: Invalid coordinates provided");
            return false;
        }

        // Validar ranges
        if ($fromLat < -90 || $fromLat > 90 || $toLat < -90 || $toLat > 90) {
            error_log("RoutingService: Latitude out of range (-90 to 90)");
            return false;
        }

        if ($fromLon < -180 || $fromLon > 180 || $toLon < -180 || $toLon > 180) {
            error_log("RoutingService: Longitude out of range (-180 to 180)");
            return false;
        }

        // API pública do OSRM
        $baseUrl = 'https://router.project-osrm.org/route/v1/driving';

        // IMPORTANTE: OSRM usa formato longitude,latitude (não latitude,longitude!)
        // Formato: /driving/{lon1},{lat1};{lon2},{lat2}
        $url = "{$baseUrl}/{$fromLon},{$fromLat};{$toLon},{$toLat}";

        // Parâmetros da API:
        // - overview=full: retorna geometria completa da rota
        // - geometries=geojson: formato GeoJSON para geometria
        // - steps=true: incluir passos detalhados (virar à esquerda, etc.)
        $url .= "?overview=full&geometries=geojson&steps=true";

        try {
            error_log("RoutingService: Calculating route from ({$fromLat}, {$fromLon}) to ({$toLat}, {$toLon})");

            // Fazer requisição HTTP GET
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10 // Timeout de 10 segundos
                ]
            ]);

            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                error_log("RoutingService: Failed to fetch route from OSRM API");
                return false;
            }

            $data = json_decode($response, true);

            // Verificar se há rotas retornadas
            if (!isset($data['routes']) || empty($data['routes'])) {
                error_log("RoutingService: No route found between coordinates");
                return false;
            }

            $route = $data['routes'][0];

            // Validar dados essenciais
            if (!isset($route['distance']) || !isset($route['duration'])) {
                error_log("RoutingService: Invalid route data - missing distance or duration");
                return false;
            }

            // Extrair distância e duração
            $distanceMeters = (float)$route['distance']; // Em metros
            $durationSeconds = (float)$route['duration']; // Em segundos

            // Conversões úteis
            $distanceKm = round($distanceMeters / 1000, 2);
            $durationMinutes = round($durationSeconds / 60, 1);
            $durationHours = round($durationSeconds / 3600, 2);

            // Geometria da rota (GeoJSON LineString)
            $geometry = $route['geometry'] ?? null;

            // Passos da rota (instruções de navegação)
            $steps = [];
            if (isset($route['legs'][0]['steps'])) {
                foreach ($route['legs'][0]['steps'] as $step) {
                    $steps[] = [
                        'distance' => $step['distance'] ?? 0,
                        'duration' => $step['duration'] ?? 0,
                        'instruction' => $step['maneuver']['instruction'] ?? '',
                        'type' => $step['maneuver']['type'] ?? ''
                    ];
                }
            }

            $result = [
                'distance_meters' => $distanceMeters,
                'distance_km' => $distanceKm,
                'duration_seconds' => $durationSeconds,
                'duration_minutes' => $durationMinutes,
                'duration_hours' => $durationHours,
                'geometry' => $geometry, // GeoJSON LineString
                'steps' => $steps
            ];

            error_log("RoutingService: Route calculated successfully - {$distanceKm} km, {$durationMinutes} min");

            return $result;

        } catch (Exception $e) {
            error_log("RoutingService: Exception - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Calcular distância e tempo entre múltiplos pontos (rota com waypoints)
     * Útil para rotas com múltiplas paradas
     *
     * @param array $coordinates Array de coordenadas [[lat, lon], [lat, lon], ...]
     * @return array|false Dados da rota ou false
     */
    public static function calculateMultiPointRoute($coordinates) {
        if (empty($coordinates) || count($coordinates) < 2) {
            error_log("RoutingService: Need at least 2 coordinates for multi-point route");
            return false;
        }

        // Validar e formatar coordenadas
        $formattedCoords = [];
        foreach ($coordinates as $coord) {
            if (!isset($coord[0]) || !isset($coord[1])) {
                error_log("RoutingService: Invalid coordinate format");
                return false;
            }

            $lat = $coord[0];
            $lon = $coord[1];

            // Validar
            if (!is_numeric($lat) || !is_numeric($lon)) {
                return false;
            }

            // OSRM usa lon,lat (não lat,lon!)
            $formattedCoords[] = "{$lon},{$lat}";
        }

        // Montar URL: /driving/{lon1},{lat1};{lon2},{lat2};{lon3},{lat3}...
        $baseUrl = 'https://router.project-osrm.org/route/v1/driving';
        $coordsString = implode(';', $formattedCoords);
        $url = "{$baseUrl}/{$coordsString}?overview=full&geometries=geojson";

        try {
            $context = stream_context_create(['http' => ['timeout' => 15]]);
            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                return false;
            }

            $data = json_decode($response, true);

            if (!isset($data['routes']) || empty($data['routes'])) {
                return false;
            }

            $route = $data['routes'][0];

            return [
                'distance_meters' => $route['distance'],
                'distance_km' => round($route['distance'] / 1000, 2),
                'duration_seconds' => $route['duration'],
                'duration_minutes' => round($route['duration'] / 60, 1),
                'geometry' => $route['geometry'] ?? null
            ];

        } catch (Exception $e) {
            error_log("RoutingService: Multi-point route exception - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obter tempo estimado de viagem entre dois pontos
     * Versão simplificada que retorna apenas duração e distância
     *
     * @param float $fromLat
     * @param float $fromLon
     * @param float $toLat
     * @param float $toLon
     * @return array|false ['duration_minutes' => float, 'distance_km' => float] ou false
     */
    public static function getEstimatedTime($fromLat, $fromLon, $toLat, $toLon) {
        $route = self::calculateRoute($fromLat, $fromLon, $toLat, $toLon);

        if ($route === false) {
            return false;
        }

        return [
            'duration_minutes' => $route['duration_minutes'],
            'distance_km' => $route['distance_km']
        ];
    }
}
