// Clients Management Logic for Agenda-Pro
const ClientsPage = {
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
        this.modal = document.getElementById('client-modal');
        this.form = document.getElementById('client-form');
        this.listContainer = document.getElementById('clients-list');
        this.searchInput = document.getElementById('search-input');
        this.modalTitle = document.getElementById('modal-title');
    },

    bindEvents() {
        document.getElementById('btn-add-client').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-client').addEventListener('click', () => this.closeModal());

        this.form.addEventListener('submit', (e) => this.saveClient(e));
        this.searchInput.addEventListener('input', () => this.render());
    },

    openModal(client = null) {
        this.form.reset();
        
        if (client) {
            this.modalTitle.textContent = 'Editar Cliente';
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-phone').value = client.phone;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-address').value = client.address || '';
        } else {
            this.modalTitle.textContent = 'Novo Cliente';
            document.getElementById('client-id').value = '';
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    saveClient(e) {
        e.preventDefault();

        const id = document.getElementById('client-id').value;
        const client = {
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            email: document.getElementById('client-email').value,
            address: document.getElementById('client-address').value
        };

        if (id) {
            client.id = id;
        }

        Api.saveClient(client);
        this.closeModal();
        this.render();
    },

    deleteClient(id) {
        if (confirm('Tem certeza de que deseja excluir este cliente?')) {
            Api.deleteClient(id);
            this.render();
        }
    },

    render() {
        const query = this.searchInput.value.toLowerCase().trim();
        const clients = Api.getClients();
        
        const filtered = clients.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            (c.address && c.address.toLowerCase().includes(query))
        );

        this.listContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum cliente encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>${c.email}</td>
                <td>${c.address || '-'}</td>
                <td style="text-align: center;">
                    <div class="actions-cell" style="justify-content: center;">
                        <button class="btn-action btn-action-edit" title="Editar">✏️</button>
                        <button class="btn-action btn-action-delete" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;

            // Bind Actions
            tr.querySelector('.btn-action-edit').addEventListener('click', () => this.openModal(c));
            tr.querySelector('.btn-action-delete').addEventListener('click', () => this.deleteClient(c.id));

            this.listContainer.appendChild(tr);
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => ClientsPage.init());
window.addEventListener('api-data-updated', () => {
    if (ClientsPage && typeof ClientsPage.render === 'function') ClientsPage.render();
});
