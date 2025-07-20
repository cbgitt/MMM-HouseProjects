/* global Module, Log, moment */

/* Magic Mirror
 * Module: MMM-HouseProjects
 *
 * By [Your Name]
 * MIT Licensed.
 */

Module.register("MMM-HouseProjects", {
	defaults: {
		updateInterval: 60000,
		remoteFile: "projects.json",
		fadeSpeed: 4000,
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
		this.loaded = false;

		// Fetch data on initial load
		this.getProjects();

		// Schedule subsequent updates
		this.scheduleUpdate();
	},

	// Override dom generator.
	getDom: function () {
		var wrapper = document.createElement("div");

		if (!this.loaded) {
			wrapper.innerHTML = "Loading...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className = "small";

		var header = document.createElement("header");
		header.innerHTML = this.config.title;
		wrapper.appendChild(header);

		var tableHeader = document.createElement("tr");

		var descriptionHeader = document.createElement("th");
		descriptionHeader.innerHTML = "Description";
		tableHeader.appendChild(descriptionHeader);

		var groupHeader = document.createElement("th");
		groupHeader.innerHTML = "Group";
		tableHeader.appendChild(groupHeader);

		var dueDateHeader = document.createElement("th");
		dueDateHeader.innerHTML = "Due Date";
		tableHeader.appendChild(dueDateHeader);

		var daysRemainingHeader = document.createElement("th");
		daysRemainingHeader.innerHTML = "Days Remaining";
		tableHeader.appendChild(daysRemainingHeader);

		var completedHeader = document.createElement("th");
		completedHeader.innerHTML = "Completed";
		tableHeader.appendChild(completedHeader);

		table.appendChild(tableHeader);

		this.projects.forEach(function (project) {
			if (!project.completed) {
				var projectRow = document.createElement("tr");

				var descriptionCell = document.createElement("td");
				descriptionCell.innerHTML = project.description;
				projectRow.appendChild(descriptionCell);

				var groupCell = document.createElement("td");
				groupCell.innerHTML = project.group;
				projectRow.appendChild(groupCell);

				var dueDateCell = document.createElement("td");
				dueDateCell.innerHTML = moment(project.dueDate).format("YYYY-MM-DD");
				projectRow.appendChild(dueDateCell);

				var daysRemainingCell = document.createElement("td");
				var dueDate = moment(project.dueDate);
				var now = moment();
				var daysRemaining = dueDate.diff(now, "days");
				daysRemainingCell.innerHTML = daysRemaining;
				projectRow.appendChild(daysRemainingCell);

				var completedCell = document.createElement("td");
				var checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.addEventListener("click", () => {
					this.sendSocketNotification("COMPLETE_PROJECT", project.id);
				});
				completedCell.appendChild(checkbox);
				projectRow.appendChild(completedCell);

				table.appendChild(projectRow);
			}
		}.bind(this));

		wrapper.appendChild(table);

		return wrapper;
	},

	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setInterval(function () {
			self.getProjects();
		}, nextLoad);
	},

	getProjects: function () {
		this.sendSocketNotification("GET_PROJECTS", this.config.remoteFile);
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "PROJECTS") {
			this.projects = payload;
			this.loaded = true;
			this.updateDom(this.config.fadeSpeed);
		}
	}
});