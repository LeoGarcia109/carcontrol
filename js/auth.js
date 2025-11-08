// ================================================================
// Sistema de Autenticação - CarControl
// Integrado com API Backend
// ================================================================
console.log('🔐 Auth module loaded');

let currentUser = null;

// ================================================================
// Funções de Gerenciamento de Sessão
// ================================================================

/**
 * Verificar se usuário está logado
 * @returns {boolean}
 */
function isLoggedIn() {
    return currentUser !== null;
}

/**
 * Obter usuário atual da sessão
 * @returns {object|null}
 */
function getCurrentUser() {
    if (currentUser) return currentUser;
    try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
            return currentUser;
        }
    } catch (e) {
        // ignore parse errors
    }
    return null;
}

/**
 * Carregar perfil do usuário autenticado da API
 * @returns {Promise<object|null>}
 */
async function loadCurrentUser() {
    try {
        const response = await apiGetProfile();
        if (response.success) {
            currentUser = response.user;
            // Persistir em localStorage para navegação entre páginas
            try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch (_) {}
            return currentUser;
        }
    } catch (error) {
        console.log('Usuário não autenticado');
        currentUser = null;
        try { localStorage.removeItem('currentUser'); } catch (_) {}
    }
    return null;
}

// ================================================================
// Funções de Autenticação
// ================================================================

/**
 * Fazer login na API
 * @param {string} email
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function login(email, password) {
    try {
        const response = await apiLogin(email, password);

        if (response.success) {
            currentUser = response.user;
            console.log('Login realizado com sucesso:', currentUser);
            try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch (_) {}
            return true;
        }

        return false;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        return false;
    }
}

/**
 * Fazer logout
 */
async function logout() {
    try {
        await apiLogout();
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    } finally {
        currentUser = null;
        try { localStorage.removeItem('currentUser'); } catch (_) {}
        window.location.href = 'index.html';
    }
}

// ================================================================
// Funções de Senha (Para Motoristas)
// ================================================================

/**
 * Gerar senha aleatória
 * @param {number} length
 * @returns {string}
 */
function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// ================================================================
// Event Listeners
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOMContentLoaded event fired');
    const loginForm = document.getElementById('loginForm');
    console.log('📋 Login form:', loginForm);

    if (loginForm) {
        console.log('✅ Login form found, attaching event listener');
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔐 Form submitted');

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            console.log('📧 Email:', email);
            console.log('🔑 Password length:', password.length);

            const errorDiv = document.getElementById('errorMessage');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            // Desabilitar botão durante o login
            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';
            console.log('⏳ Calling login function...');

            try {
                const success = await login(email, password);
                console.log('✅ Login result:', success);

                if (success) {
                    const user = getCurrentUser();
                    console.log('Usuário logado:', user);

                    // Redirecionar baseado no role
                    if (user.role === 'motorista' || user.role === 'user') {
                        window.location.href = 'mobile-driver.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    errorDiv.textContent = 'Usuário ou senha incorretos!';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('❌ Login error:', error);
                errorDiv.textContent = error.message || 'Erro ao conectar com o servidor';
                errorDiv.style.display = 'block';
            } finally {
                // Reabilitar botão
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        });
    }
});
