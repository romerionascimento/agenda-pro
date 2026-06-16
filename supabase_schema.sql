-- ============================================
-- AGENDA-PRO: Script Supabase (PostgreSQL)
-- IMPORTANTE: Execute no SQL Editor do Supabase
-- ============================================

-- 0. Limpar tabelas antigas (caso existam com UUID)
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabela Clientes (ID tipo TEXT para compatibilidade com o JS)
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Técnicos
CREATE TABLE technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    shift TEXT,
    contact TEXT
);

-- 3. Tabela Equipes
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    techs JSONB DEFAULT '[]'::jsonb
);

-- 4. Tabela Agendamentos
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    "clientName" TEXT,
    title TEXT NOT NULL,
    description TEXT,
    date DATE,
    "startTime" TEXT,
    "endTime" TEXT,
    status TEXT DEFAULT 'agendado',
    "techId" TEXT,
    "teamId" TEXT,
    protocolo TEXT UNIQUE,
    "createdBy" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela Usuários
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Pendente',
    status TEXT NOT NULL DEFAULT 'pendente',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela Logs
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    "timestamp" TEXT,
    "user" TEXT,
    username TEXT,
    action TEXT,
    description TEXT
);

-- 7. Tabela Configurações
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    "quotaEnabled" BOOLEAN DEFAULT false,
    "quotaType" TEXT DEFAULT 'semanal',
    "quotaLimit" INTEGER DEFAULT 20,
    "predefinedTitles" JSONB DEFAULT '[]'::jsonb
);

-- 8. Desabilitar RLS em todas as tabelas (permite acesso via API pública)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas que permitem acesso total via anon key
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on technicians" ON technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logs" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on config" ON config FOR ALL USING (true) WITH CHECK (true);

-- 10. Inserir configuração padrão
INSERT INTO config ("quotaEnabled", "quotaType", "quotaLimit", "predefinedTitles") 
VALUES (false, 'semanal', 20, '["[AF] LUDI BRASILEI NASCIMENTO", "[VIS] AGL MAGALHAES", "[REDE] JX AZEDO SOCIEDADE ADVOGADOS", "[PLUS] GUSTAVO MACEDO COSTA", "[RET] HOCA CONSULTORIA TRIBUTARIA"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 11. Inserir usuário administrador padrão
INSERT INTO users (id, name, username, password, role, status, permissions)
VALUES (
    'usr_1',
    'Administrador', 
    'admin', 
    'admin123', 
    'Administrador', 
    'aprovado', 
    '["ver_dashboard", "ver_agenda", "editar_agenda", "gerenciar_clientes", "gerenciar_tecnicos_equipes", "ver_relatorios", "gerenciar_usuarios", "ver_logs", "gerenciar_configuracoes", "editar_protocolo"]'::jsonb
) ON CONFLICT (username) DO NOTHING;
