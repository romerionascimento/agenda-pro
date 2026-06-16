-- PASSO 3: Politicas RLS e dados iniciais
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on technicians" ON technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logs" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on config" ON config FOR ALL USING (true) WITH CHECK (true);

INSERT INTO users (id, name, username, password, role, status, permissions)
VALUES ('usr_1', 'Administrador', 'admin', 'admin123', 'Administrador', 'aprovado', '["ver_dashboard", "ver_agenda", "editar_agenda", "gerenciar_clientes", "gerenciar_tecnicos_equipes", "ver_relatorios", "gerenciar_usuarios", "ver_logs", "gerenciar_configuracoes", "editar_protocolo"]'::jsonb);

INSERT INTO config ("quotaEnabled", "quotaType", "quotaLimit", "predefinedTitles") 
VALUES (false, 'semanal', 20, '["[AF] LUDI BRASILEI NASCIMENTO", "[VIS] AGL MAGALHAES", "[REDE] JX AZEDO SOCIEDADE ADVOGADOS", "[PLUS] GUSTAVO MACEDO COSTA", "[RET] HOCA CONSULTORIA TRIBUTARIA"]'::jsonb);
