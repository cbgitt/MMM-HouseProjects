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
                        <button class="action-button" data-id="${project.id}" title="Re-open"><i data-feather="rotate-ccw"></i></button>
                        <button class="action-button" data-id="${project.id}" title="Edit"><i data-feather="edit-2"></i></button>
                        <button class="action-button delete" data-id="${project.id}" title="Delete"><i data-feather="trash-2"></i></button>
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
                        <button class="action-button complete" data-id="${project.id}" title="Complete"><i data-feather="check"></i></button>
                        <button class="action-button" data-id="${project.id}" title="Edit"><i data-feather="edit-2"></i></button>
                        <button class="action-button delete" data-id="${project.id}" title="Delete"><i data-feather="trash-2"></i></button>
                    </td>
                `;
            }
        });
        feather.replace();
    };

    const renderManageLists = () => {
        const groupList = document.getElementById('group-list');
        groupList.innerHTML = '';
        allGroups.forEach(group => {
            const groupLi = document.createElement('li');
            groupLi.className = 'group-item';
            groupLi.innerHTML = `
                <span>${group.name}</span>
                <div>
                    <button class="add-subgroup-btn" data-group-id="${group.id}">+ Subgroup</button>
                    <button class="delete-btn" data-type="groups" data-id="${group.id}"><i data-feather="x-circle"></i></button>
                </div>
            `;
            const subgroupUl = document.createElement('ul');
            subgroupUl.className = 'subgroup-list';
            (group.subgroups || []).forEach(subgroup => {
                subgroupUl.innerHTML += `
                    <li class="subgroup-item">
                        <span>${subgroup.name}</span>
                        <button class="delete-btn" data-type="subgroups" data-group-id="${group.id}" data-id="${subgroup.id}"><i data-feather="x-circle"></i></button>
                    </li>
                `;
            });
            groupLi.appendChild(subgroupUl);
            groupList.appendChild(groupLi);
        });

        const nameList = document.getElementById('name-list');
        nameList.innerHTML = '';
        allNames.forEach(n => nameList.innerHTML += `<li>${n.name}<button class="delete-btn" data-type="names" data-id="${n.id}"><i data-feather="x-circle"></i></button></li>`);
        feather.replace();
    };

    const populateDropdowns = (groups, names, elementPrefix = '') => {
        const groupSelect = document.getElementById(`${elementPrefix}group-select`);
        const nameSelect = document.getElementById(`${elementPrefix}name-select`);
        groupSelect.innerHTML = '<option value="">Select Group</option>';
        nameSelect.innerHTML = '<option value="">Select Name</option>';
        
        groups.forEach(group => {
            if (!group.subgroups || group.subgroups.length === 0) {
                const option = document.createElement('option');
                option.value = group.name;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            } else {
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.name;
                 group.subgroups.forEach(subgroup => {
                    const option = document.createElement('option');
                    option.value = `${group.name}:${subgroup.name}`;
                    option.textContent = subgroup.name;
                    optgroup.appendChild(option);
                });
                groupSelect.appendChild(optgroup);
            }
        });

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
    
    // --- Modal Logic ---
    window.openEditModal = (projectId) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-description').value = project.description;
        document.getElementById('edit-dueDate').value = project.dueDate.split('T')[0];
        
        populateDropdowns(allGroups, allNames, 'edit-');
        const groupValue = project.subgroup ? `${project.group}:${project.subgroup}` : project.group;
        document.getElementById('edit-group-select').value = groupValue;
        document.getElementById('edit-name-select').value = project.nameId;
        
        document.getElementById('edit-modal').style.display = 'flex';
    };

    window.closeEditModal = () => {
        document.getElementById('edit-modal').style.display = 'none';
    };

    window.saveProjectChanges = async () => {
        const projectId = parseInt(document.getElementById('edit-project-id').value);
        const updatedProject = {
            description: document.getElementById('edit-description').value.trim(),
            group: document.getElementById('edit-group-select').value,
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
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('add-subgroup-btn')) {
            const groupId = button.dataset.groupId;
            const subGroupName = prompt('Enter name for the new subgroup:');
            if (subGroupName && subGroupName.trim()) {
                const result = await postData(`groups/${groupId}/subgroups`, { name: subGroupName.trim() });
                if (result) {
                    showToast('Subgroup added!');
                    loadAllData();
                }
            }
            return;
        }

        if (button.classList.contains('delete-btn')) {
            const { type, id, groupId } = button.dataset;
            let endpoint = type === 'subgroups' ? `groups/${groupId}/subgroups/${id}` : `groups/${id}`;
            if (type === 'names') endpoint = `names/${id}`;

            if (confirm(`Are you sure you want to delete this item?`)) {
                const result = await deleteData(endpoint);
                if (result) {
                    showToast('Item deleted!');
                    loadAllData();
                }
            }
            return;
        }

        const actionBtn = button.closest('.action-button');
        if (actionBtn) {
            const id = parseInt(actionBtn.dataset.id);
            let reload = true;

            if (actionBtn.title === 'Complete') {
                const result = await updateData(`projects/${id}/complete`);
                if (result) showToast('Project marked as complete!');
            } else if (actionBtn.title === 'Edit') {
                openEditModal(id);
                reload = false;
            } else if (actionBtn.title === 'Delete') {
                if (confirm('Are you sure you want to delete this project?')) {
                    const result = await deleteData(`projects/${id}`);
                    if (result) showToast('Project deleted!');
                } else {
                    reload = false;
                }
            } else if (actionBtn.title === 'Re-open') {
                const result = await updateData(`projects/${id}/reopen`);
                if (result) showToast('Project has been re-opened!');
            }
            
            if (reload) loadAllData();
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
        populateDropdowns(allGroups, allNames);
        feather.replace();
    };

    loadAllData();
});
