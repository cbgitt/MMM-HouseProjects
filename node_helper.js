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
		// Projects
		this.expressApp.get(`${api}/projects`, (req, res) => this.readJsonFile(this.projectFilePath, res));
		this.expressApp.post(`${api}/projects`, (req, res) => this.addProject(req, res));
		this.expressApp.put(`${api}/projects/:id`, (req, res) => this.updateProject(req, res));
		this.expressApp.delete(`${api}/projects/:id`, (req, res) => this.deleteItem(this.projectFilePath, req.params.id, res, "Project"));
		this.expressApp.put(`${api}/projects/:id/complete`, (req, res) => this.completeProject(req, res));
		this.expressApp.put(`${api}/projects/:id/reopen`, (req, res) => this.reopenProject(req, res));

		// Groups & Subgroups
		this.expressApp.get(`${api}/groups`, (req, res) => this.readJsonFile(this.groupsFilePath, res));
		this.expressApp.post(`${api}/groups`, (req, res) => this.addGroup(req, res));
		this.expressApp.put(`${api}/groups/:id`, (req, res) => this.updateGroup(req, res)); // New Endpoint
		this.expressApp.delete(`${api}/groups/:id`, (req, res) => this.deleteItem(this.groupsFilePath, req.params.id, res, "Group"));
		this.expressApp.post(`${api}/groups/:id/subgroups`, (req, res) => this.addSubgroup(req, res));
		this.expressApp.delete(`${api}/groups/:groupId/subgroups/:subgroupId`, (req, res) => this.deleteSubgroup(req, res));

		// Names
		this.expressApp.get(`${api}/names`, (req, res) => this.readJsonFile(this.namesFilePath, res));
		this.expressApp.post(`${api}/names`, (req, res) => this.addItem(this.namesFilePath, req.body, res, "Name"));
		this.expressApp.delete(`${api}/names/:id`, (req, res) => this.deleteItem(this.namesFilePath, req.params.id, res, "Name"));
	},

	// --- API Logic ---
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
				completed: false,
                completedDate: null
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
            
            this.writeJsonFile(this.projectFilePath, projects, () => {
                this.socketNotificationReceived("GET_PROJECTS");
                if (res) res.status(200).json(projects[projectIndex]);
            });
        });
	},

	addGroup: function(req, res) {
		fs.readFile(this.groupsFilePath, 'utf8', (err, data) => {
			if (err) return res.status(500).json({ error: "Failed to read groups file." });
			const groups = JSON.parse(data);
			const newGroup = { id: Date.now(), name: req.body.name, subgroups: [] };
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
	
			this.writeJsonFile(this.groupsFilePath, groups, () => {
				// Now update projects file
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
			const newSubgroup = { id: Date.now(), name: req.body.name };
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

			groups[groupIndex].subgroups = groups[groupIndex].subgroups.filter(sg => sg.id !== subgroupId);
			this.writeJsonFile(this.groupsFilePath, groups, () => res.status(200).json({ message: "Subgroup deleted." }));
		});
	},

	addItem: function(filePath, itemData, res, itemType) {
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) return res.status(500).json({ error: `Failed to read ${itemType}s file.` });
			const items = JSON.parse(data);
			const newItem = { id: Date.now(), name: itemData.name };
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
