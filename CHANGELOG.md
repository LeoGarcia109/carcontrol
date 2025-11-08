# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.1.0-beta] - 2025-01-08

### 🎉 Lançamento Inicial - CarControl v0.1.0 Beta

Primeira versão estável do sistema de gestão de frotas CarControl.

### ✨ Adicionado

#### Gestão de Frotas
- **Dashboard Executivo** com KPIs em tempo real:
  - Total de veículos com breakdown por status (disponível, em uso, manutenção)
  - Alertas críticos (manutenções pendentes, CNH vencida)
  - Custo total de manutenções (últimos 6 meses)
  - Total de motoristas (ativos e inativos)
- **Rankings Top 5**:
  - Veículos mais utilizados
  - Motoristas mais ativos
  - Destinos mais frequentes
  - Veículos com maior custo de manutenção
- **Gráficos Interativos**:
  - Status da frota (Chart.js)
  - Mapa GPS em tempo real no dashboard

#### Módulos de Cadastro
- **Veículos**:
  - CRUD completo (Create, Read, Update, Delete)
  - Upload de fotos (base64 em BLOB)
  - Validação de placa no formato AAA-0000
  - Campos: placa, marca, modelo, ano, cor, KM atual, status
  - Soft delete (registro mantido com flag ativo=0)

- **Motoristas**:
  - CRUD completo
  - Auto-criação de conta de usuário (role: motorista)
  - Upload de fotos
  - Validação de CNH (11 dígitos)
  - Campos: nome, CPF, CNH, validade CNH, telefone, endereço
  - Soft delete

- **Destinos**:
  - CRUD completo
  - Campos: nome, endereço, tipo (interno/externo)
  - Soft delete

#### Gestão de Uso de Veículos
- **Registro de Viagens**:
  - Saída: veículo, motorista, destino, data/hora, KM inicial
  - Retorno: KM final, data/hora retorno
  - Cálculo automático de distância percorrida
  - Cálculo automático de duração
  - Status: em_uso, finalizado, cancelado
  - Aprovação de viagens (pendente implementação backend)

- **Filtros Avançados**:
  - Por veículo
  - Por motorista
  - Por período (hoje, semana, mês, ano, customizado)
  - Por status

#### 🛰️ Rastreamento GPS em Tempo Real ⭐ NOVO
- **Mapa em Tempo Real**:
  - Leaflet.js com OpenStreetMap
  - Marcadores customizados por veículo
  - Atualização automática a cada 3 minutos
  - Popup com informações: veículo, motorista, velocidade, última atualização
  - Filtro de veículos ativos (< 3 minutos)

- **Histórico de Rotas**:
  - Visualização completa de trajetos percorridos
  - Polyline com pontos GPS coletados
  - Marcadores de início (🚀) e fim (🏁)
  - Estatísticas da viagem:
    - Distância total (cálculo via Haversine)
    - Duração da viagem
    - Velocidade média
    - Velocidade máxima
  - Sidebar com lista de viagens finalizadas

- **Interface Mobile para Motoristas**:
  - Tela simplificada para drivers
  - Solicitação automática de permissão de localização
  - Envio de GPS a cada 3 minutos durante viagem ativa
  - Indicador visual de rastreamento ativo

- **Backend GPS**:
  - Tabela `gps_tracking`: armazena pontos GPS individuais
  - Tabela `rotas_historico`: histórico consolidado de rotas
  - View `vw_ultima_localizacao`: última posição de cada veículo
  - Trigger automático: cria histórico ao finalizar viagem
  - Função Haversine: cálculo preciso de distância
  - Stored procedure: limpeza de dados GPS antigos
  - Endpoints REST: /gps/update, /gps/active, /gps/history, /gps/stop

#### Manutenção e Despesas
- **Manutenção**:
  - CRUD de registros de manutenção
  - Campos: veículo, tipo, descrição, data, KM, valor
  - Atualização automática do KM de última manutenção
  - Sistema de alertas para manutenções pendentes (a cada 10.000 km)

- **Despesas**:
  - CRUD completo de despesas
  - Categorias: abastecimento, pedágio, estacionamento, manutenção, outros
  - **Abastecimento Inteligente**:
    - Campos: litros, preço por litro
    - Cálculo automático do valor total
    - Tracking de KM para consumo médio
  - **KPIs de Despesas**:
    - Total mensal
    - Total em combustível
    - Total em manutenção
    - Consumo médio (km/L)
  - **Filtros Avançados**:
    - Por período (hoje, semana, mês, trimestre, semestre, ano, customizado)
    - Por veículo
    - Por categoria
    - Por intervalo de datas específico
  - **Exportação**:
    - Excel/CSV com todos os dados filtrados

#### Sistema de Alertas
- **Alertas Automáticos**:
  - CNH vencida (alerta crítico vermelho)
  - CNH vencendo em 30 dias (alerta warning amarelo)
  - Manutenção pendente por KM rodado (10.000 km padrão)
  - Uso prolongado de veículo (> 12 horas sem retorno)
  - Documentos vencidos (CRLV, seguro)
- **Dashboard de Alertas**:
  - Lista com priorização por tipo
  - Contadores por categoria
  - Ícones visuais (crítico, warning, info)

#### Sistema de Autenticação
- **3 Níveis de Acesso**:
  1. **Admin**: acesso total ao sistema
  2. **User**: visualização e acesso limitado
  3. **Motorista**: apenas suas viagens e interface mobile
- **Sessões PHP**:
  - Session-based authentication
  - Cookies com credentials: 'include'
  - Auto-redirect em 401 (Unauthorized)
