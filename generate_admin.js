function cipher(str, key) {
    let s = [], j = 0, x, res = '';
    for (let i = 0; i < 256; i++) { s[i] = i; }
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        x = s[i]; s[i] = s[j]; s[j] = x;
    }
    let i = 0; j = 0;
    for (let y = 0; y < str.length; y++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        x = s[i]; s[i] = s[j]; s[j] = x;
        res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
    }
    return res;
}

const adminUser = {
    id: "usr_1",
    name: "Administrador",
    username: "admin",
    password: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    role: "Administrador",
    status: "aprovado",
    permissions: ["ver_dashboard", "ver_agenda", "editar_agenda", "gerenciar_clientes", "gerenciar_tecnicos_equipes", "ver_relatorios", "gerenciar_usuarios", "ver_logs", "gerenciar_configuracoes", "editar_protocolo"],
    createdAt: new Date().toISOString()
};

const jsonStr = JSON.stringify(adminUser);
const encrypted = cipher(jsonStr, 'AgendaProSecretKey@2026!');
const encoded = Buffer.from(encrypted, 'binary').toString('base64');
console.log('E2E::' + encoded);
