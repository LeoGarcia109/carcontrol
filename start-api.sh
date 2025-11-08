#!/bin/bash

# CarControl API - Script de Inicialização
# Inicia o servidor PHP na porta 5000

echo "🚀 Iniciando CarControl API..."
echo "📡 Porta: 5000"
echo "📂 Diretório: api/"
echo ""
echo "✅ API disponível em: http://localhost:5000"
echo "📖 Documentação: http://localhost:5000"
echo ""
echo "⏹️  Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar servidor PHP built-in na porta 5000
php -S localhost:5000 -t api/
