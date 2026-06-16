import os, re

base_dir = r'C:\Users\VTX03085\.gemini\antigravity\scratch\agenda-pro'
files_to_update = ['agenda.html', 'clientes.html', 'dashboard.html', 'equipes.html', 'relatorios.html', 'tecnicos.html', 'usuarios.html']

target = '''                <li class="sidebar-menu-item">
                    <a href="usuarios.html" id="nav-usuarios">
                        <span>🔒</span> Usuários
                    </a>
                </li>'''

to_insert = '''
                <li class="sidebar-menu-item">
                    <a href="logs.html" id="nav-logs">
                        <span>📝</span> Logs
                    </a>
                </li>
                <li class="sidebar-menu-item">
                    <a href="configuracoes.html" id="nav-configuracoes">
                        <span>⚙️</span> Configurações
                    </a>
                </li>'''

for file in files_to_update:
    path = os.path.join(base_dir, file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if target in content and 'nav-logs' not in content:
        content = content.replace(target, target + to_insert)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

with open(os.path.join(base_dir, 'clientes.html'), 'r', encoding='utf-8') as f:
    clientes_content = f.read()
    sidebar_match = re.search(r'(<aside class="sidebar">.*?</aside>)', clientes_content, re.DOTALL)
    if sidebar_match:
        correct_sidebar = sidebar_match.group(1)
        
        logs_path = os.path.join(base_dir, 'logs.html')
        with open(logs_path, 'r', encoding='utf-8') as f:
            logs_content = f.read()
        logs_content = re.sub(r'<aside class="sidebar">.*?</aside>', correct_sidebar.replace('id="nav-clientes"', 'id="nav-clientes"').replace('class="sidebar-menu-item active"', 'class="sidebar-menu-item"').replace('<a href="logs.html" id="nav-logs">', '<a href="logs.html" id="nav-logs" style="color:var(--primary-color)">'), logs_content, flags=re.DOTALL)
        with open(logs_path, 'w', encoding='utf-8') as f:
            f.write(logs_content)

        config_path = os.path.join(base_dir, 'configuracoes.html')
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        config_content = re.sub(r'<aside class="sidebar">.*?</aside>', correct_sidebar.replace('class="sidebar-menu-item active"', 'class="sidebar-menu-item"').replace('<a href="configuracoes.html" id="nav-configuracoes">', '<a href="configuracoes.html" id="nav-configuracoes" style="color:var(--primary-color)">'), config_content, flags=re.DOTALL)
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
print("Done!")
