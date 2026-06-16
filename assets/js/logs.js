// Logs Page Logic
const LogsPage = {
    listContainer: null,
    filterUser: null,
    filterAction: null,
    filterDate: null,

    init() {
        this.listContainer = document.getElementById('logs-list');
        this.filterUser = document.getElementById('filter-user');
        this.filterAction = document.getElementById('filter-action');
        this.filterDate = document.getElementById('filter-date');

        this.bindEvents();
        this.render();
    },

    bindEvents() {
        this.filterUser.addEventListener('input', () => this.render());
        this.filterAction.addEventListener('change', () => this.render());
        this.filterDate.addEventListener('change', () => this.render());
    },

    formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    },

    render() {
        const queryUser = this.filterUser.value.toLowerCase().trim();
        const queryAction = this.filterAction.value.toLowerCase();
        const queryDate = this.filterDate.value; // YYYY-MM-DD

        const logs = Api.getLogs();

        const filtered = logs.filter(log => {
            const matchUser = log.user.toLowerCase().includes(queryUser) || log.username.toLowerCase().includes(queryUser);
            const matchAction = queryAction ? log.action.toLowerCase() === queryAction : true;
            let matchDate = true;
            if (queryDate) {
                const logDate = log.timestamp.split('T')[0];
                matchDate = logDate === queryDate;
            }
            return matchUser && matchAction && matchDate;
        });

        this.listContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum registro encontrado com os filtros atuais.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-muted); font-size: 0.9rem;">
                    ${this.formatDate(log.timestamp)}
                </td>
                <td>
                    <strong>${log.user}</strong><br>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">@${log.username}</span>
                </td>
                <td>
                    <span class="badge-action">${log.action}</span>
                </td>
                <td>${log.description}</td>
            `;
            this.listContainer.appendChild(tr);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => LogsPage.init());
window.addEventListener('api-data-updated', () => {
    if (LogsPage && typeof LogsPage.render === 'function') LogsPage.render();
});
