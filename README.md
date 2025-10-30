# TaskFlow - Modern Task Manager

A beautiful, responsive task management web application built with vanilla JavaScript, HTML, and CSS.

## Features

✨ **Modern UI/UX**
- Clean, gradient-based design with smooth animations
- Fully responsive layout that works on all devices
- Intuitive user interface with visual feedback

🎯 **Task Management**
- Add new tasks quickly
- Mark tasks as complete/incomplete
- Delete individual tasks
- Clear all completed tasks at once
- Filter tasks by status (All, Active, Completed)

💾 **Data Persistence**
- Tasks are automatically saved to browser's local storage
- Your tasks persist across browser sessions
- No backend required

📊 **Statistics**
- Real-time task counters
- Track total and completed tasks

## Getting Started

### Prerequisites

No installation required! This is a static web application that runs entirely in your browser.

### Running the Application

1. **Option 1: Open directly in browser**
   - Simply open `index.html` in your web browser
   - Double-click the file or drag it into your browser window

2. **Option 2: Use a local server (recommended)**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```
   Then navigate to `http://localhost:8000` in your browser

3. **Option 3: Use VS Code Live Server**
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

## How to Use

### Adding Tasks
1. Type your task in the input field at the top
2. Click "Add Task" or press Enter
3. Your task appears in the list below

### Managing Tasks
- **Complete a task**: Click the checkbox next to the task
- **Delete a task**: Hover over the task and click the delete icon (X)
- **Filter tasks**: Use the filter buttons (All, Active, Completed)
- **Clear completed**: Click "Clear Completed" to remove all finished tasks

### Keyboard Shortcuts
- `Enter` - Submit a new task (when input is focused)

## Browser Compatibility

TaskFlow works on all modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Opera

## Technical Details

### Technologies Used
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables, flexbox, and animations
- **JavaScript (ES6+)** - Class-based architecture, localStorage API

### File Structure
```
/
├── index.html      # Main HTML file
├── styles.css      # All styling and animations
├── app.js          # Application logic
└── README.md       # This file
```

### Architecture
- **Object-oriented design** using ES6 classes
- **Local Storage API** for data persistence
- **Event-driven architecture** for user interactions
- **Responsive design** with mobile-first approach

## Customization

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary: #6366f1;        /* Primary color */
    --secondary: #8b5cf6;      /* Secondary color */
    --success: #10b981;        /* Success color */
    /* ... more variables */
}
```

### Modifying Features
The application logic is contained in `app.js` in the `TaskManager` class. You can easily extend it with additional features.

## Performance

- ⚡ Fast and lightweight (< 50KB total)
- 🎨 Smooth 60fps animations
- 📱 Mobile-optimized
- 🔒 No external dependencies

## Future Enhancements

Potential features to add:
- Task priorities
- Due dates
- Categories/tags
- Search functionality
- Export/import tasks
- Dark mode toggle
- Task editing
- Drag and drop reordering

## License

This project is open source and available for personal and commercial use.

## Contributing

Feel free to fork, modify, and use this project as you see fit. Suggestions and improvements are welcome!

---

**Enjoy organizing your tasks with TaskFlow!** 🚀
