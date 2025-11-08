# ⚡ CarControl API - Quick Start

## 🚨 IMPORTANTE: Configure Antes de Usar!

### 1️⃣ Configure MySQL (1 minuto)

Edite: **`api/config/database.php`** (linhas 11-12)

```php
private $username = "root";     // ← SEU USUÁRIO
private $password = "";         // ← SUA SENHA
```

### 2️⃣ Crie o Banco (2 minutos)

```bash
# Criar banco
mysql -u root -p -e "CREATE DATABASE carcontrol_db;"

# Importar dados
mysql -u root -p carcontrol_db < database/carcontrol_db.sql
mysql -u root -p carcontrol_db < database/migration.sql
```

### 3️⃣ Inicie a API (10 segundos)

```bash
./start-api.sh
```

✅ API rodando em: http://localhost:5000

### 4️⃣ Teste (30 segundos)

Abra no navegador:
```
file:///Users/leogarcia/Development/Carcontrol/tools/test-api.html
```

Clique em "Login Admin" e teste os endpoints!

---

## 📊 Arquivos Criados

### Backend PHP
```
api/
├── config/
│   ├── database.php       ← CONFIGURE AQUI!
│   └── cors.php
├── controllers/
│   ├── AuthController.php
│   ├── DriverController.php
│   ├── VehicleController.php
│   ├── UsageController.php
│   ├── MaintenanceController.php
│   ├── DestinationController.php
│   └── DashboardController.php
├── middleware/
│   └── auth.php
├── .htaccess
└── index.php
```

### Banco de Dados
```
database/
├── carcontrol_db.sql    ← Schema completo
└── migration.sql        ← Campos de foto
```

### Ferramentas
```
tools/
├── test-api.html        ← Interface de testes
├── migrate-data.html    ← Migração de dados
└── test-localStorage.html
```

### Documentação
```
├── API_README.md        ← Referência completa
├── API_SETUP.md         ← Guia detalhado
├── NEXT_STEPS.md        ← Próximos passos
├── QUICK_START.md       ← Este arquivo
└── start-api.sh         ← Iniciar servidor
```

---

## 🎯 Endpoints Principais

### Autenticação
- `POST /auth/login` → Login
- `GET /auth/profile` → Perfil

### Motoristas
- `GET /drivers` → Listar
- `POST /drivers` → Criar (com foto base64!)
- `PUT /drivers/{id}` → Atualizar
- `DELETE /drivers/{id}` → Deletar

### Veículos
- `GET /vehicles` → Listar
- `POST /vehicles` → Criar (com foto)

### Dashboard
- `GET /dashboard/stats` → Estatísticas

---

## ✅ Checklist Rápido

- [ ] Configurei credenciais em `api/config/database.php`
- [ ] Criei banco `carcontrol_db`
- [ ] Importei `carcontrol_db.sql`
- [ ] Importei `migration.sql`
- [ ] Executei `./start-api.sh`
- [ ] Testei login em `test-api.html`
- [ ] Login funcionou!

---

## 🎉 Pronto!

Agora você pode:
- ✅ Cadastrar motoristas com foto
- ✅ Salvar dados permanentemente no MySQL
- ✅ Acessar de qualquer dispositivo
- ✅ Não perder mais dados!

**Problema do Leonardo resolvido!** 🚀

---

## 📞 Ajuda Rápida

**Erro: "Connection error"**
→ Verifique credenciais em `api/config/database.php`

**Erro: "Unauthorized"**
→ Faça login primeiro

**API não inicia**
→ Verifique se porta 5000 está livre: `lsof -i :5000`

---

## 📖 Documentação Completa

- **Iniciante**: Leia `NEXT_STEPS.md`
- **Avançado**: Leia `API_SETUP.md`
- **Referência**: Leia `API_README.md`

---

**Tempo Total de Setup: ~5 minutos** ⏱️
