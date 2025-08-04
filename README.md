# MMM-HouseProjects

A comprehensive project management module for MagicMirror² that helps you track and manage household projects, maintenance tasks, and to-dos with a beautiful display and powerful web-based admin interface.

![MagicMirror Display](https://via.placeholder.com/600x300/000000/FFFFFF?text=MagicMirror+Display)
![Admin Interface](https://via.placeholder.com/600x300/F4F7FA/4A90E2?text=Admin+Interface)

## ✨ Features

### 🪞 MagicMirror Display
- **Smart Priority Display** - Projects grouped by priority (High/Medium/Low) with visual indicators
- **Urgency Alerts** - Overdue projects flash with red background animation
- **Clean Design** - Transparent backgrounds with left-aligned project names for easy reading
- **Progress Tracking** - Visual progress bars for ongoing projects
- **Smart Icons** - Contextual emojis based on project type (🔧 maintenance, 🎨 decoration, etc.)
- **Responsive Layout** - Adapts to different screen sizes and orientations
- **Weather Integration** - Hide outdoor projects during bad weather (optional)

### 🌐 Web Admin Interface
- **Professional Dashboard** - KPI widgets showing active, completed, and overdue projects
- **Advanced Analytics** - Charts for completion trends, workload distribution, and performance metrics
- **Project Management** - Create, edit, delete, and track project progress
- **Team Management** - Assign projects to family members or team members
- **Group Organization** - Organize projects by rooms, categories, and subcategories
- **Progress Tracking** - Update project completion percentage with visual slider
- **Notes System** - Add timestamped notes and comments to projects
- **Priority Levels** - High/Medium/Low priority with color coding
- **Advanced Filtering** - Search and filter by priority, status, person, and date
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices

## 🚀 Installation

### Prerequisites
- MagicMirror² installation
- Node.js and npm

### Step 1: Clone the Repository
```bash
cd ~/MagicMirror/modules
git clone https://github.com/yourusername/MMM-HouseProjects.git
cd MMM-HouseProjects
npm install
```

### Step 2: Add to MagicMirror Config
Add the following to your `~/MagicMirror/config/config.js` file:

```javascript
{
    module: "MMM-HouseProjects",
    position: "top_left", // or any position you prefer
    config: {
        title: "House Projects",
        maxProjectsDisplayed: 8,
        showCompletedCount: true,
        colorCodeByUrgency: true,
        showProgressBars: true,
        groupByPriority: true,
        hideWeatherDependentProjects: false,
        compactMode: false
    }
}
```

### Step 3: Restart MagicMirror
```bash
pm2 restart mm
# or if not using pm2:
cd ~/MagicMirror && npm start
```

## 🎛️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | "House Projects" | Title displayed on the mirror |
| `maxProjectsDisplayed` | number | 8 | Maximum number of projects to show |
| `showCompletedCount` | boolean | true | Show completed project count in header |
| `colorCodeByUrgency` | boolean | true | Color-code projects by urgency level |
| `showProgressBars` | boolean | true | Display progress bars for ongoing projects |
| `groupByPriority` | boolean | true | Group projects by priority level |
| `hideWeatherDependentProjects` | boolean | false | Hide outdoor projects during bad weather |
| `compactMode` | boolean | false | Use compact display for smaller screens |
| `updateInterval` | number | 60000 | Update interval in milliseconds |
| `fadeSpeed` | number | 2000 | Fade animation speed |

## 📱 Web Admin Interface

### Accessing the Admin Interface
Once the module is running, access the web admin interface at:
```
http://your-mirror-ip:8080/MMM-HouseProjects
```

### Admin Interface Features

#### 📊 Dashboard
- **KPI Widgets**: Active projects, completed this month, overdue projects, average completion time, success rate
- **Charts**: Project status distribution, workload by person, completion trends
- **Analytics**: Performance metrics and insights

#### 📋 Project Management
- **Create Projects**: Add new projects with description, group, assignee, due date, priority
- **Edit Projects**: Modify project details, update progress, add notes
- **Priority Levels**: High (🔥), Medium (⚡), Low (📝)
- **Progress Tracking**: Visual slider to update completion percentage
- **Notes System**: Add timestamped notes and comments
- **Bulk Operations**: Filter and manage multiple projects

#### 👥 Team Management
- **Add Team Members**: Create and manage family members or team members
- **Assign Projects**: Assign projects to specific people
- **Workload Distribution**: View charts showing workload per person

#### 🏠 Group Organization
- **Create Groups**: Organize by rooms (Kitchen, Bathroom, etc.)
- **Subgroups**: Create subcategories within groups
- **Visual Hierarchy**: Clean display showing group → subgroup → projects

#### 📈 Analytics
- **Completion Trends**: 6-month trend analysis
- **Performance Metrics**: Success rates, average completion times
- **Overdue Analysis**: Identify bottlenecks and problem areas

## 🎨 Customization

### CSS Customization
The module includes separate CSS files for different components:

- `MMM-HouseProjects.css` - MagicMirror display styling
- `admin_ui/style.css` - Web admin interface styling

You can customize colors, fonts, and layouts by modifying these files.

### Priority Colors
Default priority colors can be customized in the config:

```javascript
priorities: {
    high: { color: "#ff4757", icon: "🔥" },
    medium: { color: "#ffa502", icon: "⚡" },
    low: { color: "#2ed573", icon: "📝" }
}
```

## 📖 Usage Guide

### Adding Your First Project

1. **Access Admin Interface**: Go to `http://your-mirror-ip:8080/MMM-HouseProjects`

2. **Set Up Groups**: Navigate to "Manage Data" and add groups like:
   - Kitchen
   - Bathroom  
   - Garage
   - Garden

3. **Add Team Members**: Add family members or team members who will be assigned projects

4. **Create Projects**: Go to "Projects" tab and create your first project:
   - Description: "Fix leaky faucet"
   - Group: Kitchen
   - Assigned to: John
   - Due Date: Next Friday
   - Priority: High

5. **View on Mirror**: The project will appear on your MagicMirror display

### Managing Projects

#### Updating Progress
1. Click the progress icon (📈) next to any active project
2. Use the slider to set completion percentage
3. Progress bars will update on both admin interface and mirror display

#### Adding Notes
1. Click the notes icon (💬) next to any project
2. Add timestamped notes about progress, issues, or updates
3. View complete project history

#### Completing Projects
1. Click the complete button (✅) to mark a project as done
2. View completion statistics in the dashboard
3. Completed projects move to the "Completed" section

### Using Filters
The admin interface includes powerful filtering options:

- **Search**: Find projects by name or description
- **Priority Filter**: Show only High, Medium, or Low priority projects
- **Status Filter**: Active, Completed, or Overdue projects
- **Person Filter**: Show projects assigned to specific team members

## 🔧 API Endpoints

The module includes a RESTful API for integration with other systems:

### Projects
- `GET /MMM-HouseProjects/api/projects` - Get all projects
- `POST /MMM-HouseProjects/api/projects` - Create new project
- `PUT /MMM-HouseProjects/api/projects/:id` - Update project
- `DELETE /MMM-HouseProjects/api/projects/:id` - Delete project
- `PUT /MMM-HouseProjects/api/projects/:id/complete` - Mark complete
- `PUT /MMM-HouseProjects/api/projects/:id/progress` - Update progress

### Groups & Team Members
- `GET /MMM-HouseProjects/api/groups` - Get all groups
- `POST /MMM-HouseProjects/api/groups` - Create group
- `GET /MMM-HouseProjects/api/names` - Get all team members
- `POST /MMM-HouseProjects/api/names` - Add team member

### Analytics
- `GET /MMM-HouseProjects/api/analytics/overview` - Dashboard metrics
- `GET /MMM-HouseProjects/api/analytics/trends` - Completion trends

## 🗃️ Data Storage

Project data is stored in JSON files within the module directory:

- `projects.json` - All project data
- `groups.json` - Groups and subgroups
- `names.json` - Team members

### Backup Recommendations
```bash
# Create backup
cp ~/MagicMirror/modules/MMM-HouseProjects/*.json ~/backups/

# Restore backup
cp ~/backups/*.json ~/MagicMirror/modules/MMM-HouseProjects/
```

## 🎯 Use Cases

### Family Home Management
- Track home maintenance tasks
- Assign chores to family members
- Monitor renovation project progress
- Seasonal maintenance reminders

### Small Business Task Management
- Project tracking for teams
- Client work progress monitoring
- Team workload distribution
- Performance analytics

### Personal Productivity
- Personal project management
- Goal tracking with progress bars
- Priority-based task organization
- Achievement analytics

## 🔧 Troubleshooting

### Common Issues

#### Module Not Loading
1. Check MagicMirror logs: `pm2 logs mm`
2. Verify module is in correct directory: `~/MagicMirror/modules/MMM-HouseProjects`
3. Check config syntax in `config.js`

#### Admin Interface Not Accessible
1. Ensure MagicMirror is running
2. Check firewall settings
3. Verify port 8080 is not blocked
4. Test local access: `http://localhost:8080/MMM-HouseProjects`

#### Data Not Saving
1. Check file permissions in module directory
2. Verify Node.js has write permissions
3. Check available disk space

#### Projects Not Displaying
1. Verify projects exist in admin interface
2. Check browser console for errors
3. Refresh browser cache
4. Restart MagicMirror

### Enable Debug Mode
Add to your MagicMirror config:
```javascript
{
    module: "MMM-HouseProjects",
    config: {
        debug: true
    }
}
```

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Reporting Issues
1. Check existing issues on GitHub
2. Provide detailed description
3. Include MagicMirror version and OS
4. Add console logs if applicable

### Feature Requests
1. Open an issue with "Enhancement" label
2. Describe the feature and use case
3. Include mockups if possible

### Development Setup
```bash
git clone https://github.com/yourusername/MMM-HouseProjects.git
cd MMM-HouseProjects
npm install
```

### Pull Requests
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Update documentation if needed
5. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MagicMirror²](https://github.com/MichMich/MagicMirror) community
- [Feather Icons](https://feathericons.com/) for beautiful icons
- [Chart.js](https://www.chartjs.org/) for data visualization

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/yourusername/MMM-HouseProjects/issues)
- **MagicMirror Forum**: [Community support](https://forum.magicmirror.builders/)
- **Documentation**: [Full documentation](https://github.com/yourusername/MMM-HouseProjects/wiki)

---

**Made with ❤️ for the MagicMirror² community**
