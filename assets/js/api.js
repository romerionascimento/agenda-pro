// Mock Database and API simulation for Agenda-Pro
console.log("api.js started evaluating");

const supabaseUrl = 'https://bllkimqqkdqnmaktncvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGtpbXFxa2Rxbm1ha3RuY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDg0MTcsImV4cCI6MjA5NzE4NDQxN30.T8sBnVe39HDMEzmFfvWkO8XceM-MEvPWRjAhw1Dw-aM';

const Api = {
    // Keys
    keys: {
        clients: 'agenda_pro_clients',
        technicians: 'agenda_pro_techs',
        teams: 'agenda_pro_teams',
        appointments: 'agenda_pro_appointments',
        users: 'agenda_pro_users',
        logs: 'agenda_pro_logs',
        config: 'agenda_pro_config'
    },

    supabase: null,
    isReady: false,

    async init() {
        if (this.isReady) return;
        try {
            await this.loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
            this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            this.isReady = true;
            await this.syncFromSupabase();
        } catch (e) {
            console.error("Supabase init failed", e);
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async syncFromSupabase() {
        if (!this.supabase) return;
        try {
            const tables = [
                { name: 'clients', key: this.keys.clients },
                { name: 'technicians', key: this.keys.technicians },
                { name: 'teams', key: this.keys.teams },
                { name: 'appointments', key: this.keys.appointments },
                { name: 'users', key: this.keys.users },
                { name: 'logs', key: this.keys.logs }
            ];

            for (const table of tables) {
                const { data, error } = await this.supabase.from(table.name).select('*');
                if (!error && data && data.length > 0) {
                    const mappedData = data.map(item => {
                        if (item.created_at) {
                            item.createdAt = item.created_at;
                            delete item.created_at;
                        }
                        return item;
                    });
                    localStorage.setItem(table.key, JSON.stringify(mappedData));
                }
            }

            // Push local seed data to Supabase if tables are empty
            const localUsers = this._get(this.keys.users);
            if (localUsers.length > 0) {
                const { data: remoteUsers } = await this.supabase.from('users').select('id');
                if (!remoteUsers || remoteUsers.length === 0) {
                    for (const u of localUsers) {
                        await this._pushToSupabase('users', u);
                    }
                }
            }

            const { data: configData, error: configError } = await this.supabase.from('config').select('*').eq('id', 1).single();
            if (!configError && configData) {
                localStorage.setItem(this.keys.config, JSON.stringify(configData));
            }

            window.dispatchEvent(new Event('api-data-updated'));
        } catch(e) {
            console.error("Sync error", e);
        }
    },

    // Get helper
    _get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : (key === this.keys.config ? {} : []);
    },

    // Set helper
    _set(key, val) {
        const jsonStr = JSON.stringify(val);
        localStorage.setItem(key, jsonStr);
    },

    async _pushToSupabase(table, data) {
        if (!this.supabase) return;
        try {
            const payload = { ...data };
            if (payload.createdAt) { payload.created_at = payload.createdAt; delete payload.createdAt; }
            await this.supabase.from(table).upsert(payload);
        } catch(e) { console.error("Error pushing to Supabase", e); }
    },

    async _deleteFromSupabase(table, id) {
        if (!this.supabase) return;
        try {
            await this.supabase.from(table).delete().eq('id', id);
        } catch(e) { console.error("Error deleting from Supabase", e); }
    },

    // --- Logging & Config ---
    addLog(action, description) {
        let user = 'Sistema';
        let username = 'sistema';
        try {
            const sessionData = localStorage.getItem('agenda_pro_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.name) {
                    user = session.name;
                    username = session.username;
                }
            }
        } catch (e) {}

        const logs = this._get(this.keys.logs);
        const logEntry = {
            id: 'log_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            user: user,
            username: username,
            action: action,
            description: description
        };
        logs.push(logEntry);
        this._set(this.keys.logs, logs);
        this._pushToSupabase('logs', logEntry);
    },
    getLogs() {
        return this._get(this.keys.logs).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    getConfig() {
        const config = this._get(this.keys.config);
        if (!config || Object.keys(config).length === 0) {
            return {
                quotaEnabled: false,
                quotaType: 'semanal',
                quotaLimit: 20,
                predefinedTitles: [
                    '[AF] LUDI BRASILEI NASCIMENTO',
                    '[VIS] AGL MAGALHAES',
                    '[REDE] JX AZEDO SOCIEDADE ADVOGADOS',
                    '[PLUS] GUSTAVO MACEDO COSTA',
                    '[RET] HOCA CONSULTORIA TRIBUTARIA'
                ]
            };
        }
        return config;
    },
    saveConfig(config) {
        this._set(this.keys.config, config);
        this._pushToSupabase('config', { id: 1, ...config });
        this.addLog('Configurações', 'Atualizou configurações do sistema');
        return config;
    },
    checkQuota(dateStr) {
        const config = this.getConfig();
        if (!config.quotaEnabled) return { exceeded: false };

        const appts = this.getAppointments();
        const apptDate = new Date(dateStr);
        let count = 0;

        if (config.quotaType === 'semanal') {
            // Get week start and end
            const day = apptDate.getDay();
            const diff = apptDate.getDate() - day; // Assuming week starts on Sunday
            const startOfWeek = new Date(apptDate.setDate(diff));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23,59,59,999);

            count = appts.filter(a => {
                const d = new Date(a.date);
                return d >= startOfWeek && d <= endOfWeek;
            }).length;
        } else if (config.quotaType === 'mensal') {
            const year = apptDate.getFullYear();
            const month = apptDate.getMonth();
            count = appts.filter(a => {
                const d = new Date(a.date);
                return d.getFullYear() === year && d.getMonth() === month;
            }).length;
        }

        if (count >= config.quotaLimit) {
            return { exceeded: true, limit: config.quotaLimit, type: config.quotaType };
        }
        return { exceeded: false };
    },

    // --- Clients CRUD ---
    getClients() {
        return this._get(this.keys.clients);
    },
    saveClient(client) {
        const clients = this.getClients();
        if (client.id) {
            const index = clients.findIndex(c => c.id === client.id);
            if (index !== -1) clients[index] = { ...clients[index], ...client };
            this.addLog('Cliente', `Atualizou cliente: ${client.name}`);
        } else {
            client.id = 'cli_' + Math.random().toString(36).substring(2, 9);
            client.createdAt = new Date().toISOString();
            clients.push(client);
            this.addLog('Cliente', `Criou novo cliente: ${client.name}`);
        }
        this._set(this.keys.clients, clients);
        this._pushToSupabase('clients', client);
        return client;
    },
    deleteClient(id) {
        const clients = this.getClients();
        const client = clients.find(c => c.id === id);
        if (client) {
            this.addLog('Cliente', `Excluiu cliente: ${client.name}`);
        }
        const filtered = clients.filter(c => c.id !== id);
        this._set(this.keys.clients, filtered);
        this._deleteFromSupabase('clients', id);
        return true;
    },

    // --- Technicians CRUD ---
    getTechnicians() {
        return this._get(this.keys.technicians);
    },
    saveTechnician(tech) {
        const techs = this.getTechnicians();
        if (tech.id) {
            const index = techs.findIndex(t => t.id === tech.id);
            if (index !== -1) techs[index] = { ...techs[index], ...tech };
            this.addLog('Técnico', `Atualizou técnico: ${tech.name}`);
        } else {
            tech.id = 'tech_' + Math.random().toString(36).substring(2, 9);
            techs.push(tech);
            this.addLog('Técnico', `Criou técnico: ${tech.name}`);
        }
        this._set(this.keys.technicians, techs);
        this._pushToSupabase('technicians', tech);
        return tech;
    },
    deleteTechnician(id) {
        const techs = this.getTechnicians();
        const tech = techs.find(t => t.id === id);
        if (tech) this.addLog('Técnico', `Excluiu técnico: ${tech.name}`);
        const filtered = techs.filter(t => t.id !== id);
        this._set(this.keys.technicians, filtered);
        this._deleteFromSupabase('technicians', id);
        return true;
    },

    // --- Teams CRUD ---
    getTeams() {
        return this._get(this.keys.teams);
    },
    saveTeam(team) {
        const teams = this.getTeams();
        if (team.id) {
            const index = teams.findIndex(t => t.id === team.id);
            if (index !== -1) teams[index] = { ...teams[index], ...team };
            this.addLog('Equipe', `Atualizou equipe: ${team.name}`);
        } else {
            team.id = 'team_' + Math.random().toString(36).substring(2, 9);
            teams.push(team);
            this.addLog('Equipe', `Criou equipe: ${team.name}`);
        }
        this._set(this.keys.teams, teams);
        this._pushToSupabase('teams', team);
        return team;
    },
    deleteTeam(id) {
        const teams = this.getTeams();
        const team = teams.find(t => t.id === id);
        if (team) this.addLog('Equipe', `Excluiu equipe: ${team.name}`);
        const filtered = teams.filter(t => t.id !== id);
        this._set(this.keys.teams, filtered);
        this._deleteFromSupabase('teams', id);
        return true;
    },

    // --- Appointments CRUD ---
    getAppointments() {
        return this._get(this.keys.appointments);
    },
    saveAppointment(appt) {
        const appts = this.getAppointments();
        let isNew = false;
        
        if (appt.protocolo) {
            const dup = appts.find(a => a.protocolo === appt.protocolo && a.id !== appt.id);
            if (dup) {
                throw new Error('Não é possível salvar: O protocolo ' + appt.protocolo + ' já está sendo utilizado no agendamento "' + dup.title + '".');
            }
        }

        // Get logged user info to save creator
        let loggedUser = 'Sistema';
        try {
            const sessionData = localStorage.getItem('agenda_pro_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.name) {
                    loggedUser = session.name;
                }
            }
        } catch (e) {}

        if (appt.id) {
            const index = appts.findIndex(a => a.id === appt.id);
            if (index !== -1) {
                const existing = appts[index];
                appt.createdBy = existing.createdBy || loggedUser;
                appts[index] = { ...existing, ...appt };
            }
        } else {
            // Check quota for new appointments
            const quota = this.checkQuota(appt.date);
            if (quota.exceeded) {
                throw new Error(`Cota de agendamentos ${quota.type} excedida (Limite: ${quota.limit}). Entre em contato com o administrador.`);
            }
            appt.id = 'appt_' + Math.random().toString(36).substring(2, 9);
            appt.createdAt = new Date().toISOString();
            appt.createdBy = loggedUser;
            appts.push(appt);
            isNew = true;
        }
        this._set(this.keys.appointments, appts);
        this._pushToSupabase('appointments', appt);
        
        if (isNew) {
            this.addLog('Agendamento', `Criou agendamento: ${appt.title} para ${appt.clientName}`);
        } else {
            this.addLog('Agendamento', `Atualizou agendamento: ${appt.title}`);
        }
        return appt;
    },
    deleteAppointment(id) {
        const appts = this.getAppointments();
        const appt = appts.find(a => a.id === id);
        if (appt) this.addLog('Agendamento', `Excluiu agendamento: ${appt.title}`);
        const filtered = appts.filter(a => a.id !== id);
        this._set(this.keys.appointments, filtered);
        this._deleteFromSupabase('appointments', id);
        return true;
    },

    // --- Users CRUD ---
    getUsers() {
        return this._get(this.keys.users);
    },
    saveUser(user) {
        const users = this.getUsers();
        if (user.id) {
            const index = users.findIndex(u => u.id === user.id);
            if (index !== -1) {
                // Preserve password if it wasn't modified/entered in edit
                const originalPassword = users[index].password;
                users[index] = { 
                    ...users[index], 
                    ...user, 
                    password: user.password ? user.password : originalPassword 
                };
            }
            this.addLog('Usuário', `Atualizou usuário: ${user.name}`);
        } else {
            user.id = 'usr_' + Math.random().toString(36).substring(2, 9);
            user.createdAt = new Date().toISOString();
            users.push(user);
            this.addLog('Usuário', `Criou usuário: ${user.name}`);
        }
        this._set(this.keys.users, users);
        this._pushToSupabase('users', user);
        return user;
    },
    deleteUser(id) {
        const users = this.getUsers();
        const user = users.find(u => u.id === id);
        if (user) this.addLog('Usuário', `Excluiu usuário: ${user.name}`);
        const filtered = users.filter(u => u.id !== id);
        this._set(this.keys.users, filtered);
        this._deleteFromSupabase('users', id);
        return true;
    },

    // --- Self-Registration (Primeiro Acesso) ---
    registerUser(name, username, password) {
        const users = this.getUsers();
        // Check if username already exists
        const exists = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
            return { success: false, message: 'Este nome de usuário já está em uso. Escolha outro.' };
        }
        const newUser = {
            id: 'usr_' + Math.random().toString(36).substring(2, 9),
            name: name,
            username: username,
            password: password,
            role: 'Pendente',
            status: 'pendente',
            permissions: [],
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        this._set(this.keys.users, users);
        this._pushToSupabase('users', newUser);
        this.addLog('Cadastro', `Novo cadastro pendente de aprovação: ${name} (${username})`);
        return { success: true, message: 'Cadastro enviado com sucesso! Aguarde a aprovação do administrador.' };
    },

    getPendingUsers() {
        return this.getUsers().filter(u => u.status === 'pendente');
    },

    approveUser(userId, role, permissions) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].status = 'aprovado';
            users[index].role = role;
            users[index].permissions = permissions;
            this._set(this.keys.users, users);
            this._pushToSupabase('users', users[index]);
            this.addLog('Usuário', `Aprovou cadastro do usuário: ${users[index].name} como ${role}`);
            return true;
        }
        return false;
    },

    rejectUser(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            this.addLog('Usuário', `Rejeitou cadastro do usuário: ${user.name} (${user.username})`);
        }
        const filtered = users.filter(u => u.id !== userId);
        this._set(this.keys.users, filtered);
        this._deleteFromSupabase('users', userId);
        return true;
    },

    // Seed Data if storage is empty
    seedData() {
        // Migration to add new permissions
        const existingUsers = this.getUsers();
        let updated = false;
        existingUsers.forEach(u => {
            if (u.role === 'Administrador') {
                if (u.permissions && !u.permissions.includes('ver_logs')) { u.permissions.push('ver_logs'); updated = true; }
                if (u.permissions && !u.permissions.includes('gerenciar_configuracoes')) { u.permissions.push('gerenciar_configuracoes'); updated = true; }
                if (u.permissions && !u.permissions.includes('editar_protocolo')) { u.permissions.push('editar_protocolo'); updated = true; }
            }
            if (u.role === 'Supervisor') {
                if (u.permissions && !u.permissions.includes('ver_logs')) { u.permissions.push('ver_logs'); updated = true; }
                if (u.permissions && !u.permissions.includes('editar_protocolo')) { u.permissions.push('editar_protocolo'); updated = true; }
            }
        });
        if (updated) {
            this._set(this.keys.users, existingUsers);
        }

        // Seed Users first (since it is required for login)
        if (existingUsers.length === 0) {
            const mockUsers = [
                {
                    id: 'usr_1',
                    username: 'admin',
                    password: 'admin123',
                    name: 'Carlos Administrador',
                    role: 'Administrador',
                    permissions: ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes', 'gerenciar_tecnicos_equipes', 'ver_relatorios', 'gerenciar_usuarios', 'ver_logs', 'gerenciar_configuracoes', 'editar_protocolo']
                },
                {
                    id: 'usr_2',
                    username: 'supervisor',
                    password: 'super123',
                    name: 'Ana Supervisora',
                    role: 'Supervisor',
                    permissions: ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes', 'gerenciar_tecnicos_equipes', 'ver_relatorios', 'ver_logs', 'editar_protocolo']
                },
                {
                    id: 'usr_3',
                    username: 'comercial',
                    password: 'com123',
                    name: 'Beatriz Comercial',
                    role: 'Comercial',
                    permissions: ['ver_dashboard', 'ver_agenda', 'editar_agenda', 'gerenciar_clientes']
                },
                {
                    id: 'usr_4',
                    username: 'tecnico',
                    password: 'tech123',
                    name: 'Danilo Técnico',
                    role: 'Técnico',
                    permissions: ['ver_agenda', 'gerenciar_clientes'] // No write access to agenda, no dashboard, no settings
                }
            ];
            this._set(this.keys.users, mockUsers);
        }

        // Only seed if empty
        if (this.getClients().length > 0) return;

        // Clients
        const mockClients = [
            { id: 'cli_1', name: 'AF de Tabelionato', phone: '(11) 98765-4321', email: 'tabelionato@email.com', address: 'Av. Paulista, 1000' },
            { id: 'cli_2', name: 'Rogerio Azedo Sociedade Advogados', phone: '(11) 91234-5678', email: 'contato@rogerioadv.com.br', address: 'Rua Bela Cintra, 450' },
            { id: 'cli_3', name: 'Facchetto Teresina', phone: '(86) 98888-7777', email: 'teresina@facchetto.com.br', address: 'Av. Frei Serafim, 2000' },
            { id: 'cli_4', name: 'Hoca Consultoria Tributária', phone: '(11) 3214-5555', email: 'contato@hoca.com.br', address: 'Av. Brig. Faria Lima, 1500' },
            { id: 'cli_5', name: 'Juliana Carolina Alves de Carvalho', phone: '(21) 97777-6666', email: 'juliana.alves@email.com', address: 'Av. Atlântica, 300' },
            { id: 'cli_6', name: 'M.R Administradora Ltda', phone: '(31) 3333-2222', email: 'financeiro@mradmin.com.br', address: 'Av. Afonso Pena, 800' },
            { id: 'cli_7', name: 'Vilaboni Construtora', phone: '(11) 99999-1111', email: 'obras@vilaboni.com.br', address: 'Rua Augusta, 1200' },
            { id: 'cli_8', name: 'Pronto Atendimento S.O.S Otorrino', phone: '(11) 3344-5566', email: 'emergencia@sosotorrino.com.br', address: 'Alameda Santos, 900' }
        ];
        this._set(this.keys.clients, mockClients);

        // Technicians
        const mockTechs = [
            { id: 'tech_1', name: 'Supervisor Lucian', specialty: 'Elétrica / Automação', shift: 'Diurno', contact: '(11) 95555-4444' },
            { id: 'tech_2', name: 'João Mauricio', specialty: 'Redes e CFTV', shift: 'Diurno', contact: '(11) 94444-3333' },
            { id: 'tech_3', name: 'Wagner Castelo Branco', specialty: 'Sistemas Industriais', shift: 'Diurno', contact: '(11) 93333-2222' },
            { id: 'tech_4', name: 'Yuri Sady de Sousa Almeida', specialty: 'Suporte Técnico L2', shift: 'Diurno', contact: '(11) 92222-1111' },
            { id: 'tech_5', name: 'Brenno Ivo Soares Santos', specialty: 'Instalação / Infra', shift: 'Integral', contact: '(11) 91111-0000' },
            { id: 'tech_6', name: 'Jussara Coelho de Carvalho', specialty: 'Supervisão Geral', shift: 'Integral', contact: '(11) 96666-5555' },
            { id: 'tech_7', name: 'Jansen Mariano', specialty: 'Configurações de Sistemas', shift: 'Diurno', contact: '(11) 97777-8888' },
            { id: 'tech_8', name: 'Jessica Kheyte Cardoso', specialty: 'Telecom / Fibras', shift: 'Diurno', contact: '(11) 98888-9999' }
        ];
        this._set(this.keys.technicians, mockTechs);

        // Teams
        const mockTeams = [
            { id: 'team_1', name: 'Equipe Alpha (Leste)', techs: ['tech_1', 'tech_2'] },
            { id: 'team_2', name: 'Equipe Beta (Centro)', techs: ['tech_3', 'tech_4', 'tech_5'] },
            { id: 'team_3', name: 'Equipe Especial (Oeste)', techs: ['tech_6', 'tech_7', 'tech_8'] }
        ];
        this._set(this.keys.teams, mockTeams);

        // Get relative dates for current week
        const today = new Date();
        const getRelativeDateStr = (dayOffset) => {
            const date = new Date(today);
            date.setDate(today.getDate() - today.getDay() + dayOffset); // start from Sunday
            return date.toISOString().split('T')[0];
        };

        // Appointments base structure
        const mockAppts = [
            // Monday
            {
                id: 'appt_1',
                clientName: 'AF de Tabelionato',
                title: '[AF] LUDI BRASILEI NASCIMENTO',
                description: 'Visita técnica de verificação de sistemas',
                date: getRelativeDateStr(1), // Monday
                startTime: '08:30',
                endTime: '12:00',
                status: 'concluido',
                techId: 'tech_1',
                teamId: 'team_1'
            },
            {
                id: 'appt_2',
                clientName: 'AF de Tabelionato',
                title: '[VIS] AGL MAGALHAES',
                description: 'Vistoria física da rede',
                date: getRelativeDateStr(1), // Monday
                startTime: '09:00',
                endTime: '11:00',
                status: 'concluido',
                techId: 'tech_2',
                teamId: 'team_1'
            },
            {
                id: 'appt_3',
                clientName: 'M.R Administradora Ltda',
                title: '[AF] VINICIUS MORETTI MONTORO',
                description: 'Acompanhamento de segurança corporativa',
                date: getRelativeDateStr(1), // Monday
                startTime: '10:30',
                endTime: '12:30',
                status: 'concluido',
                techId: 'tech_6',
                teamId: 'team_3'
            },
            // Tuesday
            {
                id: 'appt_4',
                clientName: 'Rogerio Azedo Sociedade Advogados',
                title: '[REDE] JX AZEDO SOCIEDADE ADVOGADOS',
                description: 'Manutenção de switches e roteadores',
                date: getRelativeDateStr(2), // Tuesday
                startTime: '08:30',
                endTime: '12:00',
                status: 'concluido',
                techId: 'tech_1',
                teamId: 'team_1'
            },
            {
                id: 'appt_5',
                clientName: 'Vilaboni Construtora',
                title: '[PLUS] GUSTAVO MACEDO COSTA',
                description: 'Configuração de firewall de bordo',
                date: getRelativeDateStr(2), // Tuesday
                startTime: '10:30',
                endTime: '12:00',
                status: 'concluido',
                techId: 'tech_5',
                teamId: 'team_2'
            },
            {
                id: 'appt_6',
                clientName: 'M.R Administradora Ltda',
                title: '[AF] M R ADMINISTRADORA LTDA',
                description: 'Visita periódica de infraestrutura',
                date: getRelativeDateStr(2), // Tuesday
                startTime: '14:00',
                endTime: '17:00',
                status: 'concluido',
                techId: 'tech_6',
                teamId: 'team_3'
            },
            // Wednesday
            {
                id: 'appt_7',
                clientName: 'Rogerio Azedo Sociedade Advogados',
                title: '[PRO] JOÃO SOCIEDADE ADVOGADOS',
                description: 'Instalação de software corporativo',
                date: getRelativeDateStr(3), // Wednesday
                startTime: '08:30',
                endTime: '12:00',
                status: 'concluido',
                techId: 'tech_2',
                teamId: 'team_1'
            },
            {
                id: 'appt_8',
                clientName: 'Hoca Consultoria Tributária',
                title: '[PLUS] MAYKON ALVES DE OLIVEIRA',
                description: 'Consultoria de cabeamento estruturado',
                date: getRelativeDateStr(3), // Wednesday
                startTime: '10:00',
                endTime: '12:00',
                status: 'concluido',
                techId: 'tech_3',
                teamId: 'team_2'
            },
            {
                id: 'appt_9',
                clientName: 'Hoca Consultoria Tributária',
                title: '[RET] HOCA CONSULTORIA TRIBUTARIA',
                description: 'Alinhamento de relatórios',
                date: getRelativeDateStr(3), // Wednesday
                startTime: '11:30',
                endTime: '13:00',
                status: 'concluido',
                techId: 'tech_4',
                teamId: 'team_2'
            },
            // Thursday
            {
                id: 'appt_10',
                clientName: 'Vilaboni Construtora',
                title: '[AF] EVANDRO EMANUEL FERNANDES',
                description: 'Reparo nos racks de distribuição',
                date: getRelativeDateStr(4), // Thursday
                startTime: '08:30',
                endTime: '11:00',
                status: 'concluido',
                techId: 'tech_5',
                teamId: 'team_2'
            },
            {
                id: 'appt_11',
                clientName: 'Vilaboni Construtora',
                title: '[PRO] VILABONI',
                description: 'Assinatura técnica de termo de obra',
                date: getRelativeDateStr(4), // Thursday
                startTime: '11:00',
                endTime: '12:00',
                status: 'agendado',
                techId: 'tech_3',
                teamId: 'team_2'
            },
            {
                id: 'appt_12',
                clientName: 'Juliana Carolina Alves de Carvalho',
                title: '[M.F] FRICA KAYI ANI DE SOUSA DA SILVA',
                description: 'Substituição de antenas externas',
                date: getRelativeDateStr(4), // Thursday
                startTime: '12:00',
                endTime: '14:30',
                status: 'agendado',
                techId: 'tech_6',
                teamId: 'team_3'
            },
            {
                id: 'appt_13',
                clientName: 'Juliana Carolina Alves de Carvalho',
                title: '[SUP] JESSICA KHEYTE CARDOSO',
                description: 'Reconfiguração do ramal telefônico corporativo',
                date: getRelativeDateStr(4), // Thursday
                startTime: '15:00',
                endTime: '17:00',
                status: 'pendencia-com',
                techId: 'tech_8',
                teamId: 'team_3'
            },
            {
                id: 'appt_14',
                clientName: 'Juliana Carolina Alves de Carvalho',
                title: 'LEONARDO SOARES PIRES',
                description: 'Ajuste de painel solar elétrico',
                date: getRelativeDateStr(4), // Thursday
                startTime: '17:00',
                endTime: '19:30',
                status: 'agendado',
                techId: 'tech_5',
                teamId: 'team_2'
            },
            // Friday
            {
                id: 'appt_15',
                clientName: 'Facchetto Teresina',
                title: 'Facchetto Teresina',
                description: 'Suporte local para filial',
                date: getRelativeDateStr(5), // Friday
                startTime: '08:30',
                endTime: '13:00',
                status: 'agendado',
                techId: 'tech_3',
                teamId: 'team_2'
            },
            {
                id: 'appt_16',
                clientName: 'Pronto Atendimento S.O.S Otorrino',
                title: '[PRO] PRONTO ATENDIMENTO (SOS OTORRINO)',
                description: 'Verificação de nobreaks e gerador de energia',
                date: getRelativeDateStr(5), // Friday
                startTime: '15:00',
                endTime: '17:00',
                status: 'agendado',
                techId: 'tech_7',
                teamId: 'team_3'
            },
            // Saturday
            {
                id: 'appt_17',
                clientName: 'Vilaboni Construtora',
                title: '[PLUS] BRENNO IVO SOARES SANTOS',
                description: 'Manutenção de data center na obra',
                date: getRelativeDateStr(6), // Saturday
                startTime: '08:30',
                endTime: '11:00',
                status: 'agendado',
                techId: 'tech_5',
                teamId: 'team_2'
            },
            // General active/executing events
            {
                id: 'appt_18',
                clientName: 'Pronto Atendimento S.O.S Otorrino',
                title: '[SUP] HUMBERTO MATOS DA SILVA',
                description: 'Restabelecer conexão de internet redundante',
                date: getRelativeDateStr(2), // Tuesday
                startTime: '14:30',
                endTime: '17:15',
                status: 'concluido',
                techId: 'tech_3',
                teamId: 'team_2'
            },
            {
                id: 'appt_19',
                clientName: 'M.R Administradora Ltda',
                title: '[SUP] JUSSARA COELHO DE CARVALHO',
                description: 'Vistoria de infraestrutura do prédio',
                date: getRelativeDateStr(0), // Sunday
                startTime: '15:30',
                endTime: '18:00',
                status: 'concluido',
                techId: 'tech_6',
                teamId: 'team_3'
            },
            {
                id: 'appt_20',
                clientName: 'Juliana Carolina Alves de Carvalho',
                title: '[SUP] NA UTI CELYJANE',
                description: 'Chamado crítico de cabeamento estruturado',
                date: getRelativeDateStr(4), // Thursday
                startTime: '15:00',
                endTime: '16:30',
                status: 'pendencia-com',
                techId: 'tech_8',
                teamId: 'team_3'
            },
            {
                id: 'appt_21',
                clientName: 'Juliana Carolina Alves de Carvalho',
                title: '[SUP] CASTRO',
                description: 'Supervisão técnica de campo',
                date: getRelativeDateStr(4), // Thursday
                startTime: '09:30',
                endTime: '11:00',
                status: 'execucao',
                techId: 'tech_1',
                teamId: 'team_1'
            }
        ];
        this._set(this.keys.appointments, mockAppts);
    }
};

window.Api = Api;

try {
    Api.seedData();
    Api.init();
} catch (e) {
    console.error("Error running Api.seedData/init:", e);
    setTimeout(() => alert("Erro ao carregar banco de dados local: " + e.message), 500);
}
