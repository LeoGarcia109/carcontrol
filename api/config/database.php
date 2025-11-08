<?php
/**
 * Database Configuration
 * Configuração de conexão com MySQL para CarControl
 */

class Database {
    // Configurações do banco de dados
    private $host = "localhost";
    private $port = "3306";
    private $db_name = "carcontrol_db";
    private $username = "root";
    private $password = "";  // Senha vazia (confirmado funcionando)
    private $charset = "utf8mb4";

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
