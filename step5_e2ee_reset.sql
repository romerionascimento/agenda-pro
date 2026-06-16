-- PASSO 5: Reset Completo para Criptografia de Ponta a Ponta (E2EE)

-- 1. Excluir a função de login (já que o banco não conseguirá mais ler as senhas ou nomes de usuário)
DROP FUNCTION IF EXISTS verify_login;

-- 2. Recriar todas as tabelas com um esquema "Cofre Cego"
-- O banco armazenará apenas o ID, a data de criação e um pacote criptografado (data)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE clients (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE technicians (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE teams (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE appointments (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE logs (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE TABLE config (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());

-- A criação do administrador inicial agora será feita de forma 100% segura pelo próprio JavaScript
-- na primeira vez que o site for acessado após o banco ser limpo.
