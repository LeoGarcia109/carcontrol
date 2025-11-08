# 🚀 CarControl API - Guia de Instalação e Configuração

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Instalação do Banco de Dados](#instalação-do-banco-de-dados)
3. [Configuração da API](#configuração-da-api)
4. [Iniciar a API](#iniciar-a-api)
5. [Migração de Dados](#migração-de-dados)
6. [Testes](#testes)
7. [Solução de Problemas](#solução-de-problemas)

---

## 📦 Pré-requisitos

### Softwares Necessários
- **PHP 8.0+** com extensões:
  - pdo
  - pdo_mysql
  - mbstring
  - json
- **MySQL 5.7+** ou **MariaDB 10.3+**
- **Servidor Web** (Apache/Nginx) ou PHP Built-in Server

### Verificar Instalação

```bash
# Verificar versão do PHP
php -v

# Verificar extensões PHP
php -m | grep -E 'pdo|mysql|mbstring|json'

# Verificar MySQL
mysql --version
```

---

## 🗄️ Instalação do Banco de Dados

### Passo 1: Criar o Banco de Dados

```bash
# Conectar ao MySQL
mysql -u root -p

# Executar no MySQL prompt:
CREATE DATABASE carcontrol_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Passo 2: Importar Schema

```bash
# Importar schema principal
mysql -u root -p carcontrol_db < database/carcontrol_db.sql

# Aplicar migrations (campos de foto, etc)
mysql -u root -p carcontrol_db < database/migration.sql
```

### Passo 3: Verificar Instalação

```bash
mysql -u root -p carcontrol_db -e "SHOW TABLES;"
```

Você deve ver as tabelas:
- `usuarios`
- `motoristas`
- `veiculos`
- `uso_veiculos`
- `manutencao`
- `destinos`
- `configuracoes`
- etc...

---

## ⚙️ Configuração da API

### Passo 1: Configurar Credenciais do Banco

Edite o arquivo: `api/config/database.php`

```php
private $host = "localhost";
private $port = "3306";
private $db_name = "carcontrol_db";
private $username = "root";  // ← ALTERE AQUI
private $password = "";      // ← ALTERE AQUI
```

**⚠️ IMPORTANTE:** Substitua `username` e `password` pelas credenciais do seu MySQL!

### Passo 2: Configurar CORS (Opcional)

Edite o arquivo: `api/config/cors.php`

```php
$allowed_origins = [
    'http://localhost:5179',  // Frontend
    'http://127.0.0.1:5179'
];
```

### Passo 3: Ajustar Permissões (Linux/Mac)

```bash
chmod +x start-api.sh
chmod -R 755 api/
```

---

## 🚀 Iniciar a API

### Opção 1: Usando o Script (Recomendado)

```bash
./start-api.sh
```

A API estará disponível em: **http://localhost:5000**

### Opção 2: PHP Built-in Server Manual

```bash
php -S localhost:5000 -t api/
```

### Opção 3: Apache/Nginx

1. Configure um VirtualHost apontando para a pasta `api/`
2. Certifique-se que o `.htaccess` está funcionando
3. Habilite `mod_rewrite` no Apache

---

## 🔄 Migração de Dados do localStorage

### Passo 1: Abrir Frontend Antigo

1. Abra o sistema no navegador (porta 5179)
2. Faça login
3. Verifique que tem dados no localStorage

### Passo 2: Executar Script de Migração

```bash
# Abrir no navegador:
tools/migrate-data.html
```

O script irá:
1. Ler dados do localStorage
2. Enviar para a API
3. Inserir no banco MySQL
4. Validar integridade

### Passo 3: Verificar Migração

```bash
mysql -u root -p carcontrol_db -e "SELECT COUNT(*) FROM motoristas;"
mysql -u root -p carcontrol_db -e "SELECT COUNT(*) FROM veiculos;"
```

---

## 🧪 Testes

### Teste 1: API Está Rodando?

```bash
curl http://localhost:5000
```

Deve retornar JSON com informações da API.

### Teste 2: Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Teste 3: Interface de Testes

Abra no navegador:
```
file:///Users/leogarcia/Development/Carcontrol/tools/test-api.html
```

Esta página permite testar TODOS os endpoints visualmente.

---

## 🛠️ Solução de Problemas

### Erro: "Connection error"

**Causa:** Não conseguiu conectar ao MySQL

**Solução:**
1. Verifique se MySQL está rodando:
   ```bash
   mysql -u root -p -e "SELECT 1;"
   ```
2. Verifique credenciais em `api/config/database.php`
3. Verifique se o banco `carcontrol_db` existe

### Erro: "CORS policy"

**Causa:** Frontend não pode acessar a API

**Solução:**
1. Verifique `api/config/cors.php`
2. Adicione a URL do frontend em `$allowed_origins`
3. Para desenvolvimento, pode usar: `header("Access-Control-Allow-Origin: *");`

### Erro: 404 em todas as rotas

**Causa:** Roteamento não está funcionando

**Solução:**
1. Se usando Apache, habilite mod_rewrite:
   ```bash
   sudo a2enmod rewrite
   sudo service apache2 restart
   ```
2. Verifique se `.htaccess` está na pasta `api/`
3. Se usando PHP Built-in, ignore (funciona automaticamente)

### Erro: "Call to undefined function password_hash()"

**Causa:** PHP muito antigo

**Solução:**
Atualize para PHP 8.0+

### Erro: Upload de foto não funciona

**Causa:** Limites de upload muito baixos

**Solução:**
Edite `php.ini`:
```ini
upload_max_filesize = 10M
post_max_size = 10M
```

---

## 📊 Endpoints Disponíveis

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/profile` - Perfil do usuário
- `GET /auth/check` - Verificar autenticação

### Motoristas
- `GET /drivers` - Listar todos
- `GET /drivers/{id}` - Buscar por ID
- `POST /drivers` - Criar (com foto base64)
- `PUT /drivers/{id}` - Atualizar
- `DELETE /drivers/{id}` - Deletar (soft delete)

### Veículos
- `GET /vehicles` - Listar todos
- `GET /vehicles/{id}` - Buscar por ID
- `POST /vehicles` - Criar (com foto base64)
- `PUT /vehicles/{id}` - Atualizar
- `DELETE /vehicles/{id}` - Deletar (soft delete)

### Uso de Veículos
- `GET /usage` - Listar todos
- `GET /usage/active` - Usos ativos
- `POST /usage` - Criar registro
- `POST /usage/finalize/{id}` - Finalizar uso
- `DELETE /usage/{id}` - Deletar

### Manutenção
- `GET /maintenance` - Listar todos
- `POST /maintenance` - Criar registro
- `DELETE /maintenance/{id}` - Deletar
- `GET /maintenance/alerts` - Alertas de manutenção

### Destinos
- `GET /destinations` - Listar todos
- `POST /destinations` - Criar
- `PUT /destinations/{id}` - Atualizar
- `DELETE /destinations/{id}` - Deletar

### Dashboard
- `GET /dashboard/stats` - Estatísticas do sistema

---

## 📝 Usuários Padrão

Após importar o schema, os seguintes usuários estarão disponíveis:

| Username | Senha | Role |
|----------|-------|------|
| admin | admin123 | admin |
| usuario | user123 | user |

---

## 🔒 Segurança

### Em Produção

1. **ALTERE as senhas padrão!**
2. **Use HTTPS** (certificado SSL)
3. **Restrinja CORS** (remova `Access-Control-Allow-Origin: *`)
4. **Use senhas fortes no MySQL**
5. **Desabilite display_errors** em PHP
6. **Implemente rate limiting**

### Boas Práticas

- Senhas são hasheadas com bcrypt
- Sessions PHP seguras
- Prepared statements (proteção SQL injection)
- Validação de inputs
- Soft deletes (dados não são perdidos)

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do PHP:
   ```bash
   tail -f /var/log/php/error.log
   ```

2. Verifique logs do MySQL:
   ```bash
   tail -f /var/log/mysql/error.log
   ```

3. Ative modo debug temporariamente em `api/index.php`:
   ```php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   ```

---

## ✅ Checklist de Instalação

- [ ] PHP 8.0+ instalado e configurado
- [ ] MySQL rodando
- [ ] Banco `carcontrol_db` criado
- [ ] Schema importado (`carcontrol_db.sql`)
- [ ] Migration aplicada (`migration.sql`)
- [ ] Credenciais configuradas em `api/config/database.php`
- [ ] API iniciada (`./start-api.sh`)
- [ ] Teste de login funcionando
- [ ] Teste de criação de motorista funcionando
- [ ] Upload de foto funcionando
- [ ] Frontend atualizado para usar API

---

## 🎉 Próximos Passos

1. **Migrar dados** do localStorage para MySQL
2. **Atualizar frontend** para usar a API
3. **Testar todas as funcionalidades**
4. **Deploy em produção** (se aplicável)

Boa sorte! 🚀
