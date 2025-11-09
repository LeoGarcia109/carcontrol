<?php
/**
 * Geocoding Service
 * Converte endereços em coordenadas GPS usando Nominatim (OpenStreetMap)
 * API: 100% gratuita, sem necessidade de API key
 *
 * Rate Limiting: 1 requisição por segundo (Nominatim policy)
 * User-Agent obrigatório: conforme política do Nominatim
 *
 * @link https://nominatim.openstreetmap.org/
 * @version 1.0
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
                'timeout' => 10 // Timeout de 10 segundos
            ]
        ]);

        try {
            error_log("GeocodingService: Geocoding address: $address");

            // Fazer requisição HTTP GET
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

            // Validar coordenadas retornadas
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
     * Útil para obter endereço formatado de coordenadas GPS
     *
     * @param float $latitude Latitude (-90 a +90)
     * @param float $longitude Longitude (-180 a +180)
     * @return string|false Endereço formatado ou false
     */
    public static function reverseGeocode($latitude, $longitude) {
        // Validar coordenadas
        if (!is_numeric($latitude) || !is_numeric($longitude)) {
            error_log("GeocodingService: Invalid coordinates - Lat: $latitude, Lon: $longitude");
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

            $address = $data['display_name'];
            error_log("GeocodingService: Reverse geocode success - $address");

            return $address;

        } catch (Exception $e) {
            error_log("GeocodingService: Reverse geocode exception - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Buscar múltiplos resultados para um endereço
     * Útil quando o usuário quer escolher entre múltiplas opções
     *
     * @param string $address Endereço parcial ou completo
     * @param int $limit Número máximo de resultados (padrão: 5)
     * @return array|false Array de resultados ou false
     */
    public static function searchAddress($address, $limit = 5) {
        if (empty($address)) {
            return false;
        }

        $baseUrl = 'https://nominatim.openstreetmap.org/search';

        $params = http_build_query([
            'q' => $address,
            'format' => 'json',
            'limit' => min($limit, 10), // Máximo 10 resultados
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
            $response = @file_get_contents($url, false, $context);

            if ($response === false) {
                return false;
            }

            $data = json_decode($response, true);

            if (empty($data)) {
                return false;
            }

            $results = [];
            foreach ($data as $item) {
                if (isset($item['lat']) && isset($item['lon'])) {
                    $results[] = [
                        'latitude' => (float)$item['lat'],
                        'longitude' => (float)$item['lon'],
                        'display_name' => $item['display_name'] ?? '',
                        'type' => $item['type'] ?? '',
                        'importance' => $item['importance'] ?? 0
                    ];
                }
            }

            return $results;

        } catch (Exception $e) {
            error_log("GeocodingService: Search exception - " . $e->getMessage());
            return false;
        }
    }
}