- **Validação**:
  - Hash de senhas com password_hash()
  - Proteção contra SQL injection (PDO prepared statements)

#### API REST Completa
- **Backend**: PHP 8.4 + MySQL 9.5
- **Arquitetura**: RESTful API
- **8 Módulos Principais**:
  1. Authentication (/auth)
  2. Drivers (/drivers)
  3. Vehicles (/vehicles)
  4. Usage (/usage)
  5. Maintenance (/maintenance)
  6. Destinations (/destinations)
  7. Expenses (/expenses)
  8. GPS Tracking (/gps) ⭐
  9. Dashboard (/dashboard/stats)

- **Endpoints Totais**: 30+ rotas REST
- **CORS Configurado**: permite cross-origin requests
- **Error Handling**: respostas JSON padronizadas
- **Router**: Suporte a PHP built-in server com router.php

#### Frontend Moderno
- **Stack**:
  - Vanilla JavaScript (ES6+)
  - HTML5 + CSS3
  - Leaflet.js (mapas GPS)
  - Chart.js (gráficos)
  - Lucide Icons (ícones)

- **Design System**:
  - CSS Variables para theming
  - Gradientes modernos
  - Animações suaves
  - Micro-interações
  - Fonte Inter
  - Cards interativos
  - 100% responsivo (desktop, tablet, mobile)

- **Features UX**:
  - Loading states
  - Feedback em tempo real
  - Validações client-side
  - Auto-formatação de inputs (placa, telefone, CNH)
  - Modals para CRUD
  - Confirmações de ações críticas

### 🛠️ Stack Técnica

#### Backend
- PHP 8.4
- MySQL 9.5.0
- PDO (PHP Data Objects)
- Session-based Authentication

#### Frontend
- Vanilla JavaScript (ES6+)
- Fetch API
- Leaflet.js 1.9+ (GPS Maps)
- Chart.js 4.4+ (Gráficos)
- Lucide Icons

#### Banco de Dados
- 13 tabelas principais
- 3 tabelas GPS (gps_tracking, rotas_historico, view)
- Triggers automáticos
- Stored procedures
- Views otimizadas
- Índices para performance
- Soft deletes

#### DevOps
- PHP Built-in Server (desenvolvimento)
- Router.php para roteamento
- .htaccess (produção Apache)
- CORS configurado

### 📊 Métricas do Projeto

- **Linhas de Código**:
  - Frontend JS: ~4.500 linhas
  - Backend PHP: ~2.800 linhas
  - CSS: ~2.100 linhas
  - SQL: ~800 linhas
  - **Total**: ~10.200 linhas

- **Arquivos**:
  - 3 páginas HTML
  - 6 arquivos JavaScript
  - 3 arquivos CSS
  - 30+ endpoints PHP
  - 6 arquivos SQL

- **Endpoints API**: 30+
- **Tabelas BD**: 16 (13 principais + 3 GPS)
- **Funcionalidades CRUD**: 7 módulos completos

### 🎯 Funcionalidades Destacadas

1. ✅ **Rastreamento GPS em tempo real** com histórico de rotas
2. ✅ **Dashboard executivo** com KPIs e rankings
3. ✅ **Sistema de alertas** automático e inteligente
4. ✅ **Gestão de despesas** com categorização e KPIs
5. ✅ **Interface mobile** dedicada para motoristas
6. ✅ **Exportação de dados** (Excel/CSV)
7. ✅ **Validações inteligentes** (placa, CNH, telefone)
8. ✅ **3 níveis de acesso** (admin, user, motorista)

### 📱 Compatibilidade

- ✅ Google Chrome 90+
- ✅ Mozilla Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### 🔐 Segurança

- ✅ Passwords hasheados (password_hash)
- ✅ Prepared statements (PDO)
- ✅ Session-based authentication
- ✅ CORS configurado
- ⚠️ **Produção**: Implementar HTTPS, rate limiting, CSRF tokens

### 📝 Documentação

- ✅ CLAUDE.md - Documentação completa do projeto
- ✅ API_README.md - Guia da API
- ✅ API_SETUP.md - Setup do backend
- ✅ QUICK_START.md - Início rápido
- ✅ NEXT_STEPS.md - Próximos passos
- ✅ CHANGELOG.md - Este arquivo
- ✅ README.md - Overview do projeto

### 🐛 Problemas Conhecidos

- ⏳ Endpoints de aprovação de viagens (backend pendente)
- ⏳ Endpoint PUT /maintenance/{id} (update pendente)
- ⚠️ Servidor deve ser iniciado com `router.php` para GPS funcionar

### 🚀 Próximas Versões

Planejado para v0.2.0:
- [ ] Relatórios PDF automatizados
- [ ] Notificações push para motoristas
- [ ] API de integração com sistemas externos
- [ ] Dashboard de consumo de combustível por veículo
- [ ] Geofencing (zonas permitidas/proibidas)
- [ ] Histórico de velocidade e infrações
- [ ] Multi-tenancy (múltiplas empresas)

---

## Como Atualizar

### Para desenvolvedores:

```bash
git pull origin main
cd api
php -S localhost:5000 router.php
```

### Banco de dados:

Se houver migrações, execute:
```bash
mysql -u root carcontrol_db < database/migration.sql
mysql -u root carcontrol_db < database/gps_tracking_migration.sql
```

---

**Data de Lançamento**: 08 de Janeiro de 2025
**Versão**: 0.1.0-beta
**Status**: Beta Release
**Desenvolvedor**: Leonardo Garcia
