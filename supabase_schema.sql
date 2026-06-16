-- Habilitar a extensão UUID (geração de IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Técnicos
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT,
    shift TEXT,
    contact TEXT
);

-- 3. Tabela Equipes
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    techs JSONB DEFAULT '[]'::jsonb
);

-- 4. Tabela Agendamentos
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "clientName" TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    "techId" UUID REFERENCES technicians(id) ON DELETE SET NULL,
    "teamId" UUID REFERENCES teams(id) ON DELETE SET NULL,
    protocolo TEXT UNIQUE,
    "createdBy" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user" TEXT NOT NULL,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela Configurações (Apenas 1 registro deve existir)
CREATE TABLE config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    "quotaEnabled" BOOLEAN DEFAULT false,
    "quotaType" TEXT DEFAULT 'semanal',
    "quotaLimit" INTEGER DEFAULT 20,
    "predefinedTitles" JSONB DEFAULT '[]'::jsonb
);

-- Inserir configuração padrão
INSERT INTO config ("quotaEnabled", "quotaType", "quotaLimit", "predefinedTitles") 
VALUES (false, 'semanal', 20, '["[AF] LUDI BRASILEI NASCIMENTO", "[VIS] AGL MAGALHAES", "[REDE] JX AZEDO SOCIEDADE ADVOGADOS", "[PLUS] GUSTAVO MACEDO COSTA", "[RET] HOCA CONSULTORIA TRIBUTARIA"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Inserir usuário administrador padrão
INSERT INTO users (name, username, password, role, status, permissions)
VALUES (
    'Administrador', 
    'admin', 
    'admin123', 
    'Administrador', 
    'aprovado', 
    '["ver_dashboard", "ver_agenda", "editar_agenda", "gerenciar_clientes", "gerenciar_tecnicos_equipes", "ver_relatorios", "gerenciar_usuarios", "ver_logs", "gerenciar_configuracoes", "editar_protocolo"]'::jsonb
) ON CONFLICT (username) DO NOTHING;
