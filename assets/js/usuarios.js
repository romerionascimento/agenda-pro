// Users and Permissions Management Logic for Agenda-Pro
const UsersPage = {
    modal: null,
    form: null,
    listContainer: null,
    searchInput: null,
    modalTitle: null,
    matrixContainer: null,
    roleSelect: null,

    permissionsList: [
        { key: 'ver_dashboard', name: 'Acesso ao Dashboard', desc: 'Permite visualizar o resumo de estatísticas gerais do sistema.' },
        { key: 'ver_agenda', name: 'Visualizar Agenda', desc: 'Permite visualizar a agenda de atendimentos (Dia, Semana, Mês).' },
        { key: 'editar_agenda', name: 'Criar e Editar Agenda', desc: 'Permite criar, alterar e excluir agendamentos na grade horária.' },
        { key: 'gerenciar_clientes', name: 'Gerenciar Clientes', desc: 'Acesso completo ao cadastro, edição e exclusão de clientes.' },
        { key: 'gerenciar_tecnicos_equipes', name: 'Gerenciar Técnicos & Equipes', desc: 'Cadastro de profissionais técnicos e organização em equipes.' },
        { key: 'ver_relatorios', name: 'Visualizar Relatórios', desc: 'Permite analisar gráficos e contadores de produtividade por período.' },
        { key: 'gerenciar_usuarios', name: 'Gerenciar Usuários & Permissões', desc: 'Acesso completo a este painel administrativo.' },
        { key: 'ver_logs', name: 'Visualizar Histórico de Logs', desc: 'Visualizar o registro de atividades e ações dos usuários.' },
        { key: 'gerenciar_configuracoes', name: 'Gerenciar Configurações', desc: 'Alterar configurações de cotas e títulos pré-definidos.' },
        { key: 'editar_protocolo', name: 'Editar Protocolo ERP', desc: 'Permite alterar o número de protocolo de um agendamento já salvo.' }
    ],

    rolePresets: {
        'Administrador': ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes', 'gerenciar_tecnicos_equipes', 'ver_relatorios', 'gerenciar_usuarios', 'ver_logs', 'gerenciar_configuracoes', 'editar_protocolo'],
        'Supervisor': ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes', 'gerenciar_tecnicos_equipes', 'ver_relatorios', 'ver_logs', 'editar_protocolo'],
        'Comercial': ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes'],
        'Técnico': ['ver_agenda', 'gerenciar_clientes']
    },

    init() {
        this.cacheElements();
        this.buildPermissionsMatrix();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.modal = document.getElementById('user-modal');
        this.form = document.getElementById('user-form');
        this.listContainer = document.getElementById('users-list');
        this.searchInput = document.getElementById('search-input');
        this.modalTitle = document.getElementById('modal-title');
        this.matrixContainer = document.getElementById('permissions-matrix');
        this.roleSelect = document.getElementById('user-role');
    },

    buildPermissionsMatrix() {
        this.matrixContainer.innerHTML = '';
        this.permissionsList.forEach(p => {
            const card = document.createElement('label');
            card.className = 'permission-checkbox-card';
            card.innerHTML = `
                <input type="checkbox" value="${p.key}" class="perm-checkbox">
                <div class="permission-info">
                    <span class="permission-name">${p.name}</span>
                    <span class="permission-desc">${p.desc}</span>
                </div>
            `;
            
            // If they change any checkbox manually, check if it matches a preset or set to Custom
            card.querySelector('input').addEventListener('change', () => {
                this.evaluatePresetMatch();
            });

            this.matrixContainer.appendChild(card);
        });
    },

    bindEvents() {
        document.getElementById('btn-add-user').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-user').addEventListener('click', () => this.closeModal());

        this.form.addEventListener('submit', (e) => this.saveUser(e));
        this.searchInput.addEventListener('input', () => this.render());
        
        // When preset profile changes, check appropriate boxes
        this.roleSelect.addEventListener('change', () => this.applyPresetPermissions());
    },

    applyPresetPermissions() {
        const selectedRole = this.roleSelect.value;
        if (selectedRole === 'Personalizado') return;

        const allowedPermissions = this.rolePresets[selectedRole] || [];
        
        this.matrixContainer.querySelectorAll('.perm-checkbox').forEach(cb => {
            cb.checked = allowedPermissions.includes(cb.value);
        });
    },

    // Check if the current checked combination matches any of the presets
    evaluatePresetMatch() {
        const checked = [];
        this.matrixContainer.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
            checked.push(cb.value);
        });

        let matchedRole = 'Personalizado';

        for (const [roleName, permissions] of Object.entries(this.rolePresets)) {
            // Check if lists are identical
            const isMatch = permissions.length === checked.length && 
                            permissions.every(p => checked.includes(p));
            if (isMatch) {
                matchedRole = roleName;
                break;
            }
        }

        this.roleSelect.value = matchedRole;
    },

    openModal(user = null) {
        this.form.reset();
        
        const passwordInput = document.getElementById('user-password');
        const passwordLabel = document.getElementById('user-password-label');

        if (user) {
            this.modalTitle.textContent = 'Editar Usuário';
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-username').value = user.username;
            
            // Password not required in edit mode
            passwordInput.placeholder = 'Deixe em branco para manter a atual';
            passwordInput.required = false;
            passwordLabel.textContent = 'Senha';

            this.roleSelect.value = user.role;
            
            // Set permissions
            this.matrixContainer.querySelectorAll('.perm-checkbox').forEach(cb => {
                cb.checked = (user.permissions || []).includes(cb.value);
            });
        } else {
            this.modalTitle.textContent = 'Novo Usuário';
            document.getElementById('user-id').value = '';
            
            passwordInput.placeholder = 'Digite a senha';
            passwordInput.required = true;
            passwordLabel.textContent = 'Senha *';

            this.roleSelect.value = 'Supervisor';
            this.applyPresetPermissions();
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    saveUser(e) {
        e.preventDefault();

        const idInput = document.getElementById('user-id');
        const id = idInput.value;
        const name = document.getElementById('user-name').value;
        const username = document.getElementById('user-username').value;
        const password = document.getElementById('user-password').value;
        const role = this.roleSelect.value;
        const isApproving = idInput.dataset.approving === 'true';
        
        // Collect permissions
        const permissions = [];
        this.matrixContainer.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
            permissions.push(cb.value);
        });

        if (permissions.length === 0) {
            alert('Por favor, selecione pelo menos uma permissão de acesso!');
            return;
        }

        const user = { name, username, role, permissions, status: 'aprovado' };
        if (id) {
            user.id = id;
        }
        if (password) {
            user.password = password;
        }

        // Validate username uniqueness (only for new users, or if name changed)
        const allUsers = Api.getUsers();
        const dup = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
        if (dup) {
            alert('Esse nome de usuário já está sendo utilizado!');
            return;
        }

        Api.saveUser(user);
        
        // Clear approving flag
        idInput.dataset.approving = '';

        // Refresh pending badge
        const currentUser = Auth.getCurrentUser();
        if (currentUser) Auth.renderPendingBadge(currentUser);

        this.closeModal();
        this.render();
    },

    deleteUser(id) {
        // Prevent deleting own logged in user
        const session = localStorage.getItem(Auth.sessionKey);
        if (session) {
            const loggedIn = JSON.parse(session);
            if (loggedIn.id === id) {
                alert('Você não pode excluir o usuário que está logado no momento!');
                return;
            }
        }

        if (confirm('Tem certeza de que deseja excluir este usuário?')) {
            Api.deleteUser(id);
            this.render();
        }
    },

    render() {
        const query = this.searchInput.value.toLowerCase().trim();
        const users = Api.getUsers();
        
        // Separate pending from approved users
        const pendingUsers = users.filter(u => u.status === 'pendente');
        const activeUsers = users.filter(u => u.status !== 'pendente');

        const filtered = activeUsers.filter(u => 
            u.name.toLowerCase().includes(query) ||
            u.username.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query)
        );

        this.listContainer.innerHTML = '';

        // Render Pending Users Section
        if (pendingUsers.length > 0) {
            const pendingHeader = document.createElement('tr');
            pendingHeader.innerHTML = `
                <td colspan="5" style="background: rgba(239,68,68,0.08); padding: 12px 16px; border-bottom: 2px solid rgba(239,68,68,0.3);">
                    <strong style="color: #ef4444; font-size: 0.9rem;">🔔 ${pendingUsers.length} cadastro(s) aguardando aprovação</strong>
                </td>
            `;
            this.listContainer.appendChild(pendingHeader);

            pendingUsers.forEach(u => {
                const tr = document.createElement('tr');
                tr.style.backgroundColor = 'rgba(239,68,68,0.04)';
                tr.innerHTML = `
                    <td><strong>${u.name}</strong></td>
                    <td><code>${u.username}</code></td>
                    <td><span class="badge" style="background-color: rgba(239,68,68,0.15); color: #ef4444;">⏳ Pendente</span></td>
                    <td><span style="color: var(--text-muted); font-size: 0.8rem;">${new Date(u.createdAt).toLocaleDateString('pt-BR')} ${new Date(u.createdAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span></td>
                    <td style="text-align: center;">
                        <div class="actions-cell" style="justify-content: center;">
                            <button class="btn-action btn-approve" title="Aprovar" style="background-color: rgba(16,185,129,0.15); color: #10b981;">✅</button>
                            <button class="btn-action btn-reject" title="Rejeitar" style="background-color: rgba(239,68,68,0.15); color: #ef4444;">❌</button>
                        </div>
                    </td>
                `;

                tr.querySelector('.btn-approve').addEventListener('click', () => this.approveUser(u));
                tr.querySelector('.btn-reject').addEventListener('click', () => this.rejectUser(u.id));

                this.listContainer.appendChild(tr);
            });

            // Separator row
            const sep = document.createElement('tr');
            sep.innerHTML = `<td colspan="5" style="padding: 5px; border-bottom: 1px solid var(--border-color);"></td>`;
            this.listContainer.appendChild(sep);
        }

        // Render Active Users
        if (filtered.length === 0 && pendingUsers.length === 0) {
            this.listContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(u => {
            const totalPerms = (u.permissions || []).length;
            let permBadge = '';
            if (u.role === 'Administrador') {
                permBadge = `<span class="badge" style="background-color: rgba(255, 59, 48, 0.15); color: var(--primary-color);">Acesso Total (${totalPerms})</span>`;
            } else {
                permBadge = `<span class="badge" style="background-color: rgba(255,255,255,0.05); color: var(--text-muted);">${totalPerms} permissões</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td><code>${u.username}</code></td>
                <td><span class="badge" style="background-color: rgba(255,255,255,0.08); color: var(--text-color);">${u.role}</span></td>
                <td>${permBadge}</td>
                <td style="text-align: center;">
                    <div class="actions-cell" style="justify-content: center;">
                        <button class="btn-action btn-action-edit" title="Editar">✏️</button>
                        <button class="btn-action btn-action-delete" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;

            // Bind Actions
            tr.querySelector('.btn-action-edit').addEventListener('click', () => this.openModal(u));
            tr.querySelector('.btn-action-delete').addEventListener('click', () => this.deleteUser(u.id));

            this.listContainer.appendChild(tr);
        });
    },

    approveUser(user) {
        // Open the modal pre-filled with the pending user's data so admin can set role and permissions
        this.form.reset();

        const passwordInput = document.getElementById('user-password');
        const passwordLabel = document.getElementById('user-password-label');

        this.modalTitle.textContent = '✅ Aprovar Cadastro';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-username').value = user.username;
        
        passwordInput.placeholder = 'Deixe em branco para manter a senha do cadastro';
        passwordInput.required = false;
        passwordLabel.textContent = 'Senha';

        // Default to Técnico role
        this.roleSelect.value = 'Técnico';
        this.applyPresetPermissions();

        // Mark as approving (set status to approved on save)
        document.getElementById('user-id').dataset.approving = 'true';

        this.modal.classList.add('active');
    },

    rejectUser(userId) {
        if (confirm('Tem certeza que deseja REJEITAR e excluir este cadastro?')) {
            Api.rejectUser(userId);
            this.render();
            // Refresh badge
            const currentUser = Auth.getCurrentUser();
            if (currentUser) Auth.renderPendingBadge(currentUser);
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => UsersPage.init());
window.addEventListener('api-data-updated', () => {
    if (UsersPage && typeof UsersPage.render === 'function') UsersPage.render();
});
