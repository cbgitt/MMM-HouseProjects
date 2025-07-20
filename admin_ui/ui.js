document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = `/MMM-HouseProjects/api`;
    let projectsChart = null;

    // --- Navigation ---
    window.showPage = (pageId) => {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
        document.querySelector(`.sidebar nav li[onclick="showPage('${pageId}')"]`).classList.add('active');
    };

    // --- Toast Notifications ---
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // --- API Calls ---
    const fetchData = async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            showToast(`Error: Could not load ${endpoint}.`);
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
            showToast(`Error: Could not save data.`);
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
            showToast(`Error: Could not delete item.`);
            return null;
        }
    };

    const updateData = async (endpoint) => {
         try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, { method: 'PUT' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to update ${endpoint}:`, error);
            showToast(`Error: Could not update item.`);
            return null;
        }
    };


    // --- Rendering ---
    const renderDashboard = (projects, names) => {
        const completedThisMonth = projects.filter(p => p.completed && new Date(p.completedDate).getMonth() === new Date().getMonth()).length;
        document.getElementById('activeProjects').textContent = projects.filter(p => !p.completed).length;
        document.getElementById('completedProjects').textContent = completedThisMonth;
        document.getElementById('totalNames').textContent = names.length;
    };
    
    const renderGroupChart = (projects, groups) => {
        const ctx = document.getElementById('projectsByGroupChart').getContext('2d');
        const groupCounts = groups.map(group => projects.filter(p => p.group === group.name && !p.completed).length);

        if (projectsChart) projectsChart.destroy();
        
        projectsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: groups.map(g => g.name),
                datasets: [{
                    data: groupCounts,
                    backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623', '#bd10e0', '#7ed321', '#9013fe'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    };

    const renderProjectTable = (projects, names) => {
        const tableBody = document.getElementById('activeProjectsTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        projects.filter(p => !p.completed).forEach(project => {
            const assignedName = names.find(n => n.id === project.nameId)?.name || 'N/A';
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${project.description}</td>
                <td>${project.group}</td>
                <td>${assignedName}</td>
                <td>${new Date(project.dueDate).toLocaleDateString()}</td>
                <td><button class="action-button" data-id="${project.id}">Complete</button></td>
            `;
        });
    };

    const renderManageLists = (groups, names) => {
        const groupList = document.getElementById('group-list');
        const nameList = document.getElementById('name-list');
        groupList.innerHTML = '';
        nameList.innerHTML = '';
        groups.forEach(g => groupList.innerHTML += `<li>${g.name}<button class="delete-btn" data-type="groups" data-id="${g.id}"><i data-feather="x-circle"></i></button></li>`);
        names.forEach(n => nameList.innerHTML += `<li>${n.name}<button class="delete-btn" data-type="names" data-id="${n.id}"><i data-feather="x-circle"></i></button></li>`);
        feather.replace();
    };

    const populateDropdowns = (groups, names) => {
        const groupSelect = document.getElementById('group-select');
        const nameSelect = document.getElementById('name-select');
        groupSelect.innerHTML = '<option value="">Select Group</option>';
        nameSelect.innerHTML = '<option value="">Select Name</option>';
        groups.forEach(g => groupSelect.innerHTML += `<option value="${g.name}">${g.name}</option>`);
        names.forEach(n => nameSelect.innerHTML += `<option value="${n.id}">${n.name}</option>`);
    };

    // --- Event Handlers ---
    window.addGroup = async () => {
        const name = document.getElementById('newGroupName').value.trim();
        if (!name) return;
        const result = await postData('groups', { name });
        if (result) {
            showToast('Group added!');
            document.getElementById('newGroupName').value = '';
            loadAllData();
        }
    };

    window.addName = async () => {
        const name = document.getElementById('newName').value.trim();
        if (!name) return;
        const result = await postData('names', { name });
        if (result) {
            showToast('Name added!');
            document.getElementById('newName').value = '';
            loadAllData();
        }
    };

    window.addProject = async () => {
        const project = {
            description: document.getElementById('description').value.trim(),
            group: document.getElementById('group-select').value,
            nameId: parseInt(document.getElementById('name-select').value),
            dueDate: document.getElementById('dueDate').value
        };
        if (!project.description || !project.group || !project.nameId || !project.dueDate) {
            return showToast('Please fill out all project fields.');
        }
        const result = await postData('projects', project);
        if (result) {
            showToast('Project created!');
            ['description', 'group-select', 'name-select', 'dueDate'].forEach(id => document.getElementById(id).value = '');
            loadAllData();
        }
    };
    
    document.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        const completeBtn = e.target.closest('.action-button');

        if (deleteBtn) {
            const { type, id } = deleteBtn.dataset;
            if (confirm(`Are you sure you want to delete this item?`)) {
                const result = await deleteData(`${type}/${id}`);
                if (result) {
                    showToast('Item deleted!');
                    loadAllData();
                }
            }
        }
        
        if (completeBtn) {
            const { id } = completeBtn.dataset;
            const result = await updateData(`projects/${id}/complete`);
            if (result) {
                showToast('Project marked as complete!');
                loadAllData();
            }
        }
    });

    // --- Initial Load ---
    const loadAllData = async () => {
        const [projects, groups, names] = await Promise.all([
            fetchData('projects'),
            fetchData('groups'),
            fetchData('names')
        ]);
        
        renderDashboard(projects, names);
        renderGroupChart(projects, groups);
        renderProjectTable(projects, names);
        renderManageLists(groups, names);
        populateDropdowns(groups, names);
        feather.replace();
    };

    loadAllData();
});
