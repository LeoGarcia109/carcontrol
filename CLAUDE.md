# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Version History

**Current Version**: `v0.1.0 Beta` (2025-01-08)

| Version | Date | Description | Status |
|---------|------|-------------|--------|
| 0.1.0-beta | 2025-01-08 | Initial release with GPS tracking, full CRUD, dashboard | ✅ Stable |

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Project Overview

CarControl is a vehicle fleet management system built with vanilla JavaScript, HTML5, CSS3 frontend and PHP 8.4 backend with MySQL 9.5 database. It provides comprehensive functionality for managing company vehicles, drivers, usage records, maintenance, and alerts.

**Architecture**: REST API with PHP backend
- **Frontend**: Port 5179 (static files)
- **Backend API**: Port 5000 (PHP built-in server)
- **Database**: MySQL 9.5.0

## Default Credentials

- **Admin**: username: `admin@carcontrol.com` / password: `admin123`
- **Driver**: username: `leo@gmail.com` / password: `142316`

## Running the System

### Backend Setup

**Requirements**:
- PHP 8.4 or higher
- MySQL 9.5 or higher
- Extensions: pdo, pdo_mysql, session

**Start Backend API** (Port 5000):
```bash
cd api
php -S localhost:5000 router.php
```

⚠️ **IMPORTANT**: Always use `router.php` parameter! Without it, GPS endpoints won't work.

The API will be available at `http://localhost:5000`

**Database Setup**:
1. Create database: `carcontrol_db`
2. Import schema: `database/carcontrol_db.sql`
3. Run migration: `database/migration.sql`
4. **Apply GPS migration**: `mysql -u root carcontrol_db < database/gps_tracking_migration.sql`
5. Configure: `api/config/database.php`

### Frontend Setup

**Start Frontend** (Port 5179):
```bash
# Use any static server on port 5179
# Or open index.html directly in browser
```

The frontend will be available at `http://localhost:5179`

## Architecture

### File Structure

```
Carcontrol/
├── index.html                 # Login page
├── dashboard.html             # Main application dashboard
├── mobile-driver.html         # Mobile interface for drivers
├── css/
│   ├── styles.css            # Main styles (modern design system)
│   └── styles.css.backup     # Backup of previous version
├── js/
│   ├── api.js                # API integration module
│   ├── auth.js               # Authentication system (API-based)
│   ├── main.js               # Core application logic (API-based)
│   ├── mobile-driver.js      # Mobile driver interface
│   └── gps-tracking.js       # GPS tracking module ⭐ NEW
├── api/                       # Backend PHP REST API
│   ├── index.php             # Main router (includes GPS routes)
│   ├── router.php            # PHP built-in server router ⚠️ REQUIRED
│   ├── config/
│   │   ├── cors.php          # CORS configuration
│   │   └── database.php      # Database connection
│   ├── controllers/
│   │   └── GPSController.php # GPS tracking controller ⭐ NEW
│   ├── auth/
│   │   ├── login.php         # POST /auth/login
│   │   ├── logout.php        # POST /auth/logout
│   │   ├── profile.php       # GET /auth/profile
│   │   └── check.php         # GET /auth/check
│   ├── drivers/
│   │   ├── index.php         # GET/POST /drivers
│   │   └── [id].php          # GET/PUT/DELETE /drivers/{id}
│   ├── vehicles/
│   │   ├── index.php         # GET/POST /vehicles
│   │   └── [id].php          # GET/PUT/DELETE /vehicles/{id}
│   ├── usage/
│   │   ├── index.php         # GET/POST /usage
│   │   ├── active.php        # GET /usage/active
│   │   ├── finalize.php      # POST /usage/finalize/{id}
│   │   └── [id].php          # DELETE /usage/{id}
│   ├── maintenance/
│   │   ├── index.php         # GET/POST /maintenance
│   │   ├── alerts.php        # GET /maintenance/alerts
│   │   └── [id].php          # DELETE /maintenance/{id}
│   ├── destinations/
│   │   ├── index.php         # GET/POST /destinations
│   │   └── [id].php          # GET/PUT/DELETE /destinations/{id}
│   ├── dashboard/
│   │   └── stats.php         # GET /dashboard/stats
│   └── gps/                   # GPS tracking endpoints ⭐ NEW
│       ├── active.php        # GET /gps/active
│       ├── history.php       # GET /gps/history/{id}
│       ├── update.php        # POST /gps/update
│       ├── stop.php          # POST /gps/stop
│       └── vehicle.php       # GET /gps/vehicle/{id}
├── database/
│   ├── carcontrol_db.sql           # Initial database schema
│   ├── migration.sql               # Schema updates and adjustments
│   ├── gps_tracking_migration.sql  # GPS tables migration ⭐ NEW
│   └── check_gps.sql               # GPS diagnostics script ⭐ NEW
└── README.md
```

