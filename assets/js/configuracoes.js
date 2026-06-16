// Configuracoes Page Logic
const ConfigPage = {
    config: null,

    init() {
        this.config = Api.getConfig();
        this.cacheElements();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.quotaEnabled = document.getElementById('quota-enabled');
        this.quotaSettings = document.getElementById('quota-settings');
        this.quotaType = document.getElementById('quota-type');
        this.quotaLimit = document.getElementById('quota-limit');
        this.titlesList = document.getElementById('titles-list');
        this.newTitleInput = document.getElementById('new-title-input');
        this.btnAddTitle = document.getElementById('btn-add-title');
        this.btnSaveConfig = document.getElementById('btn-save-config');

        // CSV Import Elements
        this.csvFileInput = document.getElementById('csv-file-input');
        this.btnImportCsv = document.getElementById('btn-import-csv');
        this.importStatus = document.getElementById('import-status');
    },

    bindEvents() {
        this.quotaEnabled.addEventListener('change', () => {
            this.quotaSettings.style.display = this.quotaEnabled.value === 'true' ? 'flex' : 'none';
        });

        this.btnAddTitle.addEventListener('click', () => {
            const val = this.newTitleInput.value.trim();
            if (val) {
                if (this.config.predefinedTitles.includes(val)) {
                    alert('Este tipo de solicitação já existe na lista!');
                    return;
                }
                this.config.predefinedTitles.push(val);
                this.newTitleInput.value = '';
                this.renderTitles();
            }
        });

        this.btnSaveConfig.addEventListener('click', () => this.saveConfig());

        if (this.btnImportCsv) {
            this.btnImportCsv.addEventListener('click', () => this.handleCsvImport());
        }
    },

    handleCsvImport() {
        const file = this.csvFileInput.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo .csv primeiro.');
            return;
        }

        this.importStatus.style.display = 'block';
        this.importStatus.style.color = 'var(--text-color)';
        this.importStatus.textContent = '⏳ Lendo arquivo CSV...';

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.processCsvData(results.data);
            },
            error: (error) => {
                this.importStatus.style.color = '#ef4444';
                this.importStatus.textContent = '❌ Erro ao ler CSV: ' + error.message;
            }
        });
    },

    processCsvData(data) {
        if (!data || data.length === 0) {
            this.importStatus.textContent = '❌ Arquivo CSV vazio ou inválido.';
            return;
        }

        this.importStatus.textContent = '⚙️ Processando dados e atualizando banco (isso pode levar alguns segundos)...';

        // Pre-fetch existing data
        const existingClients = Api.getClients();
        const existingTechs = Api.getTechnicians();
        const existingAppts = Api.getAppointments();

        let importedAppts = 0;
        let newClients = 0;
        let newTechs = 0;

        const generateId = () => Math.random().toString(36).substr(2, 9);

        data.forEach(row => {
            // Trim keys
            const getVal = (keyNames) => {
                for (let k of Object.keys(row)) {
                    for (let n of keyNames) {
                        if (k.trim().toLowerCase() === n.toLowerCase()) return row[k].trim();
                    }
                }
                return '';
            };

            const protocolo = getVal(['Protocolo', '# Protocolo', 'protocol', 'protocolo']);
            const clienteStr = getVal(['Cliente', '= Cliente', 'cliente', 'client']);
            const titulo = getVal(['Solicitação', 'Solicitacao', 'title', 'título', 'titulo']);
            const statusStr = getVal(['Status', 'status']);
            const techStr = getVal(['Técnico', 'Tecnico', 'tecnico', 'technician']);
            const dataStr = getVal(['Data', 'date', 'data']);
            const relato = getVal(['Relato', 'Descrição', 'Descricao', 'description']);

            if (!protocolo && !clienteStr) return; // Skip invalid rows

            // Handle Client
            let finalClient = clienteStr || 'Cliente Importado';
            if (!existingClients.find(c => c.name.toLowerCase() === finalClient.toLowerCase())) {
                existingClients.push({
                    id: generateId(),
                    name: finalClient,
                    phone: '',
                    address: '',
                    notes: 'Importado via CSV'
                });
                newClients++;
            }

            // Handle Tech
            let finalTech = techStr || 'Técnico Não Atribuído';
            if (finalTech && !existingTechs.find(t => t.name.toLowerCase() === finalTech.toLowerCase())) {
                existingTechs.push({
                    id: generateId(),
                    name: finalTech,
                    phone: '',
                    skills: ['Geral'],
                    color: '#8b5cf6', // Default purple
                    active: true
                });
                newTechs++;
            }

            // Handle Date
            let finalDate = new Date().toISOString().split('T')[0];
            let finalTime = '08:00';
            if (dataStr) {
                try {
                    // Try to parse '4/7/25, 8:37 AM' or similar
                    const d = new Date(dataStr);
                    if (!isNaN(d.getTime())) {
                        finalDate = d.toISOString().split('T')[0];
                        finalTime = d.toTimeString().substring(0,5);
                    }
                } catch(e) {}
            }

            // Handle Status
            let finalStatus = 'pendente';
            const s = statusStr.toLowerCase();
            if (s.includes('conclu') || s.includes('finaliz')) finalStatus = 'concluido';
            else if (s.includes('execu') || s.includes('andamento')) finalStatus = 'execucao';
            else if (s.includes('cancel')) finalStatus = 'cancelado';

            // Check if protocol exists
            const apptExists = existingAppts.find(a => a.protocolo === protocolo);
            if (!apptExists) {
                existingAppts.push({
                    id: generateId(),
                    clientName: finalClient,
                    protocolo: protocolo,
                    title: titulo || 'Agendamento Importado',
                    date: finalDate,
                    time: finalTime,
                    duration: 60,
                    techName: finalTech,
                    status: finalStatus,
                    description: relato || ''
                });
                importedAppts++;
            }
        });

        // Save back to Api
        // We use Api._set to trigger Firebase sync directly
        if (newClients > 0) Api._set('clients', existingClients);
        if (newTechs > 0) Api._set('technicians', existingTechs);
        if (importedAppts > 0) Api._set('appointments', existingAppts);

        this.importStatus.style.color = '#10b981'; // green
        this.importStatus.textContent = `✅ Sucesso! Importados: ${importedAppts} agendamentos, ${newClients} novos clientes, ${newTechs} novos técnicos.`;
        
        // Reset file input
        this.csvFileInput.value = '';
    },

    removeTitle(index) {
        if (confirm('Remover este tipo de solicitação pré-definido?')) {
            this.config.predefinedTitles.splice(index, 1);
            this.renderTitles();
        }
    },

    renderTitles() {
        this.titlesList.innerHTML = '';
        if (this.config.predefinedTitles.length === 0) {
            this.titlesList.innerHTML = '<li style="color: var(--text-muted);">Nenhum título cadastrado.</li>';
            return;
        }

        this.config.predefinedTitles.forEach((title, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${title}</span>
                <button class="btn-remove-title" title="Remover">✕</button>
            `;
            li.querySelector('.btn-remove-title').addEventListener('click', () => this.removeTitle(index));
            this.titlesList.appendChild(li);
        });
    },

    render() {
        this.quotaEnabled.value = this.config.quotaEnabled ? 'true' : 'false';
        this.quotaSettings.style.display = this.config.quotaEnabled ? 'flex' : 'none';
        this.quotaType.value = this.config.quotaType;
        this.quotaLimit.value = this.config.quotaLimit;

        this.renderTitles();
    },

    saveConfig() {
        this.config.quotaEnabled = this.quotaEnabled.value === 'true';
        this.config.quotaType = this.quotaType.value;
        this.config.quotaLimit = parseInt(this.quotaLimit.value, 10) || 20;

        Api.saveConfig(this.config);
        alert('Configurações salvas com sucesso!');
    }
};

document.addEventListener('DOMContentLoaded', () => ConfigPage.init());
window.addEventListener('api-data-updated', () => {
    if (ConfigPage && typeof ConfigPage.render === 'function') ConfigPage.render();
});
