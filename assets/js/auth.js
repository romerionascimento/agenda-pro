// Authentication and Authorization Module for Agenda-Pro
const Auth = {
    sessionKey: 'agenda_pro_session',

    // Page to permission mapping
    pagePermissions: {
        'dashboard.html': 'ver_dashboard',
        'agenda.html': 'ver_agenda',
        'clientes.html': 'gerenciar_clientes',
        'tecnicos.html': 'gerenciar_tecnicos_equipes',
        'equipes.html': 'gerenciar_tecnicos_equipes',
        'relatorios.html': 'ver_relatorios',
        'usuarios.html': 'gerenciar_usuarios',
        'logs.html': 'ver_logs',
        'configuracoes.html': 'gerenciar_configuracoes'
    },

    checkAuth() {
        const session = localStorage.getItem(this.sessionKey);
        const currentPath = window.location.pathname;
        const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        const isLoginPage = pageName === 'login.html' || pageName === '';

        if (!session) {
            if (!isLoginPage) {
                // Not logged in and trying to access a secure page
                window.location.href = 'login.html';
            }
        } else {
            if (isLoginPage) {
                // Logged in and trying to access login page
                this.redirectToAllowedPage();
            } else {
                // Logged in: Check permission for this specific page
                const user = JSON.parse(session);
                const requiredPermission = this.pagePermissions[pageName];

                if (requiredPermission && (!user.permissions || !user.permissions.includes(requiredPermission))) {
                    // Access Denied! Render beautiful glassmorphic overlay
                    this.renderAccessDenied(pageName);
                }
            }
        }
    },

    login(username, password) {
        try {
            // Fetch users from API (dynamic local storage database)
            const users = Api.getUsers();
            const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase() && u.password === password);

            if (user) {
                // Block pending users
                if (user.status === 'pendente') {
                    return { success: false, message: 'Seu cadastro está aguardando aprovação do administrador. Tente novamente mais tarde.' };
                }
                const userData = {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem(this.sessionKey, JSON.stringify(userData));
                return { success: true };
            }
            return { success: false, message: 'Usuário ou senha inválidos!' };
        } catch (err) {
            return { success: false, message: 'Erro interno: ' + err.message };
        }
    },

    logout() {
        localStorage.removeItem(this.sessionKey);
        window.location.href = 'login.html';
    },

    getCurrentUser() {
        const session = localStorage.getItem(this.sessionKey);
        return session ? JSON.parse(session) : null;
    },

    // Redirect user to the first page they actually have access to
    redirectToAllowedPage() {
        const user = this.getCurrentUser();
        if (!user || !user.permissions) {
            this.logout();
            return;
        }

        if (user.permissions.includes('ver_dashboard')) {
            window.location.href = 'dashboard.html';
        } else if (user.permissions.includes('ver_agenda')) {
            window.location.href = 'agenda.html';
        } else if (user.permissions.includes('gerenciar_clientes')) {
            window.location.href = 'clientes.html';
        } else {
            // Fallback
            this.logout();
        }
    },

    initPageHeader() {
        const user = this.getCurrentUser();
        if (!user) return;

        // 1. Update user info on sidebar
        const nameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const avatarEl = document.querySelector('.user-avatar');

        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role;
        if (avatarEl) {
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.textContent = initials;
        }

        // 2. Hide unauthorized menu links dynamically
        const menuItems = {
            'nav-dashboard': 'ver_dashboard',
            'nav-agenda': 'ver_agenda',
            'nav-clientes': 'gerenciar_clientes',
            'nav-tecnicos': 'gerenciar_tecnicos_equipes',
            'nav-equipes': 'gerenciar_tecnicos_equipes',
            'nav-relatorios': 'ver_relatorios',
            'nav-usuarios': 'gerenciar_usuarios',
            'nav-logs': 'ver_logs',
            'nav-configuracoes': 'gerenciar_configuracoes'
        };

        Object.entries(menuItems).forEach(([elId, permission]) => {
            const el = document.getElementById(elId);
            if (el) {
                const parentLi = el.closest('li');
                if (!user.permissions || !user.permissions.includes(permission)) {
                    if (parentLi) parentLi.style.display = 'none';
                    else el.style.display = 'none';
                }
            }
        });

        // 3. Attach logout event
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // 4. Show pending users badge for admins
        this.renderPendingBadge(user);
    },

    renderPendingBadge(user) {
        if (!user || !user.permissions || !user.permissions.includes('gerenciar_usuarios')) return;
        try {
            const pendingCount = Api.getPendingUsers().length;
            const navUsuarios = document.getElementById('nav-usuarios');
            if (navUsuarios && pendingCount > 0) {
                // Remove old badge if exists
                const oldBadge = navUsuarios.querySelector('.pending-badge');
                if (oldBadge) oldBadge.remove();
                
                const badge = document.createElement('span');
                badge.className = 'pending-badge';
                badge.textContent = pendingCount;
                badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:0.65rem;font-weight:700;min-width:18px;height:18px;border-radius:9px;padding:0 5px;margin-left:8px;animation:fadeIn 0.3s ease;';
                navUsuarios.appendChild(badge);
            }
        } catch(e) {}
    },

    // Render a premium Access Denied page overlay
    renderAccessDenied(pageName) {
        // Stop execution and render block overlay
        document.body.innerHTML = '';
        document.body.style.display = 'flex';
        document.body.style.alignItems = 'center';
        document.body.style.justifyContent = 'center';
        document.body.style.minHeight = '100vh';
        document.body.style.background = '#121212';
        document.body.style.color = '#ffffff';

        const pageTitles = {
            'dashboard.html': 'Dashboard',
            'agenda.html': 'Agenda de Serviços',
            'clientes.html': 'Gestão de Clientes',
            'tecnicos.html': 'Gestão de Técnicos',
            'equipes.html': 'Gestão de Equipes',
            'relatorios.html': 'Relatórios',
            'usuarios.html': 'Gerenciamento de Usuários',
            'logs.html': 'Registro de Atividades',
            'configuracoes.html': 'Configurações'
        };

        const title = pageTitles[pageName] || pageName;

        const overlay = document.createElement('div');
        overlay.style.maxWidth = '450px';
        overlay.style.width = '90%';
        overlay.style.backgroundColor = '#1a1a1a';
        overlay.style.border = '1px solid #2c2c2c';
        overlay.style.borderRadius = '12px';
        overlay.style.padding = '40px 30px';
        overlay.style.textAlign = 'center';
        overlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        overlay.style.animation = 'fadeIn 0.3s ease';

        overlay.innerHTML = `
            <div style="font-size: 3.5rem; color: #ef4444; margin-bottom: 20px;">🚫</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">Acesso Negado</h2>
            <p style="font-size: 0.9rem; color: #8e8e93; line-height: 1.5; margin-bottom: 25px;">
                Você não possui privilégios de acesso para visualizar a tela de <strong>${title}</strong>. Entre em contato com um administrador para obter permissão.
            </p>
            <button id="btn-back-allowed" class="btn btn-primary" style="padding: 10px 20px; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                Voltar para Área Permitida
            </button>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-back-allowed').addEventListener('click', () => {
            this.redirectToAllowedPage();
        });
    }
};

// Auto run auth check on load
Auth.checkAuth();
document.addEventListener('DOMContentLoaded', () => {
    Auth.initPageHeader();
});