### Data Storage - API REST Architecture

**Backend**: PHP 8.4 + MySQL 9.5
- RESTful API endpoints
- Session-based authentication (PHP sessions)
- Data persistence in MySQL database
- CORS configured for cross-origin requests

**Frontend**: Vanilla JavaScript
- Communicates with backend via Fetch API
- Session managed by cookies
- No localStorage usage for data persistence
- Real-time data loading from API

**API Base URL**: `http://localhost:5000`

**Session Management**:
- PHP sessions with cookies
- `credentials: 'include'` in fetch requests
- Auto-redirect to login on 401 (Unauthorized)

### User Roles

1. **Admin** (`role: 'admin'`)
   - Full system access
   - Manage vehicles, drivers, maintenance
   - View all sections
   - Created via database seeder

2. **User** (`role: 'user'`)
   - Limited access
   - View-only for most sections
   - Created via database seeder

3. **Motorista/Driver** (`role: 'motorista'`)
   - Auto-created when driver is registered via API
   - Can only access their own usage records
   - Hidden sections: vehicles, drivers, maintenance
   - Mobile-friendly interface

### Database Schema (MySQL 9.5)

Main tables in `database/carcontrol_db.sql`:
- `usuarios` - User authentication (hashed passwords)
- `veiculos` - Vehicle registry (with photos as MEDIUMBLOB)
- `motoristas` - Driver/motorist registry (with photos as MEDIUMBLOB)
- `uso_veiculos` - Vehicle usage tracking
- `manutencao` - Maintenance history
- `despesas` - Expense tracking
- `documentos` - Document management
- `alertas` - Alert/notification system
- `configuracoes` - System settings
- `destinos` - Destinations registry

GPS Tracking tables (from `gps_tracking_migration.sql`): ⭐ NEW
- `gps_tracking` - Real-time GPS location points
  - Stores: latitude, longitude, accuracy, speed, altitude, heading
  - Links to: vehicle, driver, usage record
  - Indexed for fast queries on vehicle/timestamp
- `rotas_historico` - Consolidated route history
  - Stores: GeoJSON route, distance, duration, avg/max speed
  - Calculated automatically via trigger when trip finalizes
- `vw_ultima_localizacao` - View for latest vehicle location
  - Returns last GPS point for each active vehicle
  - Used by real-time tracking map

Features:
- Automatic triggers for status updates
- **GPS trigger**: Auto-creates route history when trip finalizes
- **Haversine function**: Calculates distance between GPS points
- Stored procedures for alert generation and GPS cleanup
- Views for reporting and real-time tracking
- Indexed for performance
- Soft deletes (ativo=0 instead of DELETE)
- Photo storage as base64-encoded MEDIUMBLOB

## Core Functionality

### 1. API Integration Module (`js/api.js`)

Central module for all backend communication.

**Base Configuration**:
```javascript
const API_URL = 'http://localhost:5000';
```

**Key Functions**:
- `apiRequest(endpoint, options)` - Generic API call with error handling
- **Authentication**:
  - `apiLogin(username, password)` - Login user
  - `apiLogout()` - Logout user
  - `apiGetProfile()` - Get current user profile
  - `apiCheckAuth()` - Verify authentication status
