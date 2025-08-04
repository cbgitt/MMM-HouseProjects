const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const express = require("express");

module.exports = NodeHelper.create({
    start: function () {
        console.log("Starting node_helper for: " + this.name);
        this.projectFilePath = path.join(__dirname, "projects.json");
        this.groupsFilePath = path.join(__dirname, "groups.json");
        this.namesFilePath = path.join(__dirname, "names.json");

        this.ensureFileExists(this.projectFilePath, []);
        this.ensureFileExists(this.groupsFilePath, []);
        this.ensureFileExists(this.namesFilePath, []);

        this.expressApp.use(bodyParser.json());
        this.expressApp.use(bodyParser.urlencoded({ extended: true }));
        this.expressApp.use("/" + this.name, express.static(path.join(__dirname, "admin_ui")));

        this.createApiEndpoints();
    },

    createApiEndpoints: function() {
        const api = `/${this.name}/api`;
        
        // Projects endpoints
        this.expressApp.get(`${api}/projects`, (req, res) => this.readJsonFile(this.projectFilePath, res));
        this.expressApp.post(`${api}/projects`, (req, res) => this.addProject(req, res));
        this.expressApp.put(`${api}/projects/:id`, (req, res) => this.updateProject(req, res));
        this.expressApp.delete(`${api}/projects/:id`, (req, res) => this.deleteItem(this.projectFilePath, req.params.id, res, "Project"));
        this.expressApp.put(`${api}/projects/:id/complete`, (req, res) => this.completeProject(req, res));
        this.expressApp.put(`${api}/projects/:id/reopen`, (req, res) => this.reopenProject(req, res));
        this.expressApp.put(`${api}/projects/:id/progress`, (req, res) => this.updateProjectProgress(req, res));
        this.expressApp.post(`${api}/projects/:id/notes`, (req, res) => this.addProjectNote(req, res));

        // Groups & Subgroups endpoints
        this.expressApp.get(`${api}/groups`, (req, res) => this.readJsonFile(this.groupsFilePath, res));
        this.expressApp.post(`${api}/groups`, (req, res) => this.addGroup(req, res));
        this.expressApp.put(`${api}/groups/:id`, (req, res) => this.updateGroup(req, res));
        this.expressApp.delete(`${api}/groups/:id`, (req, res) => this.deleteItem(this.groupsFilePath, req.params.id, res, "Group"));
        this.expressApp.post(`${api}/groups/:id/subgroups`, (req, res) => this.addSubgroup(req, res));
        this.expressApp.delete(`${api}/groups/:groupId/subgroups/:subgroupId`, (req, res) => this.deleteSubgroup(req, res));

        // Names endpoints
        this.expressApp.get(`${api}/names`, (req, res) => this.readJsonFile(this.namesFilePath, res));
        this.expressApp.post(`${api}/names`, (req, res) => this.addItem(this.namesFilePath, req.body, res, "Name"));
        this.expressApp.delete(`${api}/names/:id`, (req, res) => this.deleteItem(this.namesFilePath, req.params.id, res, "Name"));

        // Analytics endpoints
        this.expressApp.get(`${api}/analytics/overview`, (req, res) => this.getAnalyticsOverview(req, res));
        this.expressApp.get(`${api}/analytics/trends`, (req, res) => this.getAnalyticsTrends(req, res));
    },

    // --- Enhanced Project Management ---
    addProject: function(req, res) {
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            const projects = JSON.parse(data);
            const newProject = {
                id: Date.now(),
                dateCreated: new Date().toISOString(),
                description: req.body.description,
                group: req.body.group,
                subgroup: req.body.subgroup || null,
                nameId: req.body.nameId,
                dueDate: req.body.dueDate,
                priority: req.body.priority || 'medium',
                estimatedHours: req.body.estimatedHours || null,
                actualHours: null,
                budget: req.body.budget || null,
                cost: null,
                progressPercent: 0,
                completed: false,
                completedDate: null,
                notes: [],
                tags: req.body.tags || [],
                weatherDependent: req.body.weatherDependent || false,
                season: req.body.season || 'any'
            };
            projects.push(newProject);
            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                res.status(201).json(newProject);
            });
        });
    },

    updateProject: function(req, res) {
        const projectId = parseInt(req.params.id);
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            let projects = JSON.parse(data);
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return res.status(404).json({ error: "Project not found." });

            const updatedData = {
                ...req.body,
                subgroup: req.body.subgroup || null
            };
            projects[projectIndex] = { ...projects[projectIndex], ...updatedData };

            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                res.status(200).json(projects[projectIndex]);
            });
        });
    },

    updateProjectProgress: function(req, res) {
        const projectId = parseInt(req.params.id);
        const { progressPercent } = req.body;
        
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            let projects = JSON.parse(data);
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return res.status(404).json({ error: "Project not found." });

            projects[projectIndex].progressPercent = Math.max(0, Math.min(100, progressPercent));

            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                res.status(200).json(projects[projectIndex]);
            });
        });
    },

    addProjectNote: function(req, res) {
        const projectId = parseInt(req.params.id);
        const { text, author } = req.body;
        
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            let projects = JSON.parse(data);
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return res.status(404).json({ error: "Project not found." });

            const newNote = {
                id: Date.now(),
                text,
                author: author || 'Admin',
                timestamp: new Date().toISOString()
            };

            if (!projects[projectIndex].notes) {
                projects[projectIndex].notes = [];
            }
            projects[projectIndex].notes.push(newNote);

            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                res.status(201).json(newNote);
            });
        });
    },

    completeProject: function(req, res) {
        this.toggleProjectStatus(req.params.id, true, res);
    },
    
    reopenProject: function(req, res) {
        this.toggleProjectStatus(req.params.id, false, res);
    },

    toggleProjectStatus: function(projectId, isComplete, res) {
        const id = parseInt(projectId);
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            let projects = JSON.parse(data);
            const projectIndex = projects.findIndex(p => p.id === id);
            if (projectIndex === -1) return res.status(404).json({ error: "Project not found." });
            
            projects[projectIndex].completed = isComplete;
            projects[projectIndex].completedDate = isComplete ? new Date().toISOString() : null;
            
            // Calculate actual hours if completing
            if (isComplete && projects[projectIndex].dateCreated) {
                const created = new Date(projects[projectIndex].dateCreated);
                const completed = new Date();
                const hoursDiff = Math.round((completed - created) / (1000 * 60 * 60));
                projects[projectIndex].actualHours = hoursDiff;
            }
            
            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                if (res) res.status(200).json(projects[projectIndex]);
            });
        });
    },

    // --- Group Management ---
    addGroup: function(req, res) {
        fs.readFile(this.groupsFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read groups file." });
            const groups = JSON.parse(data);
            const newGroup = { 
                id: Date.now(), 
                name: req.body.name, 
                subgroups: [],
                color: req.body.color || null,
                description: req.body.description || null
            };
            groups.push(newGroup);
            this.writeJsonFile(this.groupsFilePath, groups, () => res.status(201).json(newGroup));
        });
    },

    updateGroup: function(req, res) {
        const groupId = parseInt(req.params.id);
        const newName = req.body.name;
    
        fs.readFile(this.groupsFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read groups file." });
            let groups = JSON.parse(data);
            const groupIndex = groups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return res.status(404).json({ error: "Group not found." });
    
            const oldName = groups[groupIndex].name;
            groups[groupIndex].name = newName;
            if (req.body.color) groups[groupIndex].color = req.body.color;
            if (req.body.description) groups[groupIndex].description = req.body.description;
    
            this.writeJsonFile(this.groupsFilePath, groups, () => {
                // Update projects file to reflect group name change
                fs.readFile(this.projectFilePath, 'utf8', (projErr, projData) => {
                    if (projErr) return res.status(500).json({ error: "Failed to read projects file while updating group name." });
                    let projects = JSON.parse(projData);
                    projects.forEach(p => {
                        if (p.group === oldName) {
                            p.group = newName;
                        }
                    });
                    this.writeJsonFile(this.projectFilePath, projects, () => {
                        this.socketNotificationReceived("GET_PROJECTS");
                        res.status(200).json(groups[groupIndex]);
                    });
                });
            });
        });
    },

    addSubgroup: function(req, res) {
        const groupId = parseInt(req.params.id);
        fs.readFile(this.groupsFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read groups file." });
            let groups = JSON.parse(data);
            const groupIndex = groups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return res.status(404).json({ error: "Group not found." });

            if (!groups[groupIndex].subgroups) {
                groups[groupIndex].subgroups = [];
            }
            const newSubgroup = { 
                id: Date.now(), 
                name: req.body.name,
                description: req.body.description || null
            };
            groups[groupIndex].subgroups.push(newSubgroup);
            this.writeJsonFile(this.groupsFilePath, groups, () => res.status(201).json(newSubgroup));
        });
    },

    deleteSubgroup: function(req, res) {
        const groupId = parseInt(req.params.groupId);
        const subgroupId = parseInt(req.params.subgroupId);
        fs.readFile(this.groupsFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read groups file." });
            let groups = JSON.parse(data);
            const groupIndex = groups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return res.status(404).json({ error: "Group not found." });

            const subgroupToDelete = groups[groupIndex].subgroups.find(sg => sg.id === subgroupId);
            if (!subgroupToDelete) return res.status(404).json({ error: "Subgroup not found." });

            groups[groupIndex].subgroups = groups[groupIndex].subgroups.filter(sg => sg.id !== subgroupId);
            this.writeJsonFile(this.groupsFilePath, groups, () => res.status(200).json({ message: "Subgroup deleted." }));
        });
    },

    // --- Analytics ---
    getAnalyticsOverview: function(req, res) {
        Promise.all([
            fs.promises.readFile(this.projectFilePath, 'utf8'),
            fs.promises.readFile(this.namesFilePath, 'utf8'),
            fs.promises.readFile(this.groupsFilePath, 'utf8')
        ]).then(([projectsData, namesData, groupsData]) => {
            const projects = JSON.parse(projectsData);
            const names = JSON.parse(namesData);
            const groups = JSON.parse(groupsData);
            
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            
            const activeProjects = projects.filter(p => !p.completed);
            const completedProjects = projects.filter(p => p.completed);
            const overdueProjects = activeProjects.filter(p => new Date(p.dueDate) < now);
            
            const completedThisMonth = completedProjects.filter(p => {
                const completedDate = new Date(p.completedDate);
                return completedDate.getMonth() === thisMonth && completedDate.getFullYear() === thisYear;
            });
            
            // Calculate average completion time
            const completedWithTimes = completedProjects.filter(p => p.dateCreated && p.completedDate);
            const avgCompletionDays = completedWithTimes.length > 0 
                ? Math.round(completedWithTimes.reduce((sum, p) => {
                    const created = new Date(p.dateCreated);
                    const completed = new Date(p.completedDate);
                    return sum + (completed - created) / (1000 * 60 * 60 * 24);
                }, 0) / completedWithTimes.length)
                : 0;
            
            // Completion rate (completed on time vs total completed)
            const completedOnTime = completedProjects.filter(p => {
                const dueDate = new Date(p.dueDate);
                const completedDate = new Date(p.completedDate);
                return completedDate <= dueDate;
            });
            const completionRate = completedProjects.length > 0 
                ? Math.round((completedOnTime.length / completedProjects.length) * 100)
                : 100;
            
            // Workload by person
            const workloadByPerson = names.map(person => ({
                name: person.name,
                active: activeProjects.filter(p => p.nameId === person.id).length,
                completed: completedProjects.filter(p => p.nameId === person.id).length,
                overdue: overdueProjects.filter(p => p.nameId === person.id).length
            }));
            
            // Projects by group
            const projectsByGroup = groups.map(group => ({
                group: group.name,
                active: activeProjects.filter(p => p.group === group.name).length,
                completed: completedProjects.filter(p => p.group === group.name).length,
                total: projects.filter(p => p.group === group.name).length
            }));
            
            const overview = {
                activeProjects: activeProjects.length,
                completedProjects: completedProjects.length,
                completedThisMonth: completedThisMonth.length,
                overdueProjects: overdueProjects.length,
                avgCompletionDays,
                completionRate,
                workloadByPerson,
                projectsByGroup,
                totalNames: names.length,
                totalGroups: groups.length
            };
            
            res.status(200).json(overview);
        }).catch(err => {
            console.error('Error generating analytics overview:', err);
            res.status(500).json({ error: 'Failed to generate analytics overview.' });
        });
    },

    getAnalyticsTrends: function(req, res) {
        fs.readFile(this.projectFilePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: "Failed to read projects file." });
            const projects = JSON.parse(data);
            
            // Generate 6-month trend data
            const trends = [];
            const now = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                
                const completed = projects.filter(p => {
                    if (!p.completed || !p.completedDate) return false;
                    const completedDate = new Date(p.completedDate);
                    return completedDate.getMonth() === date.getMonth() && 
                           completedDate.getFullYear() === date.getFullYear();
                }).length;
                
                const created = projects.filter(p => {
                    if (!p.dateCreated) return false;
                    const createdDate = new Date(p.dateCreated);
                    return createdDate.getMonth() === date.getMonth() && 
                           createdDate.getFullYear() === date.getFullYear();
                }).length;
                
                trends.push({ month: monthName, completed, created });
            }
            
            res.status(200).json({ trends });
        });
    },

    // --- Utility Functions ---
    addItem: function(filePath, itemData, res, itemType) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: `Failed to read ${itemType}s file.` });
            const items = JSON.parse(data);
            const newItem = { 
                id: Date.now(), 
                name: itemData.name,
                dateCreated: new Date().toISOString()
            };
            items.push(newItem);
            this.writeJsonFile(filePath, items, () => res.status(201).json(newItem));
        });
    },

    deleteItem: function(filePath, itemId, res, itemType) {
        const id = parseInt(itemId);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: `Failed to read ${itemType}s file.` });
            let items = JSON.parse(data);
            const initialLength = items.length;
            items = items.filter(item => item.id !== id);
            if (items.length === initialLength) return res.status(404).json({ error: `${itemType} not found.` });
            
            this.writeJsonFile(filePath, items, () => {
                if (itemType === "Project") this.socketNotificationReceived("GET_PROJECTS");
                res.status(200).json({ message: `${itemType} deleted successfully.` })
            });
        });
    },

    ensureFileExists: function(filePath, defaultContent) {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
        }
    },

    readJsonFile: function (filePath, res) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: `Error reading ${path.basename(filePath)}.` });
            res.status(200).json(JSON.parse(data));
        });
    },

    writeJsonFile: function (filePath, data, successCallback) {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) console.error(`[MMM-HouseProjects] Error writing to ${path.basename(filePath)}:`, err);
            if (successCallback) successCallback();
        });
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "GET_PROJECTS") {
            Promise.all([
                fs.promises.readFile(this.projectFilePath, 'utf8'),
                fs.promises.readFile(this.namesFilePath, 'utf8')
            ]).then(([projectsData, namesData]) => {
                this.sendSocketNotification("PROJECTS_UPDATED", {
                    projects: JSON.parse(projectsData),
                    names: JSON.parse(namesData)
                });
            }).catch(err => console.error(`[MMM-HouseProjects] Error reading data files:`, err));
        }
        
        if (notification === "COMPLETE_PROJECT") {
            this.toggleProjectStatus(payload, true);
        }
    }
});
