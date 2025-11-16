# 🐳 CarControl - Deployment com Docker

Este guia explica como fazer deploy do CarControl usando Docker e Docker Compose no servidor de produção.

## 📋 Pré-requisitos

- Docker instalado
- Docker Compose instalado
- Git instalado
- Acesso SSH ao servidor

## 🏗️ Arquitetura

```
Internet → Cloudflare Tunnel → localhost:5200 (Nginx) → {
    /          → Frontend (HTML/CSS/JS)
    /api/*     → Proxy → Backend PHP:5000 → MySQL:3306
}
```

### Containers

1. **carcontrol-mysql**: MySQL 9.5
   - Porta interna: 3306
   - Volume persistente para dados
   - Auto-inicialização com schemas

2. **carcontrol-backend**: PHP 8.4 CLI
   - Porta interna: 5000
   - Roda: `php -S 0.0.0.0:5000 router.php`
   - GPS tracking funcional

3. **carcontrol-frontend**: Nginx Alpine
   - Porta exposta: **5200**
   - Serve frontend + proxy para backend
   - Zero CORS issues

## 🚀 Deploy no Servidor

### 1. Clonar Repositório

```bash
cd /home/leo
git clone <URL_DO_REPOSITORIO> Carcontrol
cd Carcontrol
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com senhas seguras
nano .env
```

Altere as senhas padrão:
```env
MYSQL_ROOT_PASSWORD=SUA_SENHA_ROOT_SEGURA
MYSQL_DATABASE=carcontrol_db
MYSQL_USER=carcontrol
MYSQL_PASSWORD=SUA_SENHA_USER_SEGURA
```

### 3. Deploy Inicial

```bash
# Dar permissão de execução
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

O script irá:
- ✅ Parar containers antigos
- ✅ Atualizar código do Git
- ✅ Reconstruir containers
- ✅ Iniciar serviços
- ✅ Verificar saúde dos containers

### 4. Verificar Status

```bash
# Ver containers rodando
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um container específico
docker-compose logs -f carcontrol-backend
```

## 🌐 Configurar Cloudflare Tunnel

Após o deploy, configure o túnel Cloudflare:

1. Acesse o painel Cloudflare Tunnel
2. Adicione um novo túnel público HTTP
3. Configure para: `http://localhost:5200`
4. Salve e teste o acesso

## 📊 Comandos Úteis

### Gerenciamento Básico

```bash
# Parar todos os containers
docker-compose down

# Iniciar containers
docker-compose up -d

# Reiniciar containers
docker-compose restart

# Ver status
docker-compose ps
```

### Logs e Debug

```bash
# Ver logs de todos os containers
docker-compose logs

# Seguir logs em tempo real
docker-compose logs -f

# Ver últimas 50 linhas
docker-compose logs --tail=50

# Logs de container específico
docker-compose logs carcontrol-backend
docker-compose logs carcontrol-mysql
docker-compose logs carcontrol-frontend
```

### Acesso ao MySQL

```bash
# Conectar ao MySQL via container
docker-compose exec carcontrol-mysql mysql -u root -p

# Fazer backup do banco
docker-compose exec carcontrol-mysql mysqldump -u root -p carcontrol_db > backup.sql

# Restaurar backup
docker-compose exec -T carcontrol-mysql mysql -u root -p carcontrol_db < backup.sql
```

### Rebuild e Atualização

```bash
# Atualizar código e fazer redeploy
git pull origin main
./deploy.sh

# Rebuild completo (limpar cache)
docker-compose build --no-cache
docker-compose up -d
```

## 🔧 Desenvolvimento Local

Para rodar localmente com Docker:

```bash
# Criar .env com configurações locais
cp .env.example .env

# Iniciar containers
docker-compose up -d

# Acessar aplicação
# Frontend: http://localhost:5200
# Backend API: http://localhost:5200/api
```

## 🐛 Troubleshooting

### Containers não iniciam

```bash
# Ver erros nos logs
docker-compose logs

# Verificar se portas estão em uso
sudo lsof -i :5200

# Remover containers e volumes
docker-compose down -v
docker-compose up -d
```

### MySQL não conecta

```bash
# Verificar saúde do container
docker-compose ps

# Ver logs do MySQL
docker-compose logs carcontrol-mysql

# Acessar MySQL diretamente
docker-compose exec carcontrol-mysql mysql -u root -p
```

### Backend retorna 502

```bash
# Verificar se backend está rodando
docker-compose ps carcontrol-backend

# Ver logs do backend
docker-compose logs -f carcontrol-backend

# Reiniciar backend
docker-compose restart carcontrol-backend
```

### GPS não funciona

Verifique se o backend está usando `router.php`:
```bash
# Ver comando do container
docker-compose ps carcontrol-backend

# Deve mostrar: php -S 0.0.0.0:5000 -t /var/www/html/api router.php
```

## 📁 Estrutura de Arquivos

```
Carcontrol/
├── docker/
│   ├── Dockerfile.php       # Imagem PHP 8.4
│   └── nginx.conf           # Configuração Nginx
├── docker-compose.yml       # Orquestração containers
├── deploy.sh                # Script de deploy
├── .env                     # Variáveis de ambiente (não commitado)
├── .env.example             # Exemplo de .env
└── README.Docker.md         # Este arquivo
```

## 🔐 Segurança

- ✅ `.env` não é commitado no Git
- ✅ Senhas configuradas via variáveis de ambiente
- ✅ MySQL não exposto externamente
- ✅ Backend acessível apenas via Nginx proxy
- ⚠️ Altere senhas padrão em produção!

## 📝 Notas Importantes

1. **Porta 5200**: Única porta exposta, configure Cloudflare Tunnel aqui
2. **MySQL Volume**: Dados persistem em `mysql_data` mesmo após `docker-compose down`
3. **router.php**: OBRIGATÓRIO para GPS funcionar corretamente
4. **CORS**: Resolvido via Nginx proxy, sem necessidade de configuração adicional
5. **Logs**: Backend logs vão para stderr, visíveis via `docker-compose logs`

## 🎯 Credenciais Padrão

### Aplicação
- Admin: `admin@carcontrol.com` / `admin123`
- Driver: `leo@gmail.com` / `142316`

### MySQL (configurar no .env)
- Root: definido em `MYSQL_ROOT_PASSWORD`
- User: definido em `MYSQL_USER` / `MYSQL_PASSWORD`
- Database: `carcontrol_db`

## 📞 Suporte

Em caso de problemas:
1. Verifique logs: `docker-compose logs -f`
2. Verifique status: `docker-compose ps`
3. Reinicie containers: `docker-compose restart`
4. Último recurso: `docker-compose down -v && ./deploy.sh`

---

**Deploy feliz! 🚀**
