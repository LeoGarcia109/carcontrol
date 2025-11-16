#!/bin/bash

# CarControl - Automated Deploy Script
# Este script automatiza o deploy do CarControl no servidor

set -e  # Exit on error

echo "🚀 CarControl - Deploy Automatizado"
echo "===================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para mensagens coloridas
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se .env existe
if [ ! -f .env ]; then
    error "Arquivo .env não encontrado!"
    warning "Copie .env.example para .env e configure as senhas"
    echo "  cp .env.example .env"
    exit 1
fi

# Parar containers existentes
info "Parando containers antigos..."
docker-compose down 2>/dev/null || true
success "Containers parados"

# Atualizar código do repositório (se estiver em repo Git)
if [ -d .git ]; then
    info "Atualizando código do Git..."
    git pull origin main || git pull origin master || warning "Não foi possível atualizar do Git"
else
    warning "Não é um repositório Git, pulando git pull"
fi

# Limpar builds antigas do PHP
info "Limpando imagens antigas..."
docker-compose build --no-cache carcontrol-backend
success "Backend reconstruído"

# Iniciar containers
info "Iniciando containers..."
docker-compose up -d

# Aguardar MySQL inicializar
info "Aguardando MySQL inicializar (30 segundos)..."
sleep 5
for i in {1..25}; do
    if docker-compose exec -T carcontrol-mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-carcontrol_root_2025} --silent 2>/dev/null; then
        success "MySQL está pronto!"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Verificar status dos containers
info "Verificando status dos containers..."
docker-compose ps

echo ""
echo "==============================================="
success "Deploy concluído com sucesso!"
echo "==============================================="
echo ""
echo "📊 Informações de acesso:"
echo "  🌐 Frontend: http://localhost:5200"
echo "  🔧 Backend API: http://localhost:5200/api"
echo "  💾 MySQL: localhost:3306 (interno aos containers)"
echo ""
echo "👤 Credenciais padrão:"
echo "  Admin: admin@carcontrol.com / admin123"
echo "  Driver: leo@gmail.com / 142316"
echo ""
echo "📋 Comandos úteis:"
echo "  Ver logs: docker-compose logs -f"
echo "  Parar: docker-compose down"
echo "  Reiniciar: docker-compose restart"
echo "  Status: docker-compose ps"
echo ""

# Verificar se containers estão rodando
RUNNING=$(docker-compose ps --services --filter "status=running" | wc -l)
TOTAL=$(docker-compose ps --services | wc -l)

if [ "$RUNNING" -eq "$TOTAL" ]; then
    success "Todos os $TOTAL containers estão rodando! 🎉"
else
    warning "$RUNNING de $TOTAL containers estão rodando"
    echo ""
    info "Verificando logs dos containers com problemas:"
    docker-compose logs --tail=20
fi

echo ""
info "Para acessar via Cloudflare Tunnel, configure o túnel apontando para localhost:5200"
echo ""
