// Agenda/Calendar logic for Agenda-Pro
const Agenda = {
    currentDate: new Date(),
    currentView: 'week', // 'day', 'week', 'month'
    selectedFilters: {
        techs: [],
        status: [],
        creators: [],
        types: []
    },

    // UI elements
    elements: {
        gridWrapper: null,
        rangeLabel: null,
        modal: null,
        modalTitle: null,
        form: null,
        btnDelete: null,
        clientSelect: null,
        techSelect: null,
        teamSelect: null
    },

    init() {
        this.cacheElements();
        this.bindEvents();
        this.populateDropdowns();
        this.initFilters();
        
        // Enforce permissions
        const user = Auth.getCurrentUser();
        this.canEdit = user && user.permissions && user.permissions.includes('editar_agenda');
        if (!this.canEdit) {
            const btnAdd = document.getElementById('btn-add-appt');
            if (btnAdd) btnAdd.style.display = 'none';
        }

        this.render();
    },

    cacheElements() {
        this.elements.gridWrapper = document.getElementById('grid-wrapper');
        this.elements.rangeLabel = document.getElementById('current-range-label');
        this.elements.modal = document.getElementById('appt-modal');
        this.elements.modalTitle = document.getElementById('modal-title');
        this.elements.form = document.getElementById('appt-form');
        this.elements.btnDelete = document.getElementById('btn-delete-appt');
        this.elements.clientSelect = document.getElementById('appt-client');
        this.elements.techSelect = document.getElementById('appt-tech');
        this.elements.teamSelect = document.getElementById('appt-team');

        this.elements.btnQuickClient = document.getElementById('btn-quick-client');
        this.elements.quickClientModal = document.getElementById('quick-client-modal');
        this.elements.btnQuickTitle = document.getElementById('btn-quick-title');
        this.elements.quickTitleModal = document.getElementById('quick-title-modal');
        this.elements.titleInput = document.getElementById('appt-title');
        this.elements.titleSelect = document.getElementById('appt-title-select');
    },

    bindEvents() {
        // Nav toggles
        document.getElementById('view-day').addEventListener('click', () => this.switchView('day'));
        document.getElementById('view-week').addEventListener('click', () => this.switchView('week'));
        document.getElementById('view-month').addEventListener('click', () => this.switchView('month'));

        // Navigation
        document.getElementById('prev-date').addEventListener('click', () => this.navigateDate(-1));
        document.getElementById('next-date').addEventListener('click', () => this.navigateDate(1));
        document.getElementById('btn-today').addEventListener('click', () => this.goToday());

        // Modal triggers
        document.getElementById('btn-add-appt').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-appt').addEventListener('click', () => this.closeModal());
        this.elements.btnDelete.addEventListener('click', () => this.deleteAppointment());

        // Submit form
        this.elements.form.addEventListener('submit', (e) => this.saveAppointment(e));

        // Filter dropdown
        const btnFilter = document.getElementById('btn-filter');
        const filterContent = document.getElementById('filter-content');
        btnFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            filterContent.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            filterContent.classList.remove('active');
        });
        filterContent.addEventListener('click', (e) => e.stopPropagation());

        // Quick add modals
        if (this.elements.btnQuickClient) {
            this.elements.btnQuickClient.addEventListener('click', () => {
                this.elements.quickClientModal.classList.add('active');
            });
        }
        const quickClientClose = document.getElementById('quick-client-close');
        if (quickClientClose) quickClientClose.addEventListener('click', () => this.elements.quickClientModal.classList.remove('active'));
        
        const quickClientCancel = document.getElementById('btn-quick-client-cancel');
        if (quickClientCancel) quickClientCancel.addEventListener('click', () => this.elements.quickClientModal.classList.remove('active'));
        
        const quickClientSave = document.getElementById('btn-quick-client-save');
        if (quickClientSave) quickClientSave.addEventListener('click', () => this.saveQuickClient());

        if (this.elements.btnQuickTitle) {
            this.elements.btnQuickTitle.addEventListener('click', () => {
                this.elements.quickTitleModal.classList.add('active');
            });
        }
        const quickTitleClose = document.getElementById('quick-title-close');
        if (quickTitleClose) quickTitleClose.addEventListener('click', () => this.elements.quickTitleModal.classList.remove('active'));
        
        const quickTitleCancel = document.getElementById('btn-quick-title-cancel');
        if (quickTitleCancel) quickTitleCancel.addEventListener('click', () => this.elements.quickTitleModal.classList.remove('active'));
        
        const quickTitleSave = document.getElementById('btn-quick-title-save');
        if (quickTitleSave) quickTitleSave.addEventListener('click', () => this.saveQuickTitle());

        // Title select logic (sync select value to hidden input)
        this.elements.titleSelect.addEventListener('change', () => {
            this.elements.titleInput.value = this.elements.titleSelect.value;
        });
    },

    saveQuickClient() {
        const name = document.getElementById('quick-client-name').value.trim();
        const phone = document.getElementById('quick-client-phone').value.trim();
        const email = document.getElementById('quick-client-email').value.trim();
        
        if (!name) {
            alert('O nome do cliente é obrigatório.');
            return;
        }

        const client = Api.saveClient({ name, phone, email });
        
        // Refresh dropdown
        this.populateDropdowns();
        
        // Select new client
        this.elements.clientSelect.value = client.name;
        
        // Close modal and clean
        this.elements.quickClientModal.classList.remove('active');
        document.getElementById('quick-client-name').value = '';
        document.getElementById('quick-client-phone').value = '';
        document.getElementById('quick-client-email').value = '';
    },

    saveQuickTitle() {
        const title = document.getElementById('quick-title-name').value.trim();
        if (!title) {
            alert('O título é obrigatório.');
            return;
        }

        const config = Api.getConfig();
        if (config.predefinedTitles.includes(title)) {
            alert('Este título já existe.');
            return;
        }

        config.predefinedTitles.push(title);
        Api.saveConfig(config);

        this.populateDropdowns();
        
        this.elements.titleSelect.value = title;
        this.elements.titleInput.value = title;
        this.elements.titleInput.style.display = 'none';

        this.elements.quickTitleModal.classList.remove('active');
        document.getElementById('quick-title-name').value = '';
    },

    populateDropdowns() {
        // Clients
        const clients = Api.getClients();
        this.elements.clientSelect.innerHTML = '<option value="">Selecione o Cliente</option>';
        clients.forEach(c => {
            this.elements.clientSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });

        // Technicians
        const techs = Api.getTechnicians();
        this.elements.techSelect.innerHTML = '<option value="">Selecione o Técnico</option>';
        techs.forEach(t => {
            this.elements.techSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        // Teams
        const teams = Api.getTeams();
        this.elements.teamSelect.innerHTML = '<option value="">Selecione a Equipe</option>';
        teams.forEach(t => {
            this.elements.teamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        // Predefined Titles (Solicitations)
        const config = Api.getConfig();
        const titles = config.predefinedTitles || [];
        this.elements.titleSelect.innerHTML = '<option value="">Selecione a Solicitação</option>';
        titles.forEach(t => {
            this.elements.titleSelect.innerHTML += `<option value="${t}">${t}</option>`;
        });
        
        this.elements.titleSelect.style.display = 'block';
        this.elements.titleInput.style.display = 'none';
        this.elements.titleInput.required = false;
    },

    initFilters() {
        const appts = Api.getAppointments();

        // 1. Creator filters
        const creators = Array.from(new Set(appts.map(a => a.createdBy || 'Sistema')));
        const creatorFiltersEl = document.getElementById('creator-filters');
        creatorFiltersEl.innerHTML = '';
        if (creators.length === 0) {
            creatorFiltersEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">Nenhum criador</span>';
        } else {
            creators.forEach(c => {
                const label = document.createElement('label');
                label.className = 'filter-option';
                label.innerHTML = `
                    <input type="checkbox" value="${c}" data-type="creator" checked>
                    <span>${c}</span>
                `;
                creatorFiltersEl.appendChild(label);
            });
        }

        // 2. Type/Solicitation filters
        const config = Api.getConfig();
        const predefinedTypes = config.predefinedTitles || [];
        const apptTypes = Array.from(new Set(appts.map(a => a.title)));
        const allTypes = Array.from(new Set([...predefinedTypes, ...apptTypes])).filter(Boolean);
        const typeFiltersEl = document.getElementById('type-filters');
        typeFiltersEl.innerHTML = '';
        if (allTypes.length === 0) {
            typeFiltersEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">Nenhum tipo</span>';
        } else {
            allTypes.forEach(t => {
                const label = document.createElement('label');
                label.className = 'filter-option';
                label.innerHTML = `
                    <input type="checkbox" value="${t}" data-type="type" checked>
                    <span>${t}</span>
                `;
                typeFiltersEl.appendChild(label);
            });
        }

        // 3. Tech filters
        const techs = Api.getTechnicians();
        const techFiltersEl = document.getElementById('tech-filters');
        techFiltersEl.innerHTML = '';
        techs.forEach(t => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" value="${t.id}" data-type="tech" checked>
                <span>${t.name}</span>
            `;
            techFiltersEl.appendChild(label);
        });

        // 4. Status filters
        const statuses = [
            { key: 'concluido', label: 'Concluído' },
            { key: 'execucao', label: 'Em execução' },
            { key: 'agendado', label: 'Agendado' },
            { key: 'pendencia-cli', label: 'Pendência Cliente' },
            { key: 'remarcado-cli', label: 'Remarcado Cliente' },
            { key: 'pendencia-com', label: 'Pendência Comercial' }
        ];

        const statusFiltersEl = document.getElementById('status-filters');
        statusFiltersEl.innerHTML = '';
        statuses.forEach(s => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" value="${s.key}" data-type="status" checked>
                <span>${s.label}</span>
            `;
            statusFiltersEl.appendChild(label);
        });

        // Add change listeners
        document.querySelectorAll('#filter-content input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilters();
                this.render();
            });
        });

        this.updateFilters();
    },

    updateFilters() {
        this.selectedFilters.techs = [];
        this.selectedFilters.status = [];
        this.selectedFilters.creators = [];
        this.selectedFilters.types = [];
        
        document.querySelectorAll('#filter-content input:checked').forEach(input => {
            const type = input.getAttribute('data-type');
            if (type === 'tech') {
                this.selectedFilters.techs.push(input.value);
            } else if (type === 'status') {
                this.selectedFilters.status.push(input.value);
            } else if (type === 'creator') {
                this.selectedFilters.creators.push(input.value);
            } else if (type === 'type') {
                this.selectedFilters.types.push(input.value);
            }
        });
    },

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-toggles .btn-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`view-${view}`).classList.add('active');
        this.render();
    },

    navigateDate(direction) {
        if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        }
        this.render();
    },

    goToday() {
        this.currentDate = new Date();
        this.render();
    },

    // Convert "HH:MM" to minutes from 8:00 AM (480 minutes)
    timeToMinutes(timeStr) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        return (hours * 60 + minutes) - 480; // minutes offset from 8 AM
    },

    render() {
        this.elements.gridWrapper.innerHTML = '';
        
        if (this.currentView === 'day') {
            this.renderDayView();
        } else if (this.currentView === 'week') {
            this.renderWeekView();
        } else if (this.currentView === 'month') {
            this.renderMonthView();
        }
    },

    getFilteredAppointments() {
        const appts = Api.getAppointments();
        
        const hasCreatorFilters = document.querySelectorAll('#creator-filters input').length > 0;
        const hasTypeFilters = document.querySelectorAll('#type-filters input').length > 0;
        const hasTechFilters = document.querySelectorAll('#tech-filters input').length > 0;
        const hasStatusFilters = document.querySelectorAll('#status-filters input').length > 0;

        return appts.filter(a => {
            // Check creator filter
            const creatorName = a.createdBy || 'Sistema';
            const passCreator = !hasCreatorFilters || this.selectedFilters.creators.includes(creatorName);
            
            // Check type filter
            const passType = !hasTypeFilters || this.selectedFilters.types.includes(a.title);

            // Check technician filter
            const passTech = !hasTechFilters || this.selectedFilters.techs.includes(a.techId);

            // Check status filter
            const passStatus = !hasStatusFilters || this.selectedFilters.status.includes(a.status);

            return passCreator && passType && passTech && passStatus;
        });
    },

    renderWeekView() {
        const appts = this.getFilteredAppointments();

        // Get start and end of week (Sunday to Saturday)
        const curr = new Date(this.currentDate);
        const first = curr.getDate() - curr.getDay(); // Sunday
        
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(curr);
            d.setDate(first + i);
            weekDates.push(d);
        }

        // Set Label: "junho 07 - 13"
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const firstMonth = months[weekDates[0].getMonth()];
        const lastMonth = months[weekDates[6].getMonth()];
        const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth}/${lastMonth}`;
        
        const pad = (n) => String(n).padStart(2, '0');
        this.elements.rangeLabel.textContent = `${monthLabel} ${pad(weekDates[0].getDate())} - ${pad(weekDates[6].getDate())}`;

        // Create Grid elements
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // 1. Header Row
        // Empty space for time axis
        const axisHeader = document.createElement('div');
        axisHeader.className = 'grid-header-cell';
        grid.appendChild(axisHeader);

        const weekdays = ['do', '2ª', '3ª', '4ª', '5ª', '6ª', 'sá'];
        const todayStr = new Date().toISOString().split('T')[0];

        weekDates.forEach((date, i) => {
            const headerCell = document.createElement('div');
            const dateStr = date.toISOString().split('T')[0];
            headerCell.className = `grid-header-cell ${dateStr === todayStr ? 'today' : ''}`;
            
            headerCell.innerHTML = `
                <span class="day-number">${date.getDate()}</span>
                <span class="day-name">${weekdays[i]}</span>
            `;
            grid.appendChild(headerCell);
        });

        // 2. Time column & Day columns
        // Time Axis
        const timeCol = document.createElement('div');
        timeCol.className = 'time-col';
        for (let hour = 8; hour <= 23; hour++) {
            const label = document.createElement('div');
            label.className = 'time-slot-label';
            label.textContent = `${hour} ${hour >= 12 ? 'PM' : 'AM'}`;
            timeCol.appendChild(label);
        }
        grid.appendChild(timeCol);

        // Day Columns (7 columns)
        weekDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dayCol = document.createElement('div');
            dayCol.className = `day-col ${dateStr === todayStr ? 'today' : ''}`;
            dayCol.setAttribute('data-date', dateStr);
            
            // Render 16 background hour slot divs for aesthetic grid lines
            for (let hour = 8; hour <= 23; hour++) {
                const slot = document.createElement('div');
                slot.className = 'day-col-slot';
                // Double click / Click to add
                slot.addEventListener('click', (e) => {
                    if (e.target === slot) {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`;
                        const timeEndStr = `${String(hour + 1).padStart(2, '0')}:00`;
                        this.openModal(null, { date: dateStr, startTime: timeStr, endTime: timeEndStr });
                    }
                });
                dayCol.appendChild(slot);
            }

            // Filter appointments for this date
            const dayAppts = appts.filter(a => a.date === dateStr);
            
            // Apply Overlap Algorithm
            this.arrangeEvents(dayAppts);

            // Render event cards
            dayAppts.forEach(appt => {
                const card = this.createEventCard(appt);
                dayCol.appendChild(card);
            });

            grid.appendChild(dayCol);
        });

        this.elements.gridWrapper.appendChild(grid);
    },

    renderDayView() {
        const appts = this.getFilteredAppointments();
        const dateStr = this.currentDate.toISOString().split('T')[0];

        // Label: "junho 11, 2026"
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        this.elements.rangeLabel.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;

        const grid = document.createElement('div');
        grid.className = 'calendar-grid day-view';

        // Headers
        const axisHeader = document.createElement('div');
        axisHeader.className = 'grid-header-cell';
        grid.appendChild(axisHeader);

        const headerCell = document.createElement('div');
        headerCell.className = 'grid-header-cell today';
        const weekdaysLong = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        headerCell.innerHTML = `
            <span class="day-number">${this.currentDate.getDate()}</span>
            <span class="day-name">${weekdaysLong[this.currentDate.getDay()]}</span>
        `;
        grid.appendChild(headerCell);

        // Time Axis
        const timeCol = document.createElement('div');
        timeCol.className = 'time-col';
        for (let hour = 8; hour <= 23; hour++) {
            const label = document.createElement('div');
            label.className = 'time-slot-label';
            label.textContent = `${hour} ${hour >= 12 ? 'PM' : 'AM'}`;
            timeCol.appendChild(label);
        }
        grid.appendChild(timeCol);

        // Single Day Column
        const dayCol = document.createElement('div');
        dayCol.className = 'day-col today';
        dayCol.setAttribute('data-date', dateStr);

        for (let hour = 8; hour <= 23; hour++) {
            const slot = document.createElement('div');
            slot.className = 'day-col-slot';
            slot.addEventListener('click', (e) => {
                if (e.target === slot) {
                    this.openModal(null, { date: dateStr, startTime: `${String(hour).padStart(2, '0')}:00`, endTime: `${String(hour + 1).padStart(2, '0')}:00` });
                }
            });
            dayCol.appendChild(slot);
        }

        const dayAppts = appts.filter(a => a.date === dateStr);
        this.arrangeEvents(dayAppts);

        dayAppts.forEach(appt => {
            const card = this.createEventCard(appt);
            dayCol.appendChild(card);
        });
        grid.appendChild(dayCol);

        this.elements.gridWrapper.appendChild(grid);
    },

    renderMonthView() {
        const appts = this.getFilteredAppointments();
        
        // Month label: "junho 2026"
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        this.elements.rangeLabel.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        const grid = document.createElement('div');
        grid.className = 'calendar-grid month-view';

        // Weekday Headers
        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'grid-header-cell';
            header.style.padding = '10px 0';
            header.innerHTML = `<span class="day-name">${day}</span>`;
            grid.appendChild(header);
        });

        // Compute days for grid (first of month to end of month, padded to full weeks)
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const totalCells = Math.ceil((firstDayIndex + totalDays) / 7) * 7;
        
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < totalCells; i++) {
            const cellDate = new Date(year, month, 1 - firstDayIndex + i);
            const dateStr = cellDate.toISOString().split('T')[0];
            
            const cell = document.createElement('div');
            cell.className = `month-cell ${dateStr === todayStr ? 'today' : ''}`;
            
            // Fade out dates of previous/next month
            if (cellDate.getMonth() !== month) {
                cell.style.opacity = '0.35';
            }

            cell.innerHTML = `
                <div class="month-cell-header">
                    <span class="month-cell-header-num">${cellDate.getDate()}</span>
                </div>
                <div class="month-cell-events"></div>
            `;

            // Append events
            const cellEventsContainer = cell.querySelector('.month-cell-events');
            const cellAppts = appts.filter(a => a.date === dateStr);
            
            cellAppts.sort((a,b) => a.startTime.localeCompare(b.startTime)).slice(0, 3).forEach(appt => {
                const tag = document.createElement('div');
                tag.className = `month-event-item ${appt.status}`;
                tag.textContent = `${appt.startTime} ${appt.title}`;
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openModal(appt);
                });
                cellEventsContainer.appendChild(tag);
            });

            if (cellAppts.length > 3) {
                const more = document.createElement('div');
                more.style.fontSize = '0.65rem';
                more.style.color = 'var(--text-muted)';
                more.style.textAlign = 'center';
                more.textContent = `+${cellAppts.length - 3} mais`;
                cellEventsContainer.appendChild(more);
            }

            // Click cell to add appointment
            cell.addEventListener('click', () => {
                this.openModal(null, { date: dateStr, startTime: '09:00', endTime: '10:00' });
            });

            grid.appendChild(cell);
        }

        this.elements.gridWrapper.appendChild(grid);
    },

    // Overlap Resolution Algorithm
    arrangeEvents(events) {
        if (events.length === 0) return;

        // Sort by start time, then by end time
        events.sort((a, b) => {
            if (a.startTime !== b.startTime) {
                return a.startTime.localeCompare(b.startTime);
            }
            return a.endTime.localeCompare(b.endTime);
        });

        const columns = []; // array of columns, each column contains events

        events.forEach(event => {
            const eventStart = this.timeToMinutes(event.startTime);
            let placed = false;

            // Try to place it in the first column where it doesn't overlap
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                const lastEvent = col[col.length - 1];
                const lastEnd = this.timeToMinutes(lastEvent.endTime);

                if (eventStart >= lastEnd) {
                    col.push(event);
                    event.colIndex = i;
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                columns.push([event]);
                event.colIndex = columns.length - 1;
            }
        });

        // Find overlapping groups to compute width
        // A simple way to compute is: two events overlap if they share time.
        // Group events into connected groups:
        const groups = [];
        
        events.forEach(event => {
            const eventStart = this.timeToMinutes(event.startTime);
            const eventEnd = this.timeToMinutes(event.endTime);
            
            let placedInGroup = false;

            for (let g = 0; g < groups.length; g++) {
                // If this event overlaps with ANY event in this group, it belongs to the group
                const overlaps = groups[g].some(other => {
                    const otherStart = this.timeToMinutes(other.startTime);
                    const otherEnd = this.timeToMinutes(other.endTime);
                    return (eventStart < otherEnd && eventEnd > otherStart);
                });

                if (overlaps) {
                    groups[g].push(event);
                    placedInGroup = true;
                    break;
                }
            }

            if (!placedInGroup) {
                groups.push([event]);
            }
        });

        // For each group, set the max column count as the width divider
        groups.forEach(group => {
            const maxCols = Math.max(...group.map(e => e.colIndex)) + 1;
            group.forEach(event => {
                event.totalCols = maxCols;
            });
        });
    },

    createEventCard(appt) {
        const card = document.createElement('div');
        card.className = `event-card ${appt.status}`;
        
        // Compute positioning
        const startMin = this.timeToMinutes(appt.startTime);
        const endMin = this.timeToMinutes(appt.endTime);
        const duration = endMin - startMin;

        // Position on 1 minute = 1px scale
        card.style.top = `${startMin}px`;
        card.style.height = `${duration}px`;

        // Overlap widths
        const totalCols = appt.totalCols || 1;
        const colIndex = appt.colIndex || 0;
        const width = 100 / totalCols;
        const left = colIndex * width;

        card.style.width = `calc(${width}% - 4px)`;
        card.style.left = `calc(${left}% + 2px)`;

        // Content
        // Extract prefix from title e.g. [AF] LUDI -> AF LUDI
        card.innerHTML = `
            <div class="event-title">${appt.title}</div>
            <div class="event-time">${appt.startTime} - ${appt.endTime}</div>
            <div class="event-info">${appt.clientName}</div>
        `;

        // Click to edit
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openModal(appt);
        });

        return card;
    },

    openModal(appt = null, defaults = null) {
        this.elements.form.reset();
        
        // Enforce permissions in modal
        if (!appt && !this.canEdit) return; // Block creating new events

        const user = Auth.getCurrentUser();
        const canManageClients = user && user.permissions && user.permissions.includes('gerenciar_clientes');
        const canManageConfig = user && user.permissions && user.permissions.includes('gerenciar_configuracoes');

        if (this.elements.btnQuickClient) {
            this.elements.btnQuickClient.style.display = canManageClients ? 'block' : 'none';
        }
        if (this.elements.btnQuickTitle) {
            this.elements.btnQuickTitle.style.display = canManageConfig ? 'block' : 'none';
        }

        const inputs = this.elements.form.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => {
            inp.disabled = !this.canEdit;
        });

        const btnSave = this.elements.form.querySelector('button[type="submit"]');
        if (btnSave) btnSave.style.display = this.canEdit ? 'inline-flex' : 'none';
        
        if (appt) {
            // Edit mode
            this.elements.modalTitle.textContent = this.canEdit ? 'Editar Agendamento' : 'Detalhes do Agendamento';
            document.getElementById('appt-id').value = appt.id;
            document.getElementById('appt-protocolo').value = appt.protocolo || '';
            
            const canEditProtocolo = user && user.permissions && user.permissions.includes('editar_protocolo');
            if (this.canEdit) {
                document.getElementById('appt-protocolo').disabled = !canEditProtocolo;
            }

            document.getElementById('appt-client').value = appt.clientName;
            
            // Populate select dropdown
            this.populateDropdowns();
            
            // Check if the appointment title exists in current select options. If not, add it temporarily.
            let exists = false;
            for (let i = 0; i < this.elements.titleSelect.options.length; i++) {
                if (this.elements.titleSelect.options[i].value === appt.title) {
                    exists = true;
                    break;
                }
            }
            if (!exists && appt.title) {
                const opt = document.createElement('option');
                opt.value = appt.title;
                opt.textContent = `${appt.title} (Legado)`;
                this.elements.titleSelect.appendChild(opt);
            }

            this.elements.titleSelect.value = appt.title;
            this.elements.titleInput.value = appt.title;

            document.getElementById('appt-desc').value = appt.description || '';
            document.getElementById('appt-date').value = appt.date;
            document.getElementById('appt-start').value = appt.startTime;
            document.getElementById('appt-end').value = appt.endTime;
            document.getElementById('appt-status').value = appt.status;
            document.getElementById('appt-tech').value = appt.techId;
            document.getElementById('appt-team').value = appt.teamId;

            this.elements.btnDelete.style.display = this.canEdit ? 'block' : 'none';
        } else {
            // Create mode
            this.elements.modalTitle.textContent = 'Novo Agendamento';
            document.getElementById('appt-id').value = '';
            document.getElementById('appt-protocolo').value = '';
            
            this.populateDropdowns();
            this.elements.titleSelect.value = '';
            this.elements.titleInput.value = '';

            const todayStr = new Date().toISOString().split('T')[0];
            document.getElementById('appt-date').value = defaults ? defaults.date : todayStr;
            document.getElementById('appt-start').value = defaults ? defaults.startTime : '09:00';
            document.getElementById('appt-end').value = defaults ? defaults.endTime : '10:00';
            document.getElementById('appt-status').value = 'agendado';

            this.elements.btnDelete.style.display = 'none';
        }

        this.elements.modal.classList.add('active');
    },

    closeModal() {
        this.elements.modal.classList.remove('active');
    },

    saveAppointment(e) {
        e.preventDefault();

        const id = document.getElementById('appt-id').value;
        const appt = {
            protocolo: document.getElementById('appt-protocolo').value.trim(),
            clientName: document.getElementById('appt-client').value,
            title: document.getElementById('appt-title').value,
            description: document.getElementById('appt-desc').value,
            date: document.getElementById('appt-date').value,
            startTime: document.getElementById('appt-start').value,
            endTime: document.getElementById('appt-end').value,
            status: document.getElementById('appt-status').value,
            techId: document.getElementById('appt-tech').value,
            teamId: document.getElementById('appt-team').value
        };

        if (id) {
            appt.id = id;
        }

        // Validate time range
        if (appt.startTime >= appt.endTime) {
            alert('A hora de término deve ser posterior à hora de início!');
            return;
        }

        try {
            Api.saveAppointment(appt);
            this.closeModal();
            this.render();
        } catch (error) {
            alert(error.message);
        }
    },

    deleteAppointment() {
        const id = document.getElementById('appt-id').value;
        if (id && confirm('Tem certeza de que deseja excluir este agendamento?')) {
            Api.deleteAppointment(id);
            this.closeModal();
            this.render();
        }
    }
};

// Initialize Calendar
document.addEventListener('DOMContentLoaded', () => Agenda.init());
window.addEventListener('api-data-updated', () => {
    if (Agenda && typeof Agenda.render === 'function') {
        Agenda.populateDropdowns();
        Agenda.initFilters();
        Agenda.render();
    }
});