- **Drivers**:
  - `apiGetDrivers()` - List all drivers
  - `apiGetDriver(id)` - Get specific driver
  - `apiCreateDriver(driverData)` - Create new driver
  - `apiUpdateDriver(id, driverData)` - Update driver
  - `apiDeleteDriver(id)` - Delete driver (soft delete)
- **Vehicles**:
  - `apiGetVehicles()` - List all vehicles
  - `apiGetVehicle(id)` - Get specific vehicle
  - `apiCreateVehicle(vehicleData)` - Create new vehicle
  - `apiUpdateVehicle(id, vehicleData)` - Update vehicle
  - `apiDeleteVehicle(id)` - Delete vehicle (soft delete)
- **Usage**:
  - `apiGetUsageRecords()` - List all usage records
  - `apiGetActiveUsage()` - List active usage records
  - `apiCreateUsage(usageData)` - Create usage record
  - `apiFinalizeUsage(id, returnData)` - Finalize usage
  - `apiDeleteUsage(id)` - Delete usage record
- **Maintenance**:
  - `apiGetMaintenance()` - List all maintenance records
  - `apiGetMaintenanceAlerts()` - Get maintenance alerts
  - `apiCreateMaintenance(maintenanceData)` - Create maintenance
  - `apiDeleteMaintenance(id)` - Delete maintenance
- **Destinations**:
  - `apiGetDestinations()` - List all destinations
  - `apiGetDestination(id)` - Get specific destination
  - `apiCreateDestination(destinationData)` - Create destination
  - `apiUpdateDestination(id, destinationData)` - Update destination
  - `apiDeleteDestination(id)` - Delete destination (soft delete)
- **Expenses**:
  - `apiGetExpenses()` - List all expense records
  - `apiCreateExpense(expenseData)` - Create expense record
  - `apiDeleteExpense(id)` - Delete expense (hard delete)
- **Dashboard**:
  - `apiGetDashboardStats()` - Get dashboard statistics
- **GPS Tracking**: ⭐ NEW
  - `apiSendGPS(gpsData)` - Send GPS location update
  - `apiGetActiveVehicles()` - Get vehicles with recent GPS data
  - `apiGetRouteHistory(usageId)` - Get route history for a trip
  - `apiStopGPS(usageId)` - Stop GPS tracking for a trip
  - `apiGetVehicleLocation(vehicleId)` - Get last location of specific vehicle

**Error Handling**:
- 401 errors automatically redirect to login page
- All errors thrown to caller for handling
- Response validation included

### 2. Authentication System (`js/auth.js`)

Session-based authentication using backend API.

**Key Features**:
- Async login via `apiLogin()`
- Session managed by PHP backend cookies
- Current user loaded from API on page load
- Role-based redirection

**Key Functions**:
- `login(useremail, password)` - Authenticate user via API
- `logout()` - Logout and redirect to login page
- `getCurrentUser()` - Get current user from memory
- `loadCurrentUser()` - Load user from API (async)
- `isLoggedIn()` - Check if user is authenticated

**Login Flow**:
1. User submits credentials
2. `login()` calls `apiLogin()`
3. Backend validates and creates PHP session
4. Frontend redirects based on user role:
   - `motorista` → mobile-driver.html
   - `admin`/`user` → dashboard.html

### 3. Main Application (`js/main.js`)

All CRUD operations now use async API calls.

**System Initialization**:
```javascript
async function initSystem() {
    // Load user from API
    const currentUser = await loadCurrentUser();

    // Setup UI based on role
    setupUserInterface(currentUser);

    // Load all data from API
    await loadVehiclesTable();
    await loadDriversTable();
    await loadUsageTable();
    await loadMaintenanceTable();
    await loadDestinationsTable();

    // Update dashboard
    await updateDashboardStats();
    loadAlerts();
}
```

**Key Async Functions**:
- `initSystem()` - Initialize application and load data from API
- `setupUserInterface(user)` - Configure UI based on role
- `updateDashboardStats()` - Refresh dashboard metrics
- `loadAlerts()` - Generate and display alerts

