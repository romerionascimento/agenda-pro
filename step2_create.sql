-- PASSO 2: Criar tabelas com ID tipo TEXT
CREATE TABLE clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE technicians (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT, shift TEXT, contact TEXT);
CREATE TABLE teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, techs JSONB DEFAULT '[]'::jsonb);
CREATE TABLE appointments (id TEXT PRIMARY KEY, "clientName" TEXT, title TEXT NOT NULL, description TEXT, date DATE, "startTime" TEXT, "endTime" TEXT, status TEXT DEFAULT 'agendado', "techId" TEXT, "teamId" TEXT, protocolo TEXT UNIQUE, "createdBy" TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Pendente', status TEXT NOT NULL DEFAULT 'pendente', permissions JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE logs (id TEXT PRIMARY KEY, "timestamp" TEXT, "user" TEXT, username TEXT, action TEXT, description TEXT);
CREATE TABLE config (id SERIAL PRIMARY KEY, "quotaEnabled" BOOLEAN DEFAULT false, "quotaType" TEXT DEFAULT 'semanal', "quotaLimit" INTEGER DEFAULT 20, "predefinedTitles" JSONB DEFAULT '[]'::jsonb);
