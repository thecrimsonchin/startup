// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.cacheDOMElements();
        this.attachEventListeners();
        this.render();
    }

    cacheDOMElements() {
        this.taskForm = document.getElementById('taskForm');
        this.taskInput = document.getElementById('taskInput');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.filterBtns = document.querySelectorAll('.filter-btn');
    }

    attachEventListeners() {
        this.taskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });
    }

    handleAddTask(e) {
        e.preventDefault();
        const text = this.taskInput.value.trim();
        
        if (text) {
            const task = {
                id: Date.now(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            this.tasks.unshift(task);
            this.saveTasks();
            this.taskInput.value = '';
            this.render();
            
            // Add a small animation delay
            requestAnimationFrame(() => {
                const taskEl = this.taskList.firstElementChild;
                if (taskEl) {
                    taskEl.style.animation = 'none';
                    requestAnimationFrame(() => {
                        taskEl.style.animation = '';
                    });
                }
            });
        }
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
        }
    }

    deleteTask(id) {
        const taskElement = document.querySelector(`[data-task-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.add('removing');
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveTasks();
                this.render();
            }, 300);
        }
    }

    clearCompleted() {
        const completedElements = document.querySelectorAll('.task-item.completed');
        completedElements.forEach(el => el.classList.add('removing'));
        
        setTimeout(() => {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
        }, 300);
    }

    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        this.currentFilter = filter;
        
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.render();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    render() {
        this.renderStats();
        this.renderTasks();
    }

    renderStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        
        this.totalTasksEl.textContent = total;
        this.completedTasksEl.textContent = completed;
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.taskList.innerHTML = '';
            this.emptyState.classList.add('show');
        } else {
            this.emptyState.classList.remove('show');
            this.taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
            
            // Attach event listeners to task elements
            this.taskList.querySelectorAll('.task-item').forEach(taskEl => {
                const id = parseInt(taskEl.dataset.taskId);
                
                const checkbox = taskEl.querySelector('.task-checkbox');
                checkbox.addEventListener('click', () => this.toggleTask(id));
                
                const deleteBtn = taskEl.querySelector('.task-delete');
                deleteBtn.addEventListener('click', () => this.deleteTask(id));
            });
        }
    }

    createTaskHTML(task) {
        return `
            <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox"></div>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <button class="task-delete" aria-label="Delete task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                </button>
            </li>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const stored = localStorage.getItem('tasks');
        return stored ? JSON.parse(stored) : [];
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TaskManager();
    });
} else {
    new TaskManager();
}