**Drivers CRUD**:
- `addDriver()` - Create/update driver via API
- `loadDriversTable()` - Load drivers from `apiGetDrivers()`
- `editDriver(id)` - Load driver data via `apiGetDriver()`
- `deleteDriver(id)` - Delete via `apiDeleteDriver()`

**Vehicles CRUD**:
- `addVehicle()` - Create/update vehicle via API
- `loadVehiclesTable()` - Load vehicles from `apiGetVehicles()`
- `editVehicle(id)` - Load vehicle data via `apiGetVehicle()`
- `deleteVehicle(id)` - Delete via `apiDeleteVehicle()`

**Usage CRUD**:
- `addUsageRecord()` - Create usage via `apiCreateUsage()`
- `loadUsageTable()` - Load usage from `apiGetUsageRecords()`
- `finalizeUsage(id)` - Finalize via `apiFinalizeUsage()`
- `deleteUsageRecord(id)` - Delete via `apiDeleteUsage()`

**Maintenance CRUD**:
- `addMaintenanceRecord()` - Create via `apiCreateMaintenance()`
- `loadMaintenanceTable()` - Load from `apiGetMaintenance()`
- `deleteMaintenance(id)` - Delete via `apiDeleteMaintenance()`

**Destinations CRUD**:
- `addDestination()` - Create/update via API
- `loadDestinationsTable()` - Load from `apiGetDestinations()`
- `editDestination(id)` - Load data via `apiGetDestination()`
- `deleteDestination(id)` - Delete via `apiDeleteDestination()`

**Expenses CRUD**:
- `addExpense()` - Create expense via `apiCreateExpense()`
- `loadExpensesTable()` - Load expenses from `apiGetExpenses()`
- `deleteExpense(id)` - Delete via `apiDeleteExpense()`
- `filterExpenses()` - Filter by period, vehicle, category, date range
- `updateExpenseKPIs()` - Update expense dashboard metrics
- `exportExpenses()` - Export expenses to Excel/CSV
- `toggleExpenseFields()` - Show/hide fields based on category
- `bindExpenseListeners()` - Auto-calculate fuel totals

**Expense Categories**:
- `abastecimento` - Fuel with liters and price per liter
- `pedagio` - Toll
- `estacionamento` - Parking
- `manutencao` - Maintenance
- `outros` - Other expenses

### 4. Validation System

