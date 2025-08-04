/* global Module, Log, moment */

Module.register("MMM-HouseProjects", {
    defaults: {
        updateInterval: 60000,
        fadeSpeed: 2000,
        title: "House Projects",
        maxProjectsDisplayed: 8,
        showCompletedCount: true,
        colorCodeByUrgency: true,
        showProgressBars: true,
        groupByPriority: true,
        hideWeatherDependentProjects: false,
        compactMode: false,
        priorities: {
            high: { color: "#ff4757", icon: "🔥" },
            medium: { color: "#ffa502", icon: "⚡" },
            low: { color: "#2ed573", icon: "📝" }
        }
    },

    getScripts: function () {
        return ["moment.js"];
    },

    getStyles: function () {
        return ["MMM-HouseProjects.css"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.projects = [];
        this.names = [];
        this.weather = null;
        this.loaded = false;
        this.getProjects();
        
        // Set up periodic updates
        setInterval(() => {
            this.updateDom(this.config.fadeSpeed);
        }, this.config.updateInterval);
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-HouseProjects";
        
        if (this.config.compactMode) {
            wrapper.classList.add("compact");
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.createLoadingDisplay();
            return wrapper;
        }

        // Create header with summary stats
        const header = this.createHeader();
        wrapper.appendChild(header);

        // Filter and sort projects
        const displayProjects = this.getDisplayProjects();

        if (displayProjects.length === 0) {
            wrapper.appendChild(this.createNoProjectsDisplay());
            return wrapper;
        }

        // Create main projects table
        const table = this.createProjectsTable(displayProjects);
        wrapper.appendChild(table);

        return wrapper;
    },

    createHeader: function () {
        const header = document.createElement("div");
        header.className = "projects-header";
        
        const title = document.createElement("div");
        title.className = "projects-title";
        title.innerHTML = `<i class="fa fa-tasks"></i> ${this.config.title}`;
        
        if (this.config.showCompletedCount) {
            const activeCount = this.projects.filter(p => !p.completed).length;
            const overdueCount = this.projects.filter(p => !p.completed && new Date(p.dueDate) < new Date()).length;
            const completedToday = this.projects.filter(p => 
                p.completed && this.isToday(new Date(p.completedDate))
            ).length;
            
            const stats = document.createElement("div");
            stats.className = "projects-stats";
            stats.innerHTML = `
                <span class="stat-item active">${activeCount} Active</span>
                ${overdueCount > 0 ? `<span class="stat-item overdue">${overdueCount} Overdue</span>` : ''}
                ${completedToday > 0 ? `<span class="stat-item completed">+${completedToday} Today</span>` : ''}
            `;
            title.appendChild(stats);
        }
        
        header.appendChild(title);
        return header;
    },

    createProjectsTable: function (projects) {
        const table = document.createElement("table");
        table.className = "projects-table small";

        // Group projects by priority if enabled
        if (this.config.groupByPriority) {
            const grouped = this.groupProjectsByPriority(projects);
            
            ['high', 'medium', 'low'].forEach(priority => {
                if (grouped[priority] && grouped[priority].length > 0) {
                    // Add priority section header if we have high priority items or it's the first section
                    if (priority === 'high' || (priority === 'medium' && grouped.high.length === 0) || (priority === 'low' && grouped.high.length === 0 && grouped.medium.length === 0)) {
                        const sectionHeader = table.insertRow();
                        sectionHeader.className = `priority-section priority-${priority}`;
                        const cell = sectionHeader.insertCell();
                        cell.colSpan = 6;
                        cell.innerHTML = `
                            <div class="priority-header">
                                ${this.config.priorities[priority].icon} 
                                ${priority.toUpperCase()} PRIORITY
                                <span class="priority-count">(${grouped[priority].length})</span>
                            </div>
                        `;
                    }
                    
                    // Add projects for this priority
                    grouped[priority].forEach(project => {
                        this.addProjectRow(table, project);
                    });
                }
            });
        } else {
            // Regular table header
            const headerRow = table.insertRow();
            headerRow.className = "table-header";
            ["Project", "Assigned", "Due", "Status"].forEach(text => {
                const th = document.createElement("th");
                th.innerHTML = text;
                headerRow.appendChild(th);
            });

            projects.forEach(project => {
                this.addProjectRow(table, project);
            });
        }

        return table;
    },

    addProjectRow: function (table, project) {
        const row = table.insertRow();
        row.className = "project-row";
        
        // Determine urgency and styling
        const urgency = this.calculateUrgency(project);
        row.classList.add(`urgency-${urgency.level}`);
        
        if (this.config.colorCodeByUrgency) {
            row.style.borderLeft = `4px solid ${urgency.color}`;
        }

        // Project name with icon and priority indicator
        const projectCell = row.insertCell();
        projectCell.className = "project-name";
        
        const projectIcon = this.getProjectIcon(project);
        const priorityBadge = project.priority ? 
            `<span class="priority-badge priority-${project.priority.toLowerCase()}" data-priority="${project.priority}">${project.priority[0]}</span>` : '';
        
        let progressBar = '';
        if (this.config.showProgressBars && project.progressPercent) {
            progressBar = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progressPercent}%"></div>
                </div>
            `;
        }
        
        projectCell.innerHTML = `
            <div class="project-content">
                <span class="project-icon">${projectIcon}</span>
                <span class="project-text">${project.description}</span>
                ${priorityBadge}
            </div>
            ${progressBar}
        `;

        // Assigned person with group info
        const assignedCell = row.insertCell();
        assignedCell.className = "assigned-person";
        const assignedName = this.names.find(n => n.id === project.nameId)?.name || 'N/A';
        const groupDisplay = project.subgroup ? `${project.group}/${project.subgroup}` : project.group;
        assignedCell.innerHTML = `
            <div class="person-name">${assignedName}</div>
            <div class="group-name">${groupDisplay}</div>
        `;

        // Due date with smart formatting
        const dueDateCell = row.insertCell();
        dueDateCell.className = "due-date";
        dueDateCell.innerHTML = this.formatDueDate(project);

        // Status with urgency indicator
        const statusCell = row.insertCell();
        statusCell.className = "project-status";
        statusCell.innerHTML = `
            <div class="status-indicator ${urgency.level}">
                <span class="status-text">${urgency.text}</span>
                <span class="days-info">${urgency.daysText}</span>
            </div>
        `;

        // Add completion checkbox if enabled
        if (!this.config.groupByPriority) {
            const actionCell = row.insertCell();
            actionCell.className = "project-actions";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.id = project.id;
            checkbox.addEventListener("click", (e) => {
                this.sendSocketNotification("COMPLETE_PROJECT", parseInt(e.target.dataset.id));
            });
            actionCell.appendChild(checkbox);
        }
    },

    getDisplayProjects: function () {
        let activeProjects = this.projects.filter(p => !p.completed);
        
        // Filter weather-dependent projects if bad weather
        if (this.config.hideWeatherDependentProjects && this.weather) {
            activeProjects = activeProjects.filter(project => {
                if (project.weatherDependent && this.isBadWeather()) {
                    return false;
                }
                return true;
            });
        }

        // Sort by priority and urgency
        activeProjects.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority?.toLowerCase()] || 1;
            const bPriority = priorityOrder[b.priority?.toLowerCase()] || 1;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority; // High priority first
            }
            
            // Then sort by due date
            const aDue = new Date(a.dueDate);
            const bDue = new Date(b.dueDate);
            return aDue - bDue;
        });

        return activeProjects.slice(0, this.config.maxProjectsDisplayed);
    },

    calculateUrgency: function (project) {
        const dueDate = moment(project.dueDate);
        const today = moment();
        const daysRemaining = dueDate.diff(today, "days");
        
        if (daysRemaining < 0) {
            return {
                level: "overdue",
                color: "#ff4757",
                text: "OVERDUE",
                daysText: `${Math.abs(daysRemaining)} days ago`
            };
        } else if (daysRemaining === 0) {
            return {
                level: "today",
                color: "#ff6b00",
                text: "DUE TODAY",
                daysText: "Today"
            };
        } else if (daysRemaining <= 3) {
            return {
                level: "urgent",
                color: "#ffa502",
                text: "DUE SOON",
                daysText: `${daysRemaining} days left`
            };
        } else if (daysRemaining <= 7) {
            return {
                level: "soon",
                color: "#f1c40f",
                text: "This Week",
                daysText: `${daysRemaining} days left`
            };
        } else {
            return {
                level: "normal",
                color: "#2ed573",
                text: "On Track",
                daysText: `${daysRemaining} days left`
            };
        }
    },

    getProjectIcon: function (project) {
        // Smart icon selection based on project type/group
        const iconMap = {
            kitchen: "🍳",
            bathroom: "🛁",
            garden: "🌱",
            garage: "🚗",
            bedroom: "🛏️",
            living: "🛋️",
            maintenance: "🔧",
            cleaning: "🧹",
            decoration: "🎨",
            repair: "⚒️",
            electrical: "⚡",
            plumbing: "🚰",
            outdoor: "🌿",
            indoor: "🏠",
            paint: "🎨",
            fix: "🔧",
            install: "⚙️",
            organize: "📦"
        };
        
        const group = project.group?.toLowerCase() || '';
        const subgroup = project.subgroup?.toLowerCase() || '';
        const description = project.description?.toLowerCase() || '';
        
        // Check group, subgroup, and description for keywords
        for (const [key, icon] of Object.entries(iconMap)) {
            if (group.includes(key) || subgroup.includes(key) || description.includes(key)) {
                return icon;
            }
        }
        
        return "📋"; // Default icon
    },

    formatDueDate: function (project) {
        const dueDate = moment(project.dueDate);
        const today = moment();
        const daysRemaining = dueDate.diff(today, "days");
        
        if (daysRemaining === 0) {
            return `<span class="due-today">Today</span>`;
        } else if (daysRemaining === 1) {
            return `<span class="due-tomorrow">Tomorrow</span>`;
        } else if (daysRemaining < 7 && daysRemaining > 0) {
            return `<span class="due-this-week">${dueDate.format("dddd")}</span>`;
        } else if (daysRemaining < 0) {
            return `<span class="due-overdue">${dueDate.format("MMM Do")}</span>`;
        } else {
            return `<span class="due-normal">${dueDate.format("MMM Do")}</span>`;
        }
    },

    groupProjectsByPriority: function (projects) {
        return {
            high: projects.filter(p => p.priority?.toLowerCase() === 'high'),
            medium: projects.filter(p => p.priority?.toLowerCase() === 'medium'),
            low: projects.filter(p => !p.priority || p.priority.toLowerCase() === 'low')
        };
    },

    createLoadingDisplay: function () {
        return `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span>Loading projects...</span>
            </div>
        `;
    },

    createNoProjectsDisplay: function () {
        const container = document.createElement("div");
        container.className = "no-projects";
        container.innerHTML = `
            <div class="no-projects-content">
                <div class="celebration-icon">🎉</div>
                <h3>All caught up!</h3>
                <p>No active projects right now</p>
            </div>
        `;
        return container;
    },

    isToday: function (date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    isBadWeather: function () {
        // This would integrate with a weather module
        // For now, return false - you could integrate with MMM-Weather or similar
        if (this.weather && this.weather.current) {
            const badConditions = ['rain', 'snow', 'storm', 'thunderstorm'];
            return badConditions.some(condition => 
                this.weather.current.weather[0].main.toLowerCase().includes(condition)
            );
        }
        return false;
    },

    // Function to request data from the node_helper
    getProjects: function () {
        this.sendSocketNotification("GET_PROJECTS");
    },

    // Receive notifications from weather module if available
    notificationReceived: function (notification, payload, sender) {
        if (notification === "WEATHER_UPDATED" && sender.name === "MMM-OpenWeatherMap") {
            this.weather = payload;
        }
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "PROJECTS_UPDATED") {
            this.projects = payload.projects;
            this.names = payload.names;
            this.loaded = true;
            this.updateDom(this.config.fadeSpeed);
        }
    }
});
