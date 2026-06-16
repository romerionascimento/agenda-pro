// Dashboard Logic
function renderDashboard() {
    const clients = Api.getClients();
    const techs = Api.getTechnicians();
    const teams = Api.getTeams();
    const appts = Api.getAppointments();

    document.getElementById('val-clients').textContent = clients.length;
    document.getElementById('val-techs').textContent = techs.length;
    document.getElementById('val-teams').textContent = teams.length;
    document.getElementById('val-appts').textContent = appts.length;

    const executingCount = appts.filter(a => a.status === 'execucao').length;
    document.getElementById('trend-executing').textContent = `${executingCount} em execução agora`;

    renderTeamWorkload(teams, appts);
    renderStatusChart(appts);
    renderRecentActivities(appts);
}

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    window.addEventListener('api-data-updated', renderDashboard);
});

// Calculate and render workload progress bars
function renderTeamWorkload(teams, appts) {
    const listEl = document.getElementById('workload-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Color list for teams
    const colors = ['#22c55e', '#f97316', '#3b82f6', '#a855f7'];

    teams.forEach((team, index) => {
        const teamAppts = appts.filter(a => a.teamId === team.id);
        // Calculate dynamic workload percentage (assuming 8 services is 100% full capacity)
        const percentage = Math.min(100, Math.round((teamAppts.length / 8) * 100));
        const color = colors[index % colors.length];

        const item = document.createElement('div');
        item.className = 'team-workload-item';
        item.innerHTML = `
            <div class="team-name-row">
                <span>${team.name}</span>
                <span>${percentage}% (${teamAppts.length} serv.)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// Generate an interactive, beautiful SVG bar chart
function renderStatusChart(appts) {
    const container = document.getElementById('status-distribution-chart');
    if (!container) return;

    // Define statuses and colors
    const statuses = [
        { key: 'concluido', label: 'Concluído', color: '#22c55e' },
        { key: 'execucao', label: 'Em Execução', color: '#ef4444' },
        { key: 'agendado', label: 'Agendado', color: '#f97316' },
        { key: 'pendencia-cli', label: 'Pend. Cliente', color: '#3b82f6' },
        { key: 'remarcado-cli', label: 'Remarcado', color: '#ffffff' },
        { key: 'pendencia-com', label: 'Pend. Comercial', color: '#a855f7' }
    ];

    // Count
    const counts = {};
    statuses.forEach(s => counts[s.key] = 0);
    appts.forEach(a => {
        if (counts[a.status] !== undefined) {
            counts[a.status]++;
        }
    });

    const maxVal = Math.max(...Object.values(counts), 1);
    const chartHeight = 200;
    const chartWidth = container.clientWidth || 500;
    const barWidth = Math.floor(chartWidth / statuses.length) - 20;

    let barsSvg = '';
    let labelsSvg = '';
    
    statuses.forEach((s, idx) => {
        const count = counts[s.key];
        // Calculate height
        const barHeight = Math.max((count / maxVal) * (chartHeight - 40), 10);
        const x = idx * (chartWidth / statuses.length) + 10;
        const y = chartHeight - barHeight - 20;

        // Render Bar with nice rounded top
        barsSvg += `
            <g class="chart-bar-group" data-label="${s.label}" data-count="${count}">
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${s.color}" opacity="0.85" style="transition: opacity 0.2s; cursor: pointer;">
                    <animate attributeName="height" from="0" to="${barHeight}" dur="0.5s" fill="freeze" />
                    <animate attributeName="y" from="${chartHeight - 20}" to="${y}" dur="0.5s" fill="freeze" />
                </rect>
                <text x="${x + barWidth/2}" y="${y - 8}" fill="#ffffff" font-size="11" font-weight="600" text-anchor="middle">${count}</text>
            </g>
        `;

        // Label underneath
        labelsSvg += `
            <text x="${x + barWidth/2}" y="${chartHeight}" fill="#8e8e93" font-size="10" font-weight="500" text-anchor="middle">${s.label.split(' ')[0]}</text>
        `;
    });

    container.innerHTML = `
        <div class="chart-tooltip" id="tooltip"></div>
        <svg width="100%" height="100%" viewBox="0 0 ${chartWidth} ${chartHeight}" style="overflow: visible;">
            ${barsSvg}
            <line x1="0" y1="${chartHeight - 15}" x2="${chartWidth}" y2="${chartHeight - 15}" stroke="#2c2c2c" stroke-width="1" />
            ${labelsSvg}
        </svg>
    `;

    // Tooltip behavior
    const tooltip = container.querySelector('#tooltip');
    const barGroups = container.querySelectorAll('.chart-bar-group');

    barGroups.forEach(group => {
        const rect = group.querySelector('rect');
        group.addEventListener('mouseenter', (e) => {
            rect.setAttribute('opacity', '1');
            const label = group.getAttribute('data-label');
            const count = group.getAttribute('data-count');
            
            tooltip.innerHTML = `<strong>${label}</strong>: ${count} serviços`;
            tooltip.style.opacity = '1';
        });

        group.addEventListener('mousemove', (e) => {
            const containerRect = container.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            tooltip.style.left = `${mouseX + 15}px`;
            tooltip.style.top = `${mouseY - 30}px`;
        });

        group.addEventListener('mouseleave', () => {
            rect.setAttribute('opacity', '0.85');
            tooltip.style.opacity = '0';
        });
    });
}

// Populate Recent Activities Feed
function renderRecentActivities(appts) {
    const listEl = document.getElementById('recent-activities');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Sort by createdAt or ID desc
    const sorted = [...appts].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    sorted.forEach(appt => {
        const dateObj = new Date(appt.date + 'T12:00:00'); // avoid timezone shifts
        const dayStr = weekdays[dateObj.getDay()];
        
        let markerColor = 'var(--primary-color)';
        if (appt.status === 'concluido') markerColor = 'var(--color-concluido)';
        if (appt.status === 'execucao') markerColor = 'var(--color-execucao)';
        if (appt.status === 'agendado') markerColor = 'var(--color-agendado)';
        if (appt.status === 'pendencia-cli') markerColor = 'var(--color-pendencia-cli)';
        if (appt.status === 'remarcado-cli') markerColor = 'var(--color-remarcado-cli)';
        if (appt.status === 'pendencia-com') markerColor = 'var(--color-pendencia-com)';

        const item = document.createElement('li');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-marker" style="background-color: ${markerColor};"></div>
            <div class="list-item-content">
                <div class="list-item-title">${appt.title}</div>
                <div class="list-item-desc">${appt.clientName} | ${appt.startTime} - ${appt.endTime}</div>
            </div>
            <div class="list-item-time">${dayStr}</div>
        `;
        listEl.appendChild(item);
    });
}
