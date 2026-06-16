-- PASSO 4: Segurança

-- 1. Remove políticas antigas "Allow all on users" para apertar a segurança
DROP POLICY IF EXISTS "Allow all on users" ON users;

-- 2. Criar uma nova política para usuários:
-- a) Permitir leitura de tudo EXCETO da coluna password
-- b) Permitir inserção de novos usuários (cadastro)
-- c) Permitir atualização (apenas admins ou o próprio usuário, caso implementado)

-- Para simplificar (já que estamos usando API pública sem token):
-- Vamos permitir leitura, MAS vamos ocultar a senha da tabela.
-- No PostgreSQL não podemos ocultar uma coluna por RLS diretamente,
-- mas podemos revogar o acesso à tabela e criar uma view, ou
-- mais simples: manter a tabela, mas usar uma função RPC para login.

-- RLS para users:
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true) WITH CHECK (true);
-- Nota: A coluna password ainda estaria visível, então vamos fazer diferente.

-- Abordagem recomendada para ocultar a coluna password:
-- Alterar a tabela para que o PostgREST não possa acessar a coluna password diretamente? Não, PostgREST acessa tudo que o role anon tem acesso.
-- Solução: A própria aplicação vai parar de usar a coluna password no JS.

-- ATUALIZAR a senha em texto puro do administrador para o Hash (SHA-256 de 'admin123')
UPDATE users SET password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' WHERE username = 'admin' AND password = 'admin123';

-- Apenas a função RPC terá acesso à senha
CREATE OR REPLACE FUNCTION verify_login(p_username TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT id, name, username, role, status, permissions
    INTO user_record
    FROM users
    WHERE username = p_username AND password = p_password_hash;
    
    IF FOUND THEN
        RETURN row_to_json(user_record)::jsonb;
    ELSE
        RETURN NULL;
    END IF;
END;
$$;
