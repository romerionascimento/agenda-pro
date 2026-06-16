import re

def update_api_js():
    with open('assets/js/api.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace Firebase config with Supabase config
    supabase_config = """const supabaseUrl = 'https://bllkimqqkdqnmaktncvj.supabase.co';
const supabaseKey = 'sb_publishable_E-sMLyQSoVTkf9lYLRDPGg_qMH_PhW5';
"""
    content = re.sub(r'const firebaseConfig = \{.*?\};\n', supabase_config, content, flags=re.DOTALL)

    # 2. Replace initFirebase, loadScript, setupListeners, _get, _set
    new_core = """
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
                if (!error && data) {
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

            const { data: configData, error: configError } = await this.supabase.from('config').select('*').eq('id', 1).single();
            if (!configError && configData) {
                localStorage.setItem(this.keys.config, JSON.stringify(configData));
            }

            window.dispatchEvent(new Event('api-data-updated'));
        } catch(e) {
            console.error("Sync error", e);
        }
    },

    _get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : (key === this.keys.config ? {} : []);
    },

    _set(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
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
"""
    # Replace from `db: null,` up to and including `_set` function
    pattern = r'db: null,.*?_set\(key, val\) \{.*?\},\n'
    content = re.sub(pattern, new_core, content, flags=re.DOTALL)

    # 3. Modify save/delete methods to call Supabase
    
    # saveConfig
    content = content.replace("this._set(this.keys.config, config);", "this._set(this.keys.config, config); this._pushToSupabase('config', { id: 1, ...config });")
    
    # addLog
    content = content.replace("this._set(this.keys.logs, logs);", "this._set(this.keys.logs, logs); this._pushToSupabase('logs', logEntry);")
    
    # clients
    content = content.replace("this._set(this.keys.clients, clients);", "this._set(this.keys.clients, clients); this._pushToSupabase('clients', client);")
    content = content.replace("this._set(this.keys.clients, filtered);", "this._set(this.keys.clients, filtered); this._deleteFromSupabase('clients', id);")
    
    # technicians
    content = content.replace("this._set(this.keys.technicians, techs);", "this._set(this.keys.technicians, techs); this._pushToSupabase('technicians', tech);")
    content = content.replace("this._set(this.keys.technicians, filtered);", "this._set(this.keys.technicians, filtered); this._deleteFromSupabase('technicians', id);")
    
    # teams
    content = content.replace("this._set(this.keys.teams, teams);", "this._set(this.keys.teams, teams); this._pushToSupabase('teams', team);")
    content = content.replace("this._set(this.keys.teams, filtered);", "this._set(this.keys.teams, filtered); this._deleteFromSupabase('teams', id);")
    
    # appointments
    content = content.replace("this._set(this.keys.appointments, appts);", "this._set(this.keys.appointments, appts); this._pushToSupabase('appointments', appt);")
    content = content.replace("this._set(this.keys.appointments, filtered);", "this._set(this.keys.appointments, filtered); this._deleteFromSupabase('appointments', id);")
    
    # users (saveUser)
    content = content.replace("this._set(this.keys.users, users);\n        return user;", "this._set(this.keys.users, users); this._pushToSupabase('users', user);\n        return user;")
    # users (deleteUser)
    content = content.replace("this._set(this.keys.users, filtered);\n        return true;", "this._set(this.keys.users, filtered); this._deleteFromSupabase('users', id);\n        return true;")
    # users (registerUser)
    content = content.replace("this._set(this.keys.users, users);\n        this.addLog", "this._set(this.keys.users, users); this._pushToSupabase('users', newUser);\n        this.addLog")
    # users (approveUser)
    content = content.replace("this._set(this.keys.users, users);\n            this.addLog", "this._set(this.keys.users, users); this._pushToSupabase('users', users[index]);\n            this.addLog")
    # users (rejectUser)
    content = content.replace("this._set(this.keys.users, filtered);\n        return true;", "this._set(this.keys.users, filtered); this._deleteFromSupabase('users', userId);\n        return true;")
    
    # 4. Modify seedData logic slightly so we don't spam Supabase on initial load if it already synced.
    # Actually, seedData runs locally. When it calls this._set, it shouldn't push unless we want to seed remote.
    # Since we intercept `_set` directly to only modify local storage, seedData will only modify local storage.
    # BUT we injected `this._pushToSupabase` in saveClient, saveTech, etc. seedData doesn't call saveClient, it directly pushes to arrays and calls `this._set`.
    # So `seedData` will ONLY populate local storage. That's fine! 
    # But wait, if remote is empty, we WANT to seed the remote.
    # So let's change seedData to push to Supabase if it seeds.
    seed_replace = """this._set(this.keys.users, mockUsers);
            mockUsers.forEach(u => this._pushToSupabase('users', u));"""
    content = content.replace("this._set(this.keys.users, mockUsers);", seed_replace)

    seed_clients_replace = """this._set(this.keys.clients, mockClients);
        mockClients.forEach(c => this._pushToSupabase('clients', c));"""
    content = content.replace("this._set(this.keys.clients, mockClients);", seed_clients_replace)

    seed_techs_replace = """this._set(this.keys.technicians, mockTechs);
        mockTechs.forEach(t => this._pushToSupabase('technicians', t));"""
    content = content.replace("this._set(this.keys.technicians, mockTechs);", seed_techs_replace)

    seed_teams_replace = """this._set(this.keys.teams, mockTeams);
        mockTeams.forEach(t => this._pushToSupabase('teams', t));"""
    content = content.replace("this._set(this.keys.teams, mockTeams);", seed_teams_replace)

    seed_appts_replace = """this._set(this.keys.appointments, mockAppts);
        mockAppts.forEach(a => this._pushToSupabase('appointments', a));"""
    content = content.replace("this._set(this.keys.appointments, mockAppts);", seed_appts_replace)

    # 5. Change init calls at the bottom
    content = content.replace("Api.initFirebase();", "Api.init();")

    with open('assets/js/api.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_api_js()
