-- PASSO 6: Correção de Segurança e Login

-- 1. Habilitar o acesso público do PostgREST nas novas tabelas E2E
-- O PostgREST precisa de permissão para realizar as requisições
GRANT ALL ON TABLE users TO anon;
GRANT ALL ON TABLE users TO authenticated;

GRANT ALL ON TABLE clients TO anon;
GRANT ALL ON TABLE clients TO authenticated;

GRANT ALL ON TABLE technicians TO anon;
GRANT ALL ON TABLE technicians TO authenticated;

GRANT ALL ON TABLE teams TO anon;
GRANT ALL ON TABLE teams TO authenticated;

GRANT ALL ON TABLE appointments TO anon;
GRANT ALL ON TABLE appointments TO authenticated;

GRANT ALL ON TABLE config TO anon;
GRANT ALL ON TABLE config TO authenticated;

GRANT ALL ON TABLE logs TO anon;
GRANT ALL ON TABLE logs TO authenticated;

-- 2. Recriar o Administrador Inicial para garantir o login
DELETE FROM users WHERE id = 'usr_admin_default';

INSERT INTO users (id, data) VALUES (
    'usr_admin_default',
    'E2E::4b/b0yV3tK2P0g8+Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U4H0R94Kz3p/B/Nl0A62X/VdZ5R9Gst1zBqQd+n3h2G9S2n9T10v1J2Q39d0N/U'
);
