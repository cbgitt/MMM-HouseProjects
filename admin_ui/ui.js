document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = `/MMM-HouseProjects/api`;
    let charts = {
        projectStatus: null,
        workload: null,
        completionTrend: null,
        projectsByGroup: null,
        overdueAnalysis: null
    };
    let allProjects = [], allGroups = [], allNames = [];
    let filteredProjects = [];

    // --- Navigation ---
    window.showPage = (pageId) => {
        // Update active page
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        // Update active nav item
        document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
        document.querySelector(`.sidebar nav li[onclick="showPage('${pageId}')"]`).classList.add('active');
        
        // Load specific page data
        if (pageId === 'analytics') {
            loadAnalyticsData();
        }
    };

    // --- Toast Notifications ---
    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `show ${type}`;
        setTimeout(() => toast.classList.remove('show', type), 3000);
    };

    // --- API Calls ---
    const fetchData = async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            showToast(`Error: Could not load ${endpoint}.`, 'error');
            return [];
        }
    };

    const postData = async (endpoint, data) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to post to ${endpoint}:`, error);
            showToast(`Error: Could not save data.`, 'error');
            return null;
        }
    };
    
    const deleteData = async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to delete from ${endpoint}:`, error);
            showToast(`Error: Could not delete item.`, 'error');
            return null;
        }
    };

    const updateData = async (endpoint, data = null) => {
        try {
            const options = { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            };
            if (data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to update ${endpoint}:`, error);
            showToast(`Error: Could not update item.`, 'error');
            return null;
        }
    };

    // --- Enhanced Dashboard Rendering ---
    const renderDashboard = async () => {
        try {
            const overview = await fetchData('analytics/overview');
            if (!overview) return;

            // Update KPI widgets
            document.getElementById('activeProjects').textContent = overview.activeProjects;
            document.getElementById('completedProjects').textContent = overview.completedThisMonth;
            document.getElementById('overdueProjects').textContent = overview.overdueProjects;
            document.getElementById('avgCompletionTime').textContent = `${overview.avgCompletionDays}d`;
            document.getElementById('completionRate').textContent = `${overview.completionRate}%`;
            document.getElementById('totalNames').textContent = overview.totalNames;

            // Render charts
            renderProjectStatusChart(overview);
            renderWorkloadChart(overview.workloadByPerson);
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            showToast('Error loading dashboard data', 'error');
        }
    };

    const renderProjectStatusChart = (overview) => {
        const ctx = document.getElementById('projectStatusChart');
        if (!ctx) return;

        if (charts.projectStatus) charts.projectStatus.destroy();

        const statusData = [
            { label: 'Active', value: overview.activeProjects, color: '#4a90e2' },
            { label: 'Completed', value: overview.completedProjects, color: '#2ecc71' },
            { label: 'Overdue', value: overview.overdueProjects, color: '#e74c3c' }
        ];

        charts.projectStatus = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: statusData.map(s => s.label),
                datasets: [{
                    data: statusData.map(s => s.value),
                    backgroundColor: statusData.map(s => s.color),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    };

    const renderWorkloadChart = (workloadData) => {
        const ctx = document.getElementById('workloadChart');
        if (!ctx || !workloadData.length) return;

        if (charts.workload) charts.workload.destroy();

        charts.workload = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: workloadData.map(d => d.name),
                datasets: [{
                    label: 'Active Projects',
                    data: workloadData.map(d => d.active),
                    backgroundColor: '#4a90e2',
                    borderRadius: 4
                }, {
                    label: 'Completed Projects', 
                    data: workloadData.map(d => d.completed),
                    backgroundColor: '#2ecc71',
                    borderRadius: 4
                }, {
                    label: 'Overdue Projects',
                    data: workloadData.map(d => d.overdue), 
                    backgroundColor: '#e74c3c',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { 
                        stacked: false,
                        grid: { display: false }
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    }
                },
                elements: {
                    bar: {
                        borderWidth: 0
                    }
                }
            }
        });
    };

    // --- Analytics Page ---
    const loadAnalyticsData = async () => {
        try {
            const [overview, trends] = await Promise.all([
                fetchData('analytics/overview'),
                fetchData('analytics/trends')
            ]);

            renderCompletionTrendChart(trends.trends);
            renderProjectsByGroupChart(overview.projectsByGroup);
            
            if (overview.overdueProjects > 0) {
                renderOverdueAnalysisChart(overview);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            showToast('Error loading analytics data', 'error');
        }
    };

    const renderCompletionTrendChart = (trendData) => {
        const ctx = document.getElementById('completionTrendChart');
        if (!ctx || !trendData.length) return;

        if (charts.completionTrend) charts.completionTrend.destroy();

        charts.completionTrend = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: trendData.map(d => d.month),
                datasets: [{
                    label: 'Projects Completed',
                    data: trendData.map(d => d.completed),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }, {
                    label: 'Projects Created',
                    data: trendData.map(d => d.created),
                    borderColor: '#4a90e2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4a90e2',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    };

    const renderProjectsByGroupChart = (groupData) => {
        const ctx = document.getElementById('projectsByGroupChart');
        if (!ctx || !groupData.length) return;

        if (charts.projectsByGroup) charts.projectsByGroup.destroy();

        const colors = ['#4a90e2', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

        charts.projectsByGroup = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: groupData.map(g => g.group),
                datasets: [{
                    label: 'Active Projects',
                    data: groupData.map(g => g.active),
                    backgroundColor: colors[0],
                    borderRadius: 4
                }, {
                    label: 'Completed Projects',
                    data: groupData.map(g => g.completed),
                    backgroundColor: colors[1],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    };

    const renderOverdueAnalysisChart = (overview) => {
        const overdueByGroup = allGroups.map(group => {
            const overdueProjects = allProjects.filter(p => 
                !p.completed && 
                p.group === group.name && 
                new Date(p.dueDate) < new Date()
            );
            return {
                group: group.name,
                count: overdueProjects.length
            };
        }).filter(item => item.count > 0);

        if (overdueByGroup.length === 0) return;

        const container = document.getElementById('overdueAnalysisContainer');
        container.style.display = 'block';

        const ctx = document.getElementById('overdueAnalysisChart');
        if (!ctx) return;

        if (charts.overdueAnalysis) charts.overdueAnalysis.destroy();

        charts.overdueAnalysis = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: overdueByGroup.map(d => d.group),
                datasets: [{
                    label: 'Overdue Projects',
                    data: overdueByGroup.map(d => d.count),
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    };

    // --- Project Table Rendering ---
    const renderProjectTables = (projects = allProjects) => {
        filteredProjects = projects;
        const activeBody = document.getElementById('activeProjectsTable').getElementsByTagName('tbody')[0];
        const completedBody = document.getElementById('completedProjectsTable').getElementsByTagName('tbody')[0];
        activeBody.innerHTML = '';
        completedBody.innerHTML = '';

        projects.forEach(project => {
            const assignedName = allNames.find(n => n.id === project.nameId)?.name || 'N/A';
            const groupDisplay = project.subgroup ? `${project.group} / ${project.subgroup}` : project.group;
            
            if (project.completed) {
                const row = completedBody.insertRow();
                const createdDate = new Date(project.dateCreated);
                const completedDate = new Date(project.completedDate);
                const dueDate = new Date(project.dueDate);

                const timeDiff = completedDate.getTime() - createdDate.getTime();
                const daysToComplete = Math.ceil(timeDiff / (1000 * 3600 * 24));

                let colorClass = '';
                const completedDay = new Date(completedDate).setHours(0,0,0,0);
                const dueDay = new Date(dueDate).setHours(0,0,0,0);

                if (completedDay < dueDay) colorClass = 'text-green';
                else if (completedDay > dueDay) colorClass = 'text-red';

                const priorityBadge = project.priority ? 
                    `<span class="priority-badge priority-${project.priority}">${project.priority}</span>` : 
                    '<span class="priority-badge priority-medium">medium</span>';

                row.innerHTML = `
                    <td>${project.description}</td>
                    <td>${priorityBadge}</td>
                    <td>${groupDisplay}</td>
                    <td>${assignedName}</td>
                    <td>${completedDate.toLocaleDateString()}</td>
                    <td class="${colorClass}">${daysToComplete} day(s)</td>
                    <td class="action-buttons">
                        <button class="action-button" data-action="reopen-project" data-id="${project.id}" title="Re-open">
                            <i data-feather="rotate-ccw"></i>
                        </button>
                        <button class="action-button" data-action="edit-project" data-id="${project.id}" title="Edit">
                            <i data-feather="edit-2"></i>
                        </button>
                        <button class="action-button delete" data-action="delete-project" data-id="${project.id}" title="Delete">
                            <i data-feather="trash-2"></i>
                        </button>
                    </td>
                `;
            } else {
                const row = activeBody.insertRow();
                const dueDate = new Date(project.dueDate);
                const today = new Date();
                const isOverdue = dueDate < today;
                const dueDateClass = isOverdue ? 'status-overdue' : 
                    (dueDate.toDateString() === today.toDateString() ? 'status-due-soon' : 'status-on-track');

                const priorityBadge = project.priority ? 
                    `<span class="priority-badge priority-${project.priority}">${project.priority}</span>` : 
                    '<span class="priority-badge priority-medium">medium</span>';

                const progressBar = project.progressPercent ? 
                    `<div class="progress-bar-table">
                        <div class="progress-fill-table" style="width: ${project.progressPercent}%"></div>
                    </div>
                    <small>${project.progressPercent}%</small>` : 
                    '<small>Not started</small>';

                row.innerHTML = `
                    <td>${project.description}</td>
                    <td>${priorityBadge}</td>
                    <td>${groupDisplay}</td>
                    <td>${assignedName}</td>
                    <td class="${dueDateClass}">${dueDate.toLocaleDateString()}</td>
                    <td>${progressBar}</td>
                    <td class="action-buttons">
                        <button class="action-button complete" data-action="complete-project" data-id="${project.id}" title="Complete">
                            <i data-feather="check"></i>
                        </button>
                        <button class="action-button" data-action="update-progress" data-id="${project.id}" title="Update Progress">
                            <i data-feather="trending-up"></i>
                        </button>
                        <button class="action-button" data-action="add-note" data-id="${project.id}" title="Add Note">
                            <i data-feather="message-circle"></i>
                        </button>
                        <button class="action-button" data-action="edit-project" data-id="${project.id}" title="Edit">
                            <i data-feather="edit-2"></i>
                        </button>
                        <button class="action-button delete" data-action="delete-project" data-id="${project.id}" title="Delete">
                            <i data-feather="trash-2"></i>
                        </button>
                    </td>
                `;
            }
        });
        feather.replace();
    };

    // --- Manage Lists Rendering ---
    const renderManageLists = () => {
        const groupTableBody = document.getElementById('group-list-body');
        groupTableBody.innerHTML = '';
        
        allGroups.forEach(group => {
            const row = groupTableBody.insertRow();
            
            row.insertCell(0).innerHTML = `
                <div class="group-management-item">
                    <span class="group-name">${group.name}</span>
                    <div class="action-buttons">
                        <button class="action-button" data-action="edit-group" data-id="${group.id}" data-name="${group.name}" title="Edit Group Name">
                            <i data-feather="edit-2"></i>
                        </button>
                        <button class="action-button delete" data-action="delete-group" data-id="${group.id}" title="Delete Group">
                            <i data-feather="trash-2"></i>
                        </button>
                    </div>
                </div>
            `;

            const subgroupsCell = row.insertCell(1);
            const addSubgroupBtn = document.createElement('button');
            addSubgroupBtn.className = 'add-subgroup-btn';
            addSubgroupBtn.dataset.action = 'add-subgroup';
            addSubgroupBtn.dataset.groupId = group.id;
            addSubgroupBtn.innerHTML = '<i data-feather="plus"></i> Add Subgroup';
            subgroupsCell.appendChild(addSubgroupBtn);
            
            (group.subgroups || []).forEach(subgroup => {
                const item = document.createElement('div');
                item.className = 'subgroup-management-item';
                item.innerHTML = `
                    <span>${subgroup.name}</span>
                    <button class="action-button delete" data-action="delete-subgroup" data-group-id="${group.id}" data-id="${subgroup.id}" title="Delete Subgroup">
                        <i data-feather="x"></i>
                    </button>
                `;
                subgroupsCell.appendChild(item);
            });
        });

        const nameList = document.getElementById('name-list');
        nameList.innerHTML = '';
        allNames.forEach(n => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${n.name}
                <button class="action-button delete" data-action="delete-name" data-id="${n.id}">
                    <i data-feather="trash-2"></i>
                </button>
            `;
            nameList.appendChild(li);
        });
        feather.replace();
    };

    // --- Dropdown Population ---
    const populateDropdowns = () => {
        // Populate group dropdowns
        ['group-select', 'edit-group-select'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Group</option>';
                allGroups.forEach(group => {
                    select.innerHTML += `<option value="${group.id}">${group.name}</option>`;
                });
            }
        });

        // Populate name dropdowns
        ['name-select', 'edit-name-select'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Person</option>';
                allNames.forEach(name => {
                    select.innerHTML += `<option value="${name.id}">${name.name}</option>`;
                });
            }
        });

        // Populate person filter
        const personFilter = document.getElementById('person-filter');
        if (personFilter) {
            personFilter.innerHTML = '<option value="">All People</option>';
            allNames.forEach(name => {
                personFilter.innerHTML += `<option value="${name.id}">${name.name}</option>`;
            });
        }
    };

    // --- Group/Subgroup Handling ---
    const handleGroupChange = (prefix = '') => {
        const groupSelect = document.getElementById(`${prefix}group-select`);
        const subgroupSelect = document.getElementById(`${prefix}subgroup-select`);
        if (!groupSelect || !subgroupSelect) return;

        const selectedGroupId = parseInt(groupSelect.value);
        const selectedGroup = allGroups.find(g => g.id === selectedGroupId);

        subgroupSelect.innerHTML = '<option value="">Select Subgroup (Optional)</option>';
        if (selectedGroup && selectedGroup.subgroups && selectedGroup.subgroups.length > 0) {
            selectedGroup.subgroups.forEach(sg => {
                subgroupSelect.innerHTML += `<option value="${sg.name}">${sg.name}</option>`;
            });
            subgroupSelect.style.display = 'block';
        } else {
            subgroupSelect.style.display = 'none';
        }
    };

    // --- CRUD Operations ---
    window.addGroup = async () => {
        const name = document.getElementById('newGroupName').value.trim();
        if (!name) {
            showToast('Please enter a group name', 'warning');
            return;
        }
        const result = await postData('groups', { name });
        if (result) {
            showToast('Group added successfully!');
            document.getElementById('newGroupName').value = '';
            loadAllData();
        }
    };

    window.addName = async () => {
        const name = document.getElementById('newName').value.trim();
        if (!name) {
            showToast('Please enter a name', 'warning');
            return;
        }
        const result = await postData('names', { name });
        if (result) {
            showToast('Team member added successfully!');
            document.getElementById('newName').value = '';
            loadAllData();
        }
    };

    window.addProject = async () => {
        const groupSelect = document.getElementById('group-select');
        const selectedGroup = allGroups.find(g => g.id === parseInt(groupSelect.value));
        
        const project = {
            description: document.getElementById('description').value.trim(),
            group: selectedGroup ? selectedGroup.name : '',
            subgroup: document.getElementById('subgroup-select').value || null,
            nameId: parseInt(document.getElementById('name-select').value),
            dueDate: document.getElementById('dueDate').value,
            priority: document.getElementById('priority-select').value,
            estimatedHours: document.getElementById('estimated-hours').value ? parseInt(document.getElementById('estimated-hours').value) : null,
            budget: document.getElementById('budget').value ? parseFloat(document.getElementById('budget').value) : null,
            weatherDependent: document.getElementById('weather-dependent').checked
        };

        if (!project.description || !project.group || !project.nameId || !project.dueDate) {
            showToast('Please fill out all required fields', 'warning');
            return;
        }

        const result = await postData('projects', project);
        if (result) {
            showToast('Project created successfully!');
            // Clear form
            ['description', 'group-select', 'subgroup-select', 'name-select', 'dueDate', 'estimated-hours', 'budget'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            });
            document.getElementById('priority-select').value = 'medium';
            document.getElementById('weather-dependent').checked = false;
            handleGroupChange();
            loadAllData();
        }
    };

    // --- Filtering ---
    const implementFiltering = () => {
        ['search-input', 'priority-filter', 'status-filter', 'person-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', applyFilters);
            }
        });
    };

    const applyFilters = () => {
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
        const priorityFilter = document.getElementById('priority-filter')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const personFilter = document.getElementById('person-filter')?.value || '';
        
        let filtered = [...allProjects];
        
        // Apply filters
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.description.toLowerCase().includes(searchTerm) ||
                p.group.toLowerCase().includes(searchTerm) ||
                (p.subgroup && p.subgroup.toLowerCase().includes(searchTerm))
            );
        }
        
        if (priorityFilter) {
            filtered = filtered.filter(p => 
                (p.priority || 'medium').toLowerCase() === priorityFilter
            );
        }
        
        if (statusFilter) {
            if (statusFilter === 'active') {
                filtered = filtered.filter(p => !p.completed);
            } else if (statusFilter === 'completed') {
                filtered = filtered.filter(p => p.completed);
            } else if (statusFilter === 'overdue') {
                filtered = filtered.filter(p => 
                    !p.completed && new Date(p.dueDate) < new Date()
                );
            }
        }
        
        if (personFilter) {
            filtered = filtered.filter(p => 
                p.nameId === parseInt(personFilter)
            );
        }
        
        renderProjectTables(filtered);
    };

    window.clearFilters = () => {
        ['search-input', 'priority-filter', 'status-filter', 'person-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        renderProjectTables();
    };

    // --- Modal Management ---
    window.openEditModal = (projectId) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-description').value = project.description;
        document.getElementById('edit-dueDate').value = project.dueDate.split('T')[0];
        
        // Set priority
        const prioritySelect = document.getElementById('edit-priority-select');
        if (prioritySelect) prioritySelect.value = project.priority || 'medium';
        
        // Set estimated hours and budget
        if (project.estimatedHours) document.getElementById('edit-estimated-hours').value = project.estimatedHours;
        if (project.budget) document.getElementById('edit-budget').value = project.budget;
        
        // Set weather dependent
        document.getElementById('edit-weather-dependent').checked = project.weatherDependent || false;
        
        populateDropdowns();
        const group = allGroups.find(g => g.name === project.group);
        if (group) {
            document.getElementById('edit-group-select').value = group.id;
            handleGroupChange('edit-');
            if (project.subgroup) {
                setTimeout(() => {
                    document.getElementById('edit-subgroup-select').value = project.subgroup;
                }, 100);
            }
        }
        
        document.getElementById('edit-name-select').value = project.nameId;
        
        const reopenBtn = document.getElementById('reopen-btn');
        reopenBtn.style.display = project.completed ? 'flex' : 'none';

        document.getElementById('edit-modal').style.display = 'flex';
    };

    window.closeEditModal = () => {
        document.getElementById('edit-modal').style.display = 'none';
    };
    
    window.reopenProjectFromModal = async () => {
        const projectId = parseInt(document.getElementById('edit-project-id').value);
        if (!projectId) return;

        const result = await updateData(`projects/${projectId}/reopen`);
        if (result) {
            showToast('Project has been re-opened!');
            closeEditModal();
            loadAllData();
        }
    };

    window.saveProjectChanges = async () => {
        const projectId = parseInt(document.getElementById('edit-project-id').value);
        const groupSelect = document.getElementById('edit-group-select');
        const selectedGroup = allGroups.find(g => g.id === parseInt(groupSelect.value));
        
        const updatedProject = {
            description: document.getElementById('edit-description').value.trim(),
            group: selectedGroup ? selectedGroup.name : '',
            subgroup: document.getElementById('edit-subgroup-select').value || null,
            nameId: parseInt(document.getElementById('edit-name-select').value),
            dueDate: document.getElementById('edit-dueDate').value,
            priority: document.getElementById('edit-priority-select').value,
            estimatedHours: document.getElementById('edit-estimated-hours').value ? parseInt(document.getElementById('edit-estimated-hours').value) : null,
            budget: document.getElementById('edit-budget').value ? parseFloat(document.getElementById('edit-budget').value) : null,
            weatherDependent: document.getElementById('edit-weather-dependent').checked
        };

        if (!updatedProject.description || !updatedProject.group || !updatedProject.nameId || !updatedProject.dueDate) {
            showToast('Please fill out all required fields', 'warning');
            return;
        }

        const result = await updateData(`projects/${projectId}`, updatedProject);
        if (result) {
            showToast('Project updated successfully!');
            closeEditModal();
            loadAllData();
        }
    };

    // --- Progress Modal ---
    window.openProgressModal = (projectId) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        document.getElementById('progress-project-id').value = project.id;
        const currentProgress = project.progressPercent || 0;
        
        const slider = document.getElementById('progress-slider');
        const valueDisplay = document.getElementById('progress-value');
        const progressFill = document.querySelector('.progress-fill-modal');
        
        slider.value = currentProgress;
        valueDisplay.textContent = currentProgress;
        progressFill.style.width = `${currentProgress}%`;
        
        // Add event listener for slider
        slider.oninput = function() {
            valueDisplay.textContent = this.value;
            progressFill.style.width = `${this.value}%`;
        };
        
        document.getElementById('progress-modal').style.display = 'flex';
    };

    window.closeProgressModal = () => {
        document.getElementById('progress-modal').style.display = 'none';
    };

    window.saveProgress = async () => {
        const projectId = parseInt(document.getElementById('progress-project-id').value);
        const progressPercent = parseInt(document.getElementById('progress-slider').value);
        
        const result = await updateData(`projects/${projectId}/progress`, { progressPercent });
        if (result) {
            showToast(`Progress updated to ${progressPercent}%`);
            closeProgressModal();
            loadAllData();
        }
    };

    // --- Notes Modal ---
    window.openNotesModal = async (projectId) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        document.getElementById('notes-project-id').value = project.id;
        
        // Display existing notes
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';
        
        if (project.notes && project.notes.length > 0) {
            project.notes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';
                noteElement.innerHTML = `
                    <div class="note-header">
                        <span class="note-author">${note.author}</span>
                        <span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="note-text">${note.text}</div>
                `;
                notesList.appendChild(noteElement);
            });
        } else {
            notesList.innerHTML = '<p style="text-align: center; color: #999;">No notes yet</p>';
        }
        
        document.getElementById('new-note').value = '';
        document.getElementById('notes-modal').style.display = 'flex';
    };

    window.closeNotesModal = () => {
        document.getElementById('notes-modal').style.display = 'none';
    };

    window.addNote = async () => {
        const projectId = parseInt(document.getElementById('notes-project-id').value);
        const noteText = document.getElementById('new-note').value.trim();
        
        if (!noteText) {
            showToast('Please enter a note', 'warning');
            return;
        }
        
        const result = await postData(`projects/${projectId}/notes`, { 
            text: noteText,
            author: 'Admin' // Could be dynamic based on user system
        });
        
        if (result) {
            showToast('Note added successfully!');
            loadAllData();
            // Refresh the notes modal
            closeNotesModal();
            setTimeout(() => openNotesModal(projectId), 100);
        }
    };

    // --- Main Click Handler ---
    document.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const { action, id, groupId, name } = button.dataset;
        let result, reload = true;

        switch (action) {
            case 'add-subgroup': {
                const subGroupName = prompt('Enter name for the new subgroup:');
                if (subGroupName && subGroupName.trim()) {
                    result = await postData(`groups/${groupId}/subgroups`, { name: subGroupName.trim() });
                    if (result) showToast('Subgroup added successfully!');
                }
                reload = false;
                if (result) loadAllData();
                break;
            }
            case 'edit-group': {
                const newName = prompt('Enter the new name for this group:', name);
                if (newName && newName.trim() && newName.trim() !== name) {
                    result = await updateData(`groups/${id}`, { name: newName.trim() });
                    if (result) showToast('Group name updated successfully!');
                }
                reload = false;
                if (result) loadAllData();
                break;
            }
            case 'delete-group': {
                if (confirm('Are you sure you want to delete this group and all its subgroups? This will also affect existing projects.')) {
                    result = await deleteData(`groups/${id}`);
                    if (result) showToast('Group deleted successfully!');
                } else { reload = false; }
                break;
            }
            case 'delete-subgroup': {
                if (confirm('Are you sure you want to delete this subgroup?')) {
                    result = await deleteData(`groups/${groupId}/subgroups/${id}`);
                    if (result) showToast('Subgroup deleted successfully!');
                } else { reload = false; }
                break;
            }
            case 'delete-name': {
                if (confirm('Are you sure you want to delete this team member? This will affect existing projects.')) {
                    result = await deleteData(`names/${id}`);
                    if (result) showToast('Team member deleted successfully!');
                } else { reload = false; }
                break;
            }
            case 'complete-project':
                result = await updateData(`projects/${id}/complete`);
                if (result) showToast('Project marked as complete!');
                break;
            case 'edit-project':
                openEditModal(parseInt(id));
                reload = false;
                break;
            case 'update-progress':
                openProgressModal(parseInt(id));
                reload = false;
                break;
            case 'add-note':
                openNotesModal(parseInt(id));
                reload = false;
                break;
            case 'delete-project':
                if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                    result = await deleteData(`projects/${id}`);
                    if (result) showToast('Project deleted successfully!');
                } else { reload = false; }
                break;
            case 'reopen-project':
                result = await updateData(`projects/${id}/reopen`);
                if (result) showToast('Project has been re-opened!');
                break;
        }

        if (reload && result) {
            loadAllData();
        }
    });

    // --- Event Listeners ---
    document.getElementById('group-select')?.addEventListener('change', () => handleGroupChange());
    document.getElementById('edit-group-select')?.addEventListener('change', () => handleGroupChange('edit-'));

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });

    // --- Initial Load ---
    const loadAllData = async () => {
        try {
            [allProjects, allGroups, allNames] = await Promise.all([
                fetchData('projects'),
                fetchData('groups'),
                fetchData('names')
            ]);
            
            renderDashboard();
            renderProjectTables();
            renderManageLists();
            populateDropdowns();
            implementFiltering();

            feather.replace();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading application data', 'error');
        }
    };

    // Start the application
    loadAllData();
});
