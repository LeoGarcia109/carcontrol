<?php
/**
 * Database Configuration
 * Configuração de conexão com MySQL para CarControl
 */

class Database {
    // Configurações do banco de dados
    // Suporta variáveis de ambiente Docker e fallback para desenvolvimento local
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    private $charset = "utf8mb4";

    public function __construct() {
        // Detectar ambiente e usar variáveis apropriadas
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->port = getenv('DB_PORT') ?: '3306';
        $this->db_name = getenv('DB_NAME') ?: 'carcontrol_db';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: '';

        // Log para debug (apenas em desenvolvimento)
        if (getenv('DB_HOST')) {
            error_log("🐳 Usando configuração Docker: DB_HOST=" . $this->host);
        } else {
            error_log("💻 Usando configuração local de desenvolvimento");
        }
    }

    public $conn;

    /**
     * Estabelece conexão com o banco de dados
     */
    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host .
                   ";port=" . $this->port .
                   ";dbname=" . $this->db_name .
                   ";charset=" . $this->charset;

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];

            $this->conn = new PDO($dsn, $this->username, $this->password, $options);

        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            throw new Exception("Erro ao conectar ao banco de dados");
        }

        return $this->conn;
    }

    /**
     * Fecha conexão com o banco
     */
    public function closeConnection() {
        $this->conn = null;
    }

    /**
     * Inicia uma transação
     */
    public function beginTransaction() {
        if ($this->conn) {
            return $this->conn->beginTransaction();
        }
        return false;
    }

    /**
     * Confirma uma transação
     */
    public function commit() {
        if ($this->conn) {
            return $this->conn->commit();
        }
        return false;
    }

    /**
     * Reverte uma transação
     */
    public function rollback() {
        if ($this->conn) {
            return $this->conn->rollBack();
        }
        return false;
    }
}

/**
 * Função helper global para obter conexão com banco de dados
 * @return PDO Conexão PDO com o banco
 */
function getConnection() {
    $database = new Database();
    return $database->getConnection();
}
