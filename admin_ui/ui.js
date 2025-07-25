document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = `/MMM-HouseProjects/api`;
    let projectsChart = null;
    let allProjects = [], allGroups = [], allNames = [];

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
            showToast(`Error: Could not update item.`);
            return null;
        }
    };

    // --- Rendering ---
    const renderDashboard = () => {
        const completedThisMonth = allProjects.filter(p => p.completed && new Date(p.completedDate).getMonth() === new Date().getMonth()).length;
        document.getElementById('activeProjects').textContent = allProjects.filter(p => !p.completed).length;
        document.getElementById('completedProjects').textContent = completedThisMonth;
        document.getElementById('totalNames').textContent = allNames.length;
    };
    
    const renderGroupChart = () => {
        const ctx = document.getElementById('projectsByGroupChart').getContext('2d');
        const labels = allGroups.map(g => g.name);
        const data = allGroups.map(group => allProjects.filter(p => p.group === group.name && !p.completed).length);

        if (projectsChart) projectsChart.destroy();
        
        projectsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
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

    const renderProjectTables = () => {
        const activeBody = document.getElementById('activeProjectsTable').getElementsByTagName('tbody')[0];
        const completedBody = document.getElementById('completedProjectsTable').getElementsByTagName('tbody')[0];
        activeBody.innerHTML = '';
        completedBody.innerHTML = '';

        allProjects.forEach(project => {
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

                row.innerHTML = `
                    <td>${project.description}</td>
                    <td>${groupDisplay}</td>
                    <td>${assignedName}</td>
                    <td>${createdDate.toLocaleDateString()}</td>
                    <td>${completedDate.toLocaleString()}</td>
                    <td class="${colorClass}">${daysToComplete} day(s)</td>
                    <td class="action-buttons">
                        <button class="action-button" data-action="reopen-project" data-id="${project.id}" title="Re-open"><i data-feather="rotate-ccw"></i></button>
                        <button class="action-button" data-action="edit-project" data-id="${project.id}" title="Edit"><i data-feather="edit-2"></i></button>
                        <button class="action-button delete" data-action="delete-project" data-id="${project.id}" title="Delete"><i data-feather="trash-2"></i></button>
                    </td>
                `;
            } else {
                const row = activeBody.insertRow();
                row.innerHTML = `
                    <td>${project.description}</td>
                    <td>${groupDisplay}</td>
                    <td>${assignedName}</td>
                    <td>${new Date(project.dateCreated).toLocaleDateString()}</td>
                    <td>${new Date(project.dueDate).toLocaleDateString()}</td>
                    <td class="action-buttons">
                        <button class="action-button complete" data-action="complete-project" data-id="${project.id}" title="Complete"><i data-feather="check"></i></button>
                        <button class="action-button" data-action="edit-project" data-id="${project.id}" title="Edit"><i data-feather="edit-2"></i></button>
                        <button class="action-button delete" data-action="delete-project" data-id="${project.id}" title="Delete"><i data-feather="trash-2"></i></button>
                    </td>
                `;
            }
        });
        feather.replace();
    };

    const renderManageLists = () => {
        const groupTableBody = document.getElementById('group-list-body');
        groupTableBody.innerHTML = '';
        allGroups.forEach(group => {
            const row = groupTableBody.insertRow();
            
            row.insertCell(0).innerHTML = `
                <div class="action-buttons">
                    <span class="group-name">${group.name}</span>
                    <button class="action-button" data-action="edit-group" data-id="${group.id}" data-name="${group.name}" title="Edit Group Name"><i data-feather="edit-2"></i></button>
                    <button class="action-button delete" data-action="delete-group" data-id="${group.id}" title="Delete Group"><i data-feather="trash-2"></i></button>
                </div>
            `;

            const subgroupsCell = row.insertCell(1);
            const addSubgroupBtn = document.createElement('button');
            addSubgroupBtn.className = 'add-subgroup-btn';
            addSubgroupBtn.dataset.action = 'add-subgroup';
            addSubgroupBtn.dataset.groupId = group.id;
            addSubgroupBtn.innerHTML = '+ Add Subgroup';
            subgroupsCell.appendChild(addSubgroupBtn);
            
            (group.subgroups || []).forEach(subgroup => {
                const item = document.createElement('div');
                item.className = 'subgroup-management-item';
                item.innerHTML = `
                    <span>${subgroup.name}</span>
                    <button class="action-button delete" data-action="delete-subgroup" data-group-id="${group.id}" data-id="${subgroup.id}" title="Delete Subgroup"><i data-feather="x"></i></button>
                `;
                subgroupsCell.appendChild(item);
            });
        });

        const nameList = document.getElementById('name-list');
        nameList.innerHTML = '';
        allNames.forEach(n => nameList.innerHTML += `<li>${n.name}<button class="action-button delete" data-action="delete-name" data-id="${n.id}"><i data-feather="trash-2"></i></button></li>`);
        feather.replace();
    };

    const populateGroupDropdown = (prefix = '') => {
        const groupSelect = document.getElementById(`${prefix}group-select`);
        groupSelect.innerHTML = '<option value="">Select Group</option>';
        allGroups.forEach(group => {
            groupSelect.innerHTML += `<option value="${group.id}">${group.name}</option>`;
        });
    };

    const handleGroupChange = (prefix = '') => {
        const groupSelect = document.getElementById(`${prefix}group-select`);
        const subgroupSelect = document.getElementById(`${prefix}subgroup-select`);
        const selectedGroupId = parseInt(groupSelect.value);
        const selectedGroup = allGroups.find(g => g.id === selectedGroupId);

        subgroupSelect.innerHTML = '<option value="">Select Subgroup</option>';
        if (selectedGroup && selectedGroup.subgroups && selectedGroup.subgroups.length > 0) {
            selectedGroup.subgroups.forEach(sg => {
                subgroupSelect.innerHTML += `<option value="${sg.name}">${sg.name}</option>`;
            });
            subgroupSelect.style.display = 'block';
        } else {
            subgroupSelect.style.display = 'none';
        }
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
        const groupSelect = document.getElementById('group-select');
        const selectedGroup = allGroups.find(g => g.id === parseInt(groupSelect.value));
        const project = {
            description: document.getElementById('description').value.trim(),
            group: selectedGroup ? selectedGroup.name : '',
            subgroup: document.getElementById('subgroup-select').value,
            nameId: parseInt(document.getElementById('name-select').value),
            dueDate: document.getElementById('dueDate').value
        };
        if (!project.description || !project.group || !project.nameId || !project.dueDate) {
            return showToast('Please fill out all project fields.');
        }
        const result = await postData('projects', project);
        if (result) {
            showToast('Project created!');
            ['description', 'group-select', 'subgroup-select', 'name-select', 'dueDate'].forEach(id => document.getElementById(id).value = '');
            handleGroupChange();
            loadAllData();
        }
    };
    
    // --- Modal Logic ---
    window.openEditModal = (projectId) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-description').value = project.description;
        document.getElementById('edit-dueDate').value = project.dueDate.split('T')[0];
        
        populateGroupDropdown('edit-');
        const group = allGroups.find(g => g.name === project.group);
        if (group) {
            document.getElementById('edit-group-select').value = group.id;
            handleGroupChange('edit-'); // Populate subgroups
            if (project.subgroup) {
                document.getElementById('edit-subgroup-select').value = project.subgroup;
            }
        }
        
        const nameSelect = document.getElementById('edit-name-select');
        nameSelect.innerHTML = '<option value="">Select Name</option>';
        allNames.forEach(n => nameSelect.innerHTML += `<option value="${n.id}">${n.name}</option>`);
        nameSelect.value = project.nameId;
        
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
            subgroup: document.getElementById('edit-subgroup-select').value,
            nameId: parseInt(document.getElementById('edit-name-select').value),
            dueDate: document.getElementById('edit-dueDate').value
        };

        if (!updatedProject.description || !updatedProject.group || !updatedProject.nameId || !updatedProject.dueDate) {
            return showToast('Please fill out all fields.');
        }

        const result = await updateData(`projects/${projectId}`, updatedProject);
        if (result) {
            showToast('Project updated!');
            closeEditModal();
            loadAllData();
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
                    if (result) showToast('Subgroup added!');
                }
                reload = false;
                if (result) loadAllData();
                break;
            }
            case 'edit-group': {
                const newName = prompt('Enter the new name for this group:', name);
                if (newName && newName.trim() && newName.trim() !== name) {
                    result = await updateData(`groups/${id}`, { name: newName.trim() });
                    if (result) showToast('Group name updated!');
                }
                reload = false;
                if (result) loadAllData();
                break;
            }
            case 'delete-group': {
                 if (confirm('Are you sure you want to delete this group and all its subgroups?')) {
                    result = await deleteData(`groups/${id}`);
                    if (result) showToast('Group deleted!');
                } else { reload = false; }
                break;
            }
            case 'delete-subgroup': {
                if (confirm('Are you sure you want to delete this subgroup?')) {
                    result = await deleteData(`groups/${groupId}/subgroups/${id}`);
                    if (result) showToast('Subgroup deleted!');
                } else { reload = false; }
                break;
            }
             case 'delete-name': {
                if (confirm('Are you sure you want to delete this name?')) {
                    result = await deleteData(`names/${id}`);
                    if (result) showToast('Name deleted!');
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
            case 'delete-project':
                if (confirm('Are you sure you want to delete this project?')) {
                    result = await deleteData(`projects/${id}`);
                    if (result) showToast('Project deleted!');
                } else { reload = false; }
                break;
            case 'reopen-project':
                result = await updateData(`projects/${id}/reopen`);
                if (result) showToast('Project has been re-opened!');
                break;
        }

        if (reload) {
            loadAllData();
        }
    });

    // --- Initial Load ---
    const loadAllData = async () => {
        [allProjects, allGroups, allNames] = await Promise.all([
            fetchData('projects'),
            fetchData('groups'),
            fetchData('names')
        ]);
        
        renderDashboard();
        renderGroupChart();
        renderProjectTables();
        renderManageLists();
        
        populateGroupDropdown();
        const nameSelect = document.getElementById('name-select');
        nameSelect.innerHTML = '<option value="">Select Name</option>';
        allNames.forEach(n => nameSelect.innerHTML += `<option value="${n.id}">${n.name}</option>`);
        
        document.getElementById('group-select').addEventListener('change', () => handleGroupChange());
        document.getElementById('edit-group-select').addEventListener('change', () => handleGroupChange('edit-'));

        feather.replace();
    };

    loadAllData();
});
