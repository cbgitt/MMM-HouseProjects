/* global Module, Log, moment */

Module.register("MMM-HouseProjects", {
	defaults: {
		// updateInterval is no longer used for polling but can be kept for legacy purposes.
		// The module now updates based on push notifications from the helper.
		updateInterval: 60000,
		fadeSpeed: 2000,
		title: "House Projects"
	},

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required styles.
	getStyles: function () {
		return ["MMM-HouseProjects.css"];
	},

	// Define start sequence.
	start: function () {
		Log.info("Starting module: " + this.name);
		this.projects = [];
		this.names = [];
		this.loaded = false;
		// Request initial data from the helper upon startup
		this.getProjects();
	},

	// Override dom generator.
	getDom: function () {
		const wrapper = document.createElement("div");

		if (!this.loaded) {
			wrapper.innerHTML = "Loading...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		const header = document.createElement("header");
		header.innerHTML = this.config.title;
		wrapper.appendChild(header);

		const table = document.createElement("table");
		table.className = "small";

		const tableHeader = table.insertRow();
		const headers = ["Description", "Group", "Assigned To", "Due Date", "Days Left", "Done"];
		headers.forEach(h => {
			const th = document.createElement("th");
			th.innerHTML = h;
			tableHeader.appendChild(th);
		});
        
        const activeProjects = this.projects.filter(p => !p.completed);

        if (activeProjects.length === 0) {
            const noProjectsRow = table.insertRow();
            const cell = noProjectsRow.insertCell();
            cell.colSpan = headers.length;
            cell.innerHTML = "No active projects!";
            cell.className = "dimmed light small";
        } else {
            activeProjects.forEach(project => {
                const row = table.insertRow();
                
                const assignedName = this.names.find(n => n.id === project.nameId)?.name || 'N/A';
                const dueDate = moment(project.dueDate);
                const daysRemaining = dueDate.diff(moment(), "days");
                
                const groupDisplay = project.subgroup ? `${project.group}:${project.subgroup}` : project.group;

                row.insertCell().innerHTML = project.description;
                row.insertCell().innerHTML = groupDisplay;
                row.insertCell().innerHTML = assignedName;
                row.insertCell().innerHTML = dueDate.format("MMM Do");
                row.insertCell().innerHTML = daysRemaining;
                
                const completedCell = row.insertCell();
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.dataset.id = project.id;
                checkbox.addEventListener("click", (e) => {
                    this.sendSocketNotification("COMPLETE_PROJECT", parseInt(e.target.dataset.id));
                });
                completedCell.appendChild(checkbox);
            });
        }

		wrapper.appendChild(table);
		return wrapper;
	},

	// Function to request data from the node_helper
	getProjects: function () {
		this.sendSocketNotification("GET_PROJECTS");
	},

	// This function is called only when the node_helper sends an update
	socketNotificationReceived: function (notification, payload) {
		if (notification === "PROJECTS_UPDATED") {
			this.projects = payload.projects;
            this.names = payload.names;
			this.loaded = true;
			this.updateDom(this.config.fadeSpeed);
		}
	}
});