Client-side validations (server-side validation also implemented):
- **Vehicle plate**: Format AAA-0000 with visual feedback
- **CNH (Driver's license)**: 11-digit validation
- **Phone**: Auto-format (11) 99999-9999
- **Dates**: Validate future dates for expirations
- **Required fields**: Complete validation before submission
- **Duplicates**: Backend checks for existing plates and CNH numbers

### 5. Alert System

Auto-generated alerts based on API data:
- Expired CNH (driver's license)
- CNH expiring within 30 days
- Pending maintenance based on mileage (default: 10,000 km intervals)
- Prolonged vehicle use (>12 hours)
- Expired documents (CRLV, insurance, etc.)

## Backend API Endpoints

### Authentication
- `POST /auth/login` - Login with username/password
- `POST /auth/logout` - Logout and destroy session
- `GET /auth/profile` - Get current user profile
- `GET /auth/check` - Check if user is authenticated

### Drivers (Motoristas)
- `GET /drivers` - List all drivers
- `POST /drivers` - Create new driver (auto-creates user account)
- `GET /drivers/{id}` - Get specific driver
- `PUT /drivers/{id}` - Update driver
- `DELETE /drivers/{id}` - Soft delete driver

### Vehicles (Veículos)
- `GET /vehicles` - List all vehicles
- `POST /vehicles` - Create new vehicle
- `GET /vehicles/{id}` - Get specific vehicle
- `PUT /vehicles/{id}` - Update vehicle
- `DELETE /vehicles/{id}` - Soft delete vehicle

### Usage (Uso de Veículos)
- `GET /usage` - List all usage records
- `GET /usage/active` - List active usage records
- `POST /usage` - Create new usage record
- `POST /usage/finalize/{id}` - Finalize usage (set return km)
- `DELETE /usage/{id}` - Delete usage record

### Maintenance (Manutenção)
- `GET /maintenance` - List all maintenance records
- `GET /maintenance/alerts` - Get maintenance alerts
- `POST /maintenance` - Create new maintenance record
- `DELETE /maintenance/{id}` - Delete maintenance record

### Destinations (Destinos)
- `GET /destinations` - List all destinations
- `POST /destinations` - Create new destination
- `GET /destinations/{id}` - Get specific destination
- `PUT /destinations/{id}` - Update destination
- `DELETE /destinations/{id}` - Soft delete destination

### Expenses (Despesas)
- `GET /expenses` - List all expense records
  - Returns: Array of expenses with vehicle details
  - Supports both old schema (tipo/descricao/valor) and new schema (categoria/litros/preco_litro/valor_total)
- `POST /expenses` - Create new expense record
  - Body: `{vehicleId, category, date?, currentKm?, liters?, pricePerLiter?, totalValue?, notes?}`
  - Categories: `abastecimento`, `pedagio`, `estacionamento`, `manutencao`, `outros`
  - Auto-calculates totalValue for fuel if liters and pricePerLiter provided
- `DELETE /expenses/{id}` - Delete expense record (hard delete)

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

### GPS Tracking ⭐ NEW
- `POST /gps/update` - Send GPS location update
  - Body: `{vehicleId, driverId, usageId?, latitude, longitude, accuracy?, speed?, altitude?, heading?}`
- `GET /gps/active` - Get all active vehicles with recent GPS location (<3 min)
- `GET /gps/history/{usageId}` - Get route history for a completed trip
  - Returns: GPS points array, GeoJSON route, statistics
- `POST /gps/stop` - Deactivate GPS tracking for a trip
  - Body: `{usageId}`
- `GET /gps/vehicle/{vehicleId}` - Get last GPS location for specific vehicle

## Design System

Modern interface features:
- CSS variables for theming
- Gradient backgrounds and buttons
- Smooth animations and micro-interactions
- Inter font for typography
- Interactive cards with hover effects
- Fully responsive (desktop, tablet, mobile)
- Real-time feedback and loading states

CSS file: `css/styles.css` (~38KB with complete design system)

## Development Guidelines

### Adding New Features

1. **Create Backend Endpoint** (api/)
   - Add PHP file in appropriate module folder
   - Include CORS configuration: `require_once '../config/cors.php';`
   - Connect to database: `require_once '../config/database.php';`
   - Implement RESTful logic (GET/POST/PUT/DELETE)
   - Return JSON responses with `success` and `data`/`message`

2. **Add API Function** (js/api.js)
   - Create async function using `apiRequest()`
   - Handle both success and error cases
   - Document parameters and return values

3. **Update CRUD Operations** (js/main.js)
   - Make functions async
   - Call appropriate API function
   - Update UI on success
   - Show error messages on failure

4. **Create UI Elements** (dashboard.html)
   - Add forms, tables, modals as needed
   - Use existing CSS classes and components
   - Ensure mobile responsiveness

5. **Apply Validations**
   - Client-side validation for UX
   - Server-side validation for security
   - Consistent error messages

6. **Test with All User Roles**
   - Admin - full access
   - User - limited access
   - Motorista - driver-specific access

### API Integration Pattern

```javascript
// Example: Loading data from API
async function loadData() {
    try {
        const response = await apiGetSomething();

        if (response.success) {
            // Update global array
            dataArray = response.data || [];

            // Update UI
            renderTable();
        } else {
            showAlert(response.message || 'Erro ao carregar dados', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert(error.message || 'Erro ao carregar dados', 'danger');
    }
}

// Example: Creating/updating data
async function saveData() {
    try {
        const data = {
            field1: value1,
            field2: value2
        };

        const response = isEditing
            ? await apiUpdateSomething(id, data)
            : await apiCreateSomething(data);

        if (response.success) {
            showAlert(response.message, 'success');
            await loadData();
            closeModal();
        } else {
            showAlert(response.message, 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert(error.message || 'Erro ao salvar', 'danger');
    }
}

// Example: Deleting data
async function deleteData(id) {
    if (!confirm('Tem certeza?')) return;

    try {
        const response = await apiDeleteSomething(id);

        if (response.success) {
            showAlert(response.message, 'success');
            await loadData();
        } else {
            showAlert(response.message, 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert(error.message || 'Erro ao excluir', 'danger');
    }
}
```

### Validation Pattern

```javascript
// Example validation function
function validatePlaca(placa) {
    const regex = /^[A-Z]{3}-[0-9]{4}$/;
    return regex.test(placa);
}

// Apply validation before API call
async function addVehicle() {
    const plate = document.getElementById('vehiclePlate').value.trim();

    if (!validatePlaca(plate)) {
        showAlert('Placa inválida! Use o formato AAA-0000', 'danger');
        return;
    }

    // Proceed with API call
    const response = await apiCreateVehicle({ plate, ... });
}
```

## Configuration

System configuration via `api/config/`:
- **database.php**: MySQL connection settings
- **cors.php**: CORS settings for allowed origins

Application settings:
- Mileage between maintenance (default: 10,000 km)
- Days advance warning for CNH expiration (default: 30 days)
- Max hours for continuous use (default: 12 hours)
- Default fuel price

## Migration Notes

### Recently Migrated from localStorage to API

**Completed**:
- ✅ Authentication system
- ✅ Drivers CRUD
- ✅ Vehicles CRUD
- ✅ Usage CRUD
- ✅ Maintenance CRUD
- ✅ Destinations CRUD
- ✅ Expenses CRUD
- ✅ Dashboard stats
- ✅ Alert system

**Pending Backend Implementation**:
- ⏳ Usage approval/rejection endpoints (currently local only)
- ⏳ Maintenance update endpoint (PUT /maintenance/{id})

**Data Compatibility**:
- All frontend functions handle both camelCase and snake_case field names
- Example: `vehicle.plate` or `vehicle.placa` both work

## Security Notes

### Current Implementation (Development)

**Backend**:
- ✅ Passwords hashed with `password_hash()` (PHP)
- ✅ PHP sessions for authentication
- ✅ Session validation on protected endpoints
- ✅ SQL prepared statements (PDO)
- ⚠️ CORS allows all origins (`Access-Control-Allow-Origin: *`)

**Frontend**:
- ✅ Client-side validation for UX
- ✅ Cookies sent with `credentials: 'include'`
- ✅ Auto-redirect on 401 (Unauthorized)

### Production Requirements

**Must Implement**:
- 🔒 Configure CORS for specific domains only
- 🔒 Enable HTTPS (SSL/TLS)
- 🔒 Rate limiting on API endpoints
- 🔒 Input sanitization on all user inputs
- 🔒 XSS protection headers
- 🔒 CSRF token validation
- 🔒 SQL injection prevention (already using PDO)
- 🔒 Regular security audits

## Production Deployment

### Backend Setup

1. **Configure Production Server**:
   - Install PHP 8.4+ with required extensions
   - Install MySQL 9.5+
   - Configure PHP-FPM with Nginx/Apache
   - Enable opcache for performance

2. **Database Setup**:
   - Create production database
   - Import schema and migrations
   - Configure backup schedule
   - Set up replication (if needed)

3. **Update CORS Configuration** (api/config/cors.php):
   ```php
   $allowed_origins = [
       'https://yourdomain.com',
       'https://www.yourdomain.com'
   ];
   ```

4. **Environment Configuration**:
   - Update database credentials
   - Set production API URL
   - Configure error logging
   - Disable debug mode

### Frontend Setup

1. **Update API URL** (js/api.js):
   ```javascript
   const API_URL = 'https://api.yourdomain.com';
   ```

2. **Deploy Static Files**:
   - Upload HTML, CSS, JS files to web server
   - Configure HTTPS
   - Enable gzip compression
   - Set cache headers for static assets

3. **CDN Configuration** (optional):
   - Serve static assets via CDN
   - Configure cache invalidation

## Common Tasks

### Adding a New Vehicle
- Navigate to "Veículos" section
- Click "Adicionar Veículo"
- Fill required fields (placa, marca, modelo, ano)
- Upload photo (optional, base64 encoded)
- Validates plate format automatically
- Backend checks for duplicate plates
- Stored in MySQL database

### Registering a Driver
- Navigate to "Motoristas" section
- Click "Adicionar Motorista"
- Fill driver information and CNH details
- Upload photo (optional, base64 encoded)
- Backend auto-generates user credentials with role 'motorista'
- CNH validation applied
- Creates linked user account automatically

### Recording Vehicle Usage
- Navigate to "Uso de Veículos"
- Select vehicle and driver from dropdown (loaded from API)
- Select destination
- Enter departure time and mileage
- API creates usage record and updates vehicle status to "em_uso"
- Backend updates vehicle's current KM

### Finalizing Vehicle Usage
- Click "Finalizar" on active usage record
- Enter return mileage
- API calculates distance and duration
- Backend updates vehicle status to "disponível"
- Updates vehicle's current KM

### Maintenance Tracking
- Navigate to "Manutenção"
- Add maintenance record
- API stores record in database
- Backend updates vehicle's last maintenance mileage
- Alert system calculates next maintenance due
- Generates alerts when due

### Recording Expenses
- Navigate to "Despesas" section
- Click "Adicionar Despesa"
- Select vehicle and expense category
- **For Fuel (Abastecimento)**:
  - Enter liters and price per liter
  - System auto-calculates total value
  - Optionally enter current KM for consumption tracking
- **For Other Expenses**:
  - Enter total value directly
  - Add notes for details
- API stores expense in database
- Dashboard updates KPIs:
  - Monthly total expenses
  - Total fuel costs
  - Maintenance costs
  - Average fuel consumption (km/L)
- Filter expenses by period, vehicle, category, or date range
- Export expenses to Excel/CSV

## Browser Compatibility

Requires modern browser with:
- ES6+ JavaScript support (async/await, fetch)
- CSS Grid and Flexbox
- Fetch API support
- Cookie support (for PHP sessions)

## GPS Tracking System ⭐ NEW

### Overview

The GPS tracking system provides real-time vehicle location monitoring and route history playback using Leaflet.js maps.

**Key Features**:
- Real-time vehicle tracking on interactive map
- Automatic GPS updates every 3 minutes from mobile drivers
- Route history with complete trip replay
- Distance calculation using Haversine formula
- Speed, duration, and distance statistics
- Automatic route history generation on trip completion

### Frontend Components

**Files**:
- `js/gps-tracking.js` - Main GPS tracking module (836 lines)
- `dashboard.html` - GPS UI with tabs and maps

**Key Functions**:
- `initGPSMap()` - Initialize real-time tracking map
- `initRouteHistoryMap()` - Initialize route history map
- `updateVehicleMarkers()` - Update vehicle positions on map
- `startAutoUpdate()` - Start automatic GPS refresh (3 min interval)
- `loadRouteHistory()` - Load and display trip route
- `switchGPSTab(tabName)` - Switch between real-time and history tabs

**UI Components**:
- **Tab 1 - Real-time**: Shows active vehicles on map with live updates
- **Tab 2 - History**: Shows completed trip routes with sidebar selection
- **Markers**: Custom vehicle icons with popup info
- **Route visualization**: Polylines with start/end markers

### Backend Components

**Controller**: `api/controllers/GPSController.php`
- `updateLocation()` - Store GPS point (POST /gps/update)
- `getActiveVehicles()` - Get vehicles with recent GPS (<3 min)
- `getRouteHistory()` - Get trip route points and statistics
- `stopTracking()` - Deactivate GPS for completed trip
- `getVehicleLocation()` - Get last location for specific vehicle

**Database**:
- `gps_tracking` table: Stores individual GPS points
- `rotas_historico` table: Stores consolidated route data
- `vw_ultima_localizacao` view: Latest location per vehicle
- Trigger `tr_finalizar_viagem_rota`: Auto-creates route history

### How It Works

1. **GPS Collection** (Mobile Driver):
   - Driver starts trip via `mobile-driver.html`
   - Browser requests geolocation permission
   - GPS coordinates sent every 3 minutes via `apiSendGPS()`
   - Stored in `gps_tracking` table with `active=1`

2. **Real-time Display** (Dashboard):
   - Admin/User opens "Rastreamento GPS" section
   - Map loads with `initGPSMap()`
   - `updateVehicleMarkers()` called every 3 minutes
   - Queries `vw_ultima_localizacao` view for latest positions
   - Markers updated on map with vehicle info popups

3. **Trip Finalization**:
   - Driver finalizes trip
   - Trigger `tr_finalizar_viagem_rota` executes
   - Calculates total distance using Haversine formula
   - Creates GeoJSON route from GPS points
   - Stores in `rotas_historico` table
   - Sets all GPS points `active=0`

4. **Route History**:
   - User selects completed trip from sidebar
   - Calls `apiGetRouteHistory(usageId)`
   - Draws polyline on map from GPS points
   - Shows start (🚀) and end (🏁) markers
   - Displays statistics: distance, duration, avg speed

### GPS Data Structure

**GPS Point**:
```javascript
{
  vehicleId: 1,
  driverId: 2,
  usageId: 5,
  latitude: -23.5505,
  longitude: -46.6333,
  accuracy: 10,      // meters
  speed: 45.5,       // km/h
  altitude: 750,     // meters
  heading: 90        // degrees (0-360)
}
```

**Route History Response**:
```javascript
{
  points: [...],           // Array of GPS points
  totalPoints: 150,
  history: {
    distancia_total: 25.5, // km (Haversine)
    duracao_minutos: 45,
    velocidade_media: 34,  // km/h
    velocidade_maxima: 80
  },
  usage: {
    destination: "Centro",
    departureTime: "2025-01-06 08:00:00",
    returnTime: "2025-01-06 08:45:00",
    vehiclePlate: "ABC-1234",
    driverName: "João Silva"
  }
}
```

### Troubleshooting GPS

**GPS not loading / 404 errors**:
- ⚠️ **CRITICAL**: Backend must be started with `router.php`
- Wrong: `php -S localhost:5000`
- **Correct**: `php -S localhost:5000 router.php`

**No vehicles showing on real-time map**:
- Check if any trips are active (status='em_uso')
- Verify GPS points exist: `SELECT * FROM gps_tracking WHERE active=1`
- Check last update time (must be < 3 minutes ago)
- Run diagnostic: `mysql -u root carcontrol_db < database/check_gps.sql`

**Route history empty**:
- Verify trip is finalized (status='finalizado')
- Check if GPS points were collected during trip
- Verify trigger created route: `SELECT * FROM rotas_historico WHERE uso_veiculo_id=X`
- Re-run trigger if needed (finalize trip again)

**Verify GPS tables exist**:
```bash
mysql -u root carcontrol_db -e "SHOW TABLES LIKE 'gps%'"
# Should show: gps_tracking

mysql -u root carcontrol_db -e "SHOW TABLES LIKE 'rotas%'"
# Should show: rotas_historico
```

**Apply GPS migration if missing**:
```bash
mysql -u root carcontrol_db < database/gps_tracking_migration.sql
```

## Troubleshooting

### Common Issues

**Backend not responding**:
- Check if PHP server is running on port 5000
- Verify database connection in `api/config/database.php`
- Check PHP error logs

**CORS errors**:
- Verify `api/config/cors.php` includes frontend origin
- Check browser console for specific CORS error
- Ensure backend includes CORS headers

**Login not working**:
- Verify database has user records
- Check PHP session configuration
- Ensure cookies are enabled in browser
- Check network tab for API response

**Data not loading**:
- Check browser console for JavaScript errors
- Verify API endpoint is returning data
- Check network tab for failed requests
- Ensure user is authenticated (401 errors)

## Performance Optimization

### Backend
- Enable PHP opcache
- Use database connection pooling
- Index frequently queried columns
- Implement query caching
- Use prepared statements (already implemented)

### Frontend
- Minimize API calls (cache data in memory)
- Use pagination for large datasets
- Lazy load images
- Debounce search inputs
- Minimize DOM manipulations
