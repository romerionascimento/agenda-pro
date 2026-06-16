// Teams Management Logic for Agenda-Pro
const TeamsPage = {
    modal: null,
    form: null,
    listContainer: null,
    searchInput: null,
    modalTitle: null,
    techsContainer: null,

    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.modal = document.getElementById('team-modal');
        this.form = document.getElementById('team-form');
        this.listContainer = document.getElementById('teams-list');
        this.searchInput = document.getElementById('search-input');
        this.modalTitle = document.getElementById('modal-title');
        this.techsContainer = document.getElementById('techs-checkbox-list');
    },

    bindEvents() {
        document.getElementById('btn-add-team').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-team').addEventListener('click', () => this.closeModal());

        this.form.addEventListener('submit', (e) => this.saveTeam(e));
        this.searchInput.addEventListener('input', () => this.render());
    },

    populateTechCheckboxes(selectedTechIds = []) {
        const techs = Api.getTechnicians();
        this.techsContainer.innerHTML = '';
        
        if (techs.length === 0) {
            this.techsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">Nenhum técnico cadastrado.</span>';
            return;
        }

        techs.forEach(t => {
            const isChecked = selectedTechIds.includes(t.id) ? 'checked' : '';
            const label = document.createElement('label');
            label.className = 'tech-checkbox-item';
            label.innerHTML = `
                <input type="checkbox" value="${t.id}" ${isChecked}>
                <span>${t.name}</span>
            `;
            this.techsContainer.appendChild(label);
        });
    },

    openModal(team = null) {
        this.form.reset();
        
        if (team) {
            this.modalTitle.textContent = 'Editar Equipe';
            document.getElementById('team-id').value = team.id;
            document.getElementById('team-name').value = team.name;
            this.populateTechCheckboxes(team.techs || []);
        } else {
            this.modalTitle.textContent = 'Nova Equipe';
            document.getElementById('team-id').value = '';
            this.populateTechCheckboxes();
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    saveTeam(e) {
        e.preventDefault();

        const id = document.getElementById('team-id').value;
        const name = document.getElementById('team-name').value;
        
        // Collect checked technician IDs
        const techs = [];
        this.techsContainer.querySelectorAll('input:checked').forEach(cb => {
            techs.push(cb.value);
        });

        if (techs.length === 0) {
            alert('Por favor, selecione pelo menos um integrante para a equipe!');
            return;
        }

        const team = { name, techs };

        if (id) {
            team.id = id;
        }

        Api.saveTeam(team);
        this.closeModal();
        this.render();
    },

    deleteTeam(id) {
        if (confirm('Tem certeza de que deseja excluir esta equipe?')) {
            Api.deleteTeam(id);
            this.render();
        }
    },

    render() {
        const query = this.searchInput.value.toLowerCase().trim();
        const teams = Api.getTeams();
        const techs = Api.getTechnicians();
        
        // Create lookup Map for tech names
        const techMap = {};
        techs.forEach(t => { techMap[t.id] = t.name; });

        const filtered = teams.filter(t => 
            t.name.toLowerCase().includes(query)
        );

        this.listContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhuma equipe encontrada.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(t => {
            // Translate tech IDs to names and join them
            const names = (t.techs || []).map(tid => techMap[tid] || 'Técnico Excluído');
            const initialsHtml = names.map(name => {
                const init = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return `<span class="badge" style="background-color: var(--primary-color); color: white; margin-right: 5px; font-weight: 500;" title="${name}">${init} - ${name}</span>`;
            }).join('');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.name}</strong></td>
                <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${initialHtml}</div></td>
                <td>${(t.techs || []).length}</td>
                <td style="text-align: center;">
                    <div class="actions-cell" style="justify-content: center;">
                        <button class="btn-action btn-action-edit" title="Editar">✏️</button>
                        <button class="btn-action btn-action-delete" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;

            // Bind Actions
            tr.querySelector('.btn-action-edit').addEventListener('click', () => this.openModal(t));
            tr.querySelector('.btn-action-delete').addEventListener('click', () => this.deleteTeam(t.id));

            this.listContainer.appendChild(tr);
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => TeamsPage.init());
window.addEventListener('api-data-updated', () => {
    if (TeamsPage && typeof TeamsPage.render === 'function') TeamsPage.render();
});
