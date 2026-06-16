// Reports Logic for Agenda-Pro
document.addEventListener('DOMContentLoaded', () => ReportsPage.init());
window.addEventListener('api-data-updated', () => {
    if (ReportsPage && typeof ReportsPage.render === 'function') ReportsPage.render();
});

const ReportsPage = {
    init() {
        this.initDates();
        this.bindEvents();
        this.render();
    },

    initDates() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        document.getElementById('filter-start-date').value = toDateStr(startOfMonth);
        document.getElementById('filter-end-date').value = toDateStr(today);
        document.getElementById('filter-status').value = 'all';
    },

    bindEvents() {
        document.getElementById('btn-apply-filters').addEventListener('click', () => this.render());
    },

    timeToHours(timeStr) {
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
    },

    render() {
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        const statusFilter = document.getElementById('filter-status').value;

        const appts = Api.getAppointments();
        const techs = Api.getTechnicians();
        
        // Filter appointments in period
        const filtered = appts.filter(a => {
            const passStart = startDate ? a.date >= startDate : true;
            const passEnd = endDate ? a.date <= endDate : true;
            const passStatus = statusFilter === 'all' ? true : a.status === statusFilter;
            return passStart && passEnd && passStatus;
        });

        // 1. Calculate Metrics
        const total = filtered.length;
        const concluded = filtered.filter(a => a.status === 'concluido').length;
        
        let totalHours = 0;
        filtered.forEach(a => {
            const start = this.timeToHours(a.startTime);
            const end = this.timeToHours(a.endTime);
            totalHours += (end - start);
        });

        const rate = total > 0 ? Math.round((concluded / total) * 100) : 0;

        document.getElementById('rep-val-total').textContent = total;
        document.getElementById('rep-val-concluded').textContent = concluded;
        document.getElementById('rep-val-hours').textContent = `${totalHours.toFixed(1)}h`;
        document.getElementById('rep-val-rate').textContent = `${rate}%`;

        // 2. Render Table
        this.renderTable(filtered, techs);

        // 3. Render Tech Productivity Chart
        this.renderTechChart(filtered, techs);

        // 4. Render Doughnut Chart
        this.renderDoughnutChart(filtered);
    },

    renderTable(appts, techs) {
        const tbody = document.getElementById('reports-table-body');
        tbody.innerHTML = '';

        if (appts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum atendimento no período selecionado.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort appts by date descending
        const sorted = [...appts].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

        const techMap = {};
        techs.forEach(t => { techMap[t.id] = t.name; });

        sorted.forEach(a => {
            const start = this.timeToHours(a.startTime);
            const end = this.timeToHours(a.endTime);
            const durationMin = Math.round((end - start) * 60);
            const durationStr = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

            // Format date to DD/MM/YYYY
            const dateParts = a.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>${a.startTime} - ${a.endTime}</td>
                <td><strong>${a.title}</strong></td>
                <td>${a.clientName}</td>
                <td>${techMap[a.techId] || 'Não atribuído'}</td>
                <td>${durationStr}</td>
                <td><span class="badge badge-${a.status}">${this.translateStatus(a.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    translateStatus(status) {
        const map = {
            'concluido': 'Concluído',
            'execucao': 'Em execução',
            'agendado': 'Agendado',
            'pendencia-cli': 'Pend. Cliente',
            'remarcado-cli': 'Remarcado',
            'pendencia-com': 'Pend. Comercial'
        };
        return map[status] || status;
    },

    renderTechChart(appts, techs) {
        const container = document.getElementById('tech-performance-chart');
        if (!container) return;

        // Count completed events per tech
        const completed = appts.filter(a => a.status === 'concluido');
        const techCounts = {};
        techs.forEach(t => { techCounts[t.name] = 0; });

        completed.forEach(a => {
            const techObj = techs.find(t => t.id === a.techId);
            if (techObj) {
                techCounts[techObj.name]++;
            }
        });

        const data = Object.entries(techCounts).map(([name, count]) => ({ name, count }));
        const maxVal = Math.max(...data.map(d => d.count), 1);

        const chartHeight = 220;
        const chartWidth = container.clientWidth || 400;
        const barWidth = Math.floor(chartWidth / Math.max(data.length, 1)) - 15;

        let barsSvg = '';
        let labelsSvg = '';

        data.forEach((d, idx) => {
            const barHeight = Math.max((d.count / maxVal) * (chartHeight - 60), 2);
            const x = idx * (chartWidth / data.length) + 10;
            const y = chartHeight - barHeight - 30;

            barsSvg += `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="var(--primary-color)" opacity="0.85">
                    <animate attributeName="height" from="0" to="${barHeight}" dur="0.4s" fill="freeze" />
                    <animate attributeName="y" from="${chartHeight - 30}" to="${y}" dur="0.4s" fill="freeze" />
                </rect>
                <text x="${x + barWidth/2}" y="${y - 8}" fill="#ffffff" font-size="10" font-weight="600" text-anchor="middle">${d.count}</text>
            `;

            // Shorten technician name to first name or initials
            const firstName = d.name.split(' ')[0];
            const secondName = d.name.split(' ')[1] || '';
            const labelText = secondName ? `${firstName} ${secondName[0]}.` : firstName;

            labelsSvg += `
                <text x="${x + barWidth/2}" y="${chartHeight - 10}" fill="#8e8e93" font-size="9" text-anchor="middle">${labelText}</text>
            `;
        });

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${chartWidth} ${chartHeight}" style="overflow: visible;">
                ${barsSvg}
                <line x1="0" y1="${chartHeight - 25}" x2="${chartWidth}" y2="${chartHeight - 25}" stroke="#2c2c2c" stroke-width="1" />
                ${labelsSvg}
            </svg>
        `;
    },

    renderDoughnutChart(appts) {
        const container = document.getElementById('status-doughnut-chart');
        if (!container) return;

        const statuses = [
            { key: 'concluido', label: 'Concluído', color: '#22c55e' },
            { key: 'execucao', label: 'Em execução', color: '#ef4444' },
            { key: 'agendado', label: 'Agendado', color: '#f97316' },
            { key: 'pendencia-cli', label: 'Pend. Cliente', color: '#3b82f6' },
            { key: 'remarcado-cli', label: 'Remarcado', color: '#ffffff' },
            { key: 'pendencia-com', label: 'Pend. Comercial', color: '#a855f7' }
        ];

        const counts = {};
        statuses.forEach(s => counts[s.key] = 0);
        appts.forEach(a => {
            if (counts[a.status] !== undefined) counts[a.status]++;
        });

        const total = appts.length;
        if (total === 0) {
            container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">Sem dados para gerar gráfico.</span>`;
            return;
        }

        // Draw segmented circles
        const r = 50;
        const cx = 100;
        const cy = 100;
        const circumference = 2 * Math.PI * r; // ~314.16

        let currentOffset = 0;
        let svgSegments = '';
        let legendHtml = '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem; margin-left: 20px; justify-content: center;">';

        statuses.forEach(s => {
            const count = counts[s.key];
            if (count === 0) return;

            const percentage = (count / total) * 100;
            const strokeDashArray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashOffset = -currentOffset;

            svgSegments += `
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" 
                        stroke="${s.color}" stroke-width="20"
                        stroke-dasharray="${strokeDashArray}" 
                        stroke-dashoffset="${strokeDashOffset}" 
                        transform="rotate(-90 ${cx} ${cy})"
                        style="transition: stroke-width 0.2s; cursor: pointer;"
                        onmouseover="this.setAttribute('stroke-width', '24')"
                        onmouseout="this.setAttribute('stroke-width', '20')">
                </circle>
            `;

            currentOffset += (percentage / 100) * circumference;

            legendHtml += `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${s.color};"></span>
                    <span style="color: var(--text-muted);">${s.label}: <strong>${Math.round(percentage)}%</strong> (${count})</span>
                </div>
            `;
        });
        legendHtml += '</div>';

        container.innerHTML = `
            <div style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="${cx}" cy="${cy}" r="${r - 10}" fill="#1a1a1a"></circle>
                    ${svgSegments}
                    <text x="${cx}" y="${cy + 5}" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle">Total: ${total}</text>
                </svg>
                ${legendHtml}
            </div>
        `;
    }
};
