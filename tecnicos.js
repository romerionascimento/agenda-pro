// Technicians Management Logic for Agenda-Pro
const TechsPage = {
    modal: null,
    form: null,
    listContainer: null,
    searchInput: null,
    modalTitle: null,

    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.modal = document.getElementById('tech-modal');
        this.form = document.getElementById('tech-form');
        this.listContainer = document.getElementById('techs-list');
        this.searchInput = document.getElementById('search-input');
        this.modalTitle = document.getElementById('modal-title');
    },

    bindEvents() {
        document.getElementById('btn-add-tech').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-tech').addEventListener('click', () => this.closeModal());

        this.form.addEventListener('submit', (e) => this.saveTech(e));
        this.searchInput.addEventListener('input', () => this.render());
    },

    openModal(tech = null) {
        this.form.reset();
        
        if (tech) {
            this.modalTitle.textContent = 'Editar Técnico';
            document.getElementById('tech-id').value = tech.id;
            document.getElementById('tech-name').value = tech.name;
            document.getElementById('tech-specialty').value = tech.specialty;
            document.getElementById('tech-shift').value = tech.shift;
            document.getElementById('tech-contact').value = tech.contact;
        } else {
            this.modalTitle.textContent = 'Novo Técnico';
            document.getElementById('tech-id').value = '';
            document.getElementById('tech-shift').value = 'Diurno';
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    saveTech(e) {
        e.preventDefault();

        const id = document.getElementById('tech-id').value;
        const tech = {
            name: document.getElementById('tech-name').value,
            specialty: document.getElementById('tech-specialty').value,
            shift: document.getElementById('tech-shift').value,
            contact: document.getElementById('tech-contact').value
        };

        if (id) {
            tech.id = id;
        }

        Api.saveTechnician(tech);
        this.closeModal();
        this.render();
    },

    deleteTech(id) {
        if (confirm('Tem certeza de que deseja excluir este técnico?')) {
            Api.deleteTechnician(id);
            this.render();
        }
    },

    render() {
        const query = this.searchInput.value.toLowerCase().trim();
        const techs = Api.getTechnicians();
        
        const filtered = techs.filter(t => 
            t.name.toLowerCase().includes(query) ||
            t.specialty.toLowerCase().includes(query) ||
            t.shift.toLowerCase().includes(query) ||
            t.contact.toLowerCase().includes(query)
        );

        this.listContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum técnico encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.name}</strong></td>
                <td>${t.specialty}</td>
                <td><span class="badge" style="background-color: rgba(255,255,255,0.05); color: var(--text-color);">${t.shift}</span></td>
                <td>${t.contact}</td>
                <td style="text-align: center;">
                    <div class="actions-cell" style="justify-content: center;">
                        <button class="btn-action btn-action-edit" title="Editar">✏️</button>
                        <button class="btn-action btn-action-delete" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;

            // Bind Actions
            tr.querySelector('.btn-action-edit').addEventListener('click', () => this.openModal(t));
            tr.querySelector('.btn-action-delete').addEventListener('click', () => this.deleteTech(t.id));

            this.listContainer.appendChild(tr);
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => TechsPage.init());
window.addEventListener('api-data-updated', () => {
    if (TechsPage && typeof TechsPage.render === 'function') TechsPage.render();
});
