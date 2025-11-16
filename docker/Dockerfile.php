FROM php:8.4-cli-alpine

# Instalar extensões necessárias para MySQL
RUN apk add --no-cache \
    mysql-client \
    && docker-php-ext-install pdo pdo_mysql

# Instalar Composer (para futuras dependências)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configurar diretório de trabalho
WORKDIR /var/www/html

# Expor porta do backend
EXPOSE 5000

# Comando padrão (sobrescrito no docker-compose)
CMD ["php", "-S", "0.0.0.0:5000", "-t", "/var/www/html/api", "router.php"]
