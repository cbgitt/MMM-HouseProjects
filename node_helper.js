const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

module.exports = NodeHelper.create({
	start: function () {
		console.log("Starting node_helper for: " + this.name);
		this.projectFilePath = path.join(__dirname, "projects.json");
		this.groupsFilePath = path.join(__dirname, "groups.json");
		this.namesFilePath = path.join(__dirname, "names.json");

		// Ensure JSON files exist
		this.ensureFileExists(this.projectFilePath, []);
		this.ensureFileExists(this.groupsFilePath, []);
		this.ensureFileExists(this.namesFilePath, []);

		this.expressApp.use(bodyParser.json());
		this.expressApp.use(bodyParser.urlencoded({ extended: true }));

		// Serve admin UI
		this.expressApp.use("/" + this.name, this.expressApp.static(path.join(__dirname, "admin_ui")));

		// --- API Endpoints ---
		this.createApiEndpoints();
	},

	createApiEndpoints: function() {
		// Projects
		this.expressApp.get(`/${this.name}/api/projects`, (req, res) => this.readJsonFile(this.projectFilePath, res));
		this.expressApp.post(`/${this.name}/api/projects`, (req, res) => this.addProject(req, res));
		this.expressApp.put(`/${this.name}/api/projects/:id/complete`, (req, res) => this.completeProject(req, res));

		// Groups
		this.expressApp.get(`/${this.name}/api/groups`, (req, res) => this.readJsonFile(this.groupsFilePath, res));
		this.expressApp.post(`/${this.name}/api/groups`, (req, res) => this.addItem(this.groupsFilePath, req.body, res, "Group"));
		this.expressApp.delete(`/${this.name}/api/groups/:id`, (req, res) => this.deleteItem(this.groupsFilePath, req.params.id, res, "Group"));

		// Names
		this.expressApp.get(`/${this.name}/api/names`, (req, res) => this.readJsonFile(this.namesFilePath, res));
		this.expressApp.post(`/${this.name}/api/names`, (req, res) => this.addItem(this.namesFilePath, req.body, res, "Name"));
		this.expressApp.delete(`/${this.name}/api/names/:id`, (req, res) => this.deleteItem(this.namesFilePath, req.params.id, res, "Name"));
	},

	// --- API Logic ---
	addProject: function(req, res) {
		fs.readFile(this.projectFilePath, (err, data) => {
			if (err) return res.status(500).json({ error: "Failed to read projects file." });
			const projects = JSON.parse(data);
			const newProject = {
				id: Date.now(),
				dateCreated: new Date().toISOString(),
				description: req.body.description,
				group: req.body.group,
				nameId: req.body.nameId,
				dueDate: req.body.dueDate,
				completed: false
			};
			projects.push(newProject);
			this.writeJsonFile(this.projectFilePath, projects, () => {
				this.sendSocketNotification("PROJECTS_UPDATED", projects);
				res.status(201).json(newProject);
			}, res);
		});
	},

	completeProject: function(req, res) {
		const projectId = parseInt(req.params.id);
		fs.readFile(this.projectFilePath, (err, data) => {
			if (err) return res.status(500).json({ error: "Failed to read projects file." });
			let projects = JSON.parse(data);
			const projectIndex = projects.findIndex(p => p.id === projectId);
			if (projectIndex === -1) return res.status(404).json({ error: "Project not found." });
			
			projects[projectIndex].completed = true;
			projects[projectIndex].completedDate = new Date().toISOString();
			
			this.writeJsonFile(this.projectFilePath, projects, () => {
				this.sendSocketNotification("PROJECTS_UPDATED", projects);
				res.status(200).json(projects[projectIndex]);
			}, res);
		});
	},

	addItem: function(filePath, itemData, res, itemType) {
		fs.readFile(filePath, (err, data) => {
			if (err) return res.status(500).json({ error: `Failed to read ${itemType}s file.` });
			const items = JSON.parse(data);
			const newItem = { id: Date.now(), name: itemData.name };
			items.push(newItem);
			this.writeJsonFile(filePath, items, () => res.status(201).json(newItem), res);
		});
	},

	deleteItem: function(filePath, itemId, res, itemType) {
		const id = parseInt(itemId);
		fs.readFile(filePath, (err, data) => {
			if (err) return res.status(500).json({ error: `Failed to read ${itemType}s file.` });
			let items = JSON.parse(data);
			const newItems = items.filter(item => item.id !== id);
			if (items.length === newItems.length) return res.status(404).json({ error: `${itemType} not found.` });
			
			this.writeJsonFile(filePath, newItems, () => res.status(200).json({ message: `${itemType} deleted successfully.` }), res);
		});
	},

	// --- Helper Functions ---
	ensureFileExists: function(filePath, defaultContent) {
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
		}
	},

	readJsonFile: function (filePath, res) {
		fs.readFile(filePath, (err, data) => {
			if (err) {
				if (res) res.status(500).json({ error: `Error reading ${path.basename(filePath)}.` });
				return;
			}
			if (res) res.status(200).json(JSON.parse(data));
		});
	},

	writeJsonFile: function (filePath, data, successCallback, res) {
		fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
			if (err) {
				if (res) res.status(500).json({ error: `Error writing to ${path.basename(filePath)}.` });
				return;
			}
			if (successCallback) successCallback();
		});
	},

	// --- Socket Notifications ---
	socketNotificationReceived: function (notification, payload) {
		if (notification === "GET_PROJECTS") {
			fs.readFile(this.projectFilePath, (err, data) => {
				if (!err) {
					this.sendSocketNotification("PROJECTS_UPDATED", JSON.parse(data));
				}
			});
		}
	}
});
