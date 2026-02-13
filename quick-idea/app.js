// QuickIdea - 核心应用逻辑
class QuickIdeaApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadTasks();
        this.bindEvents();
        this.initMiniCalendar();
        this.renderTasks();
        this.updateStats();
        this.updateTodayFocus();

        // 初始化 AI 工作流（延迟加载以支持模块）
        this.initAIWorkflow();
    }

    // 初始化 AI 工作流
    async initAIWorkflow() {
        try {
            const { AIWorkflow } = await import('./ai-workflow.js');
            this.aiWorkflow = new AIWorkflow(this);
        } catch (error) {
            console.log('AI 功能未启用:', error);
        }
    }

    // 加载任务数据
    loadTasks() {
        const savedTasks = localStorage.getItem('quickIdea_tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
    }

    // 保存任务数据
    saveTasks() {
        localStorage.setItem('quickIdea_tasks', JSON.stringify(this.tasks));
    }

    // 绑定事件
    bindEvents() {
        // 快速输入表单
        document.getElementById('quickInputForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // 标签按钮
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.insertTag(btn.dataset.tag);
            });
        });

        // 筛选标签
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.setFilter(tab.dataset.filter);
            });
        });

        // 搜索
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

        // 任务列表事件委托（删除和切换完成状态）
        document.getElementById('tasksList').addEventListener('click', (e) => {
            const target = e.target;

            // 处理删除按钮点击（点击按钮本身或其中的图标）
            const deleteBtn = target.classList.contains('btn-delete') ? target : target.closest('.btn-delete');
            if (deleteBtn) {
                const taskItem = deleteBtn.closest('.task-item');
                if (taskItem) {
                    const taskId = parseInt(taskItem.dataset.taskId);
                    this.deleteTask(taskId);
                }
                return;
            }

            // 处理复选框点击
            if (target.type === 'checkbox' && target.classList.contains('task-checkbox')) {
                const taskItem = target.closest('.task-item');
                if (taskItem) {
                    const taskId = parseInt(taskItem.dataset.taskId);
                    this.toggleTask(taskId);
                }
            }
        });

        // 清除已完成
        document.getElementById('clearCompletedBtn').addEventListener('click', () => {
            this.clearCompleted();
        });

        // 设置按钮
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.closeSettings();
        });

        // 数据管理
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        // 点击模态框外部关闭
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    // 添加任务
    addTask() {
        const input = document.getElementById('ideaInput');
        const content = input.value.trim();

        if (!content) {
            this.showNotification('请输入内容', 'warning');
            return;
        }

        // 提取标签
        const tags = this.extractTags(content);

        const task = {
            id: Date.now(),
            content: content,
            tags: tags,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateTodayFocus(); // 更新焦点

        // 清空输入框
        input.value = '';
        input.focus();

        this.showNotification('保存成功！', 'success');
    }

    // 添加带有额外数据的任务（用于 AI 功能）
    addTaskWithData(taskData) {
        const tags = this.extractTags(taskData.content);

        const task = {
            id: Date.now(),
            content: taskData.content,
            tags: tags,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...taskData // 合并额外数据（aiAnalysis, breakdown, schedule 等）
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateTodayFocus(); // 更新焦点

        this.showNotification('保存成功！', 'success');

        return task;
    }

    // 提取标签
    extractTags(content) {
        const tagRegex = /#([\u4e00-\u9fa5a-zA-Z0-9]+)/g;
        const tags = [];
        let match;

        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(match[1]);
        }

        return tags;
    }

    // 插入标签
    insertTag(tag) {
        const input = document.getElementById('ideaInput');
        const cursorPos = input.selectionStart;
        const textBefore = input.value.substring(0, cursorPos);
        const textAfter = input.value.substring(cursorPos);

        const tagText = `#${tag} `;
        input.value = textBefore + tagText + textAfter;

        // 设置光标位置
        const newCursorPos = cursorPos + tagText.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();

        // 手动触发 input 事件，以便 AI 工作流可以检测到 #灵感 标签
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }

    // 切换任务完成状态
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateTodayFocus(); // 更新焦点
        }
    }

    // 删除任务
    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateTodayFocus(); // 更新焦点
        this.showNotification('已删除', 'success');
    }

    // 设置筛选
    setFilter(filter) {
        this.currentFilter = filter;

        // 更新标签样式
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        this.renderTasks();
    }

    // 搜索任务
    searchTasks(query) {
        this.searchQuery = query.toLowerCase();
        this.renderTasks();
    }

    // 获取筛选后的任务
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // 应用筛选
        switch (this.currentFilter) {
            case 'todo':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
            case 'today':
                const today = new Date().toDateString();
                filtered = filtered.filter(t => {
                    return new Date(t.createdAt).toDateString() === today;
                });
                break;
        }

        // 应用搜索
        if (this.searchQuery) {
            filtered = filtered.filter(t =>
                t.content.toLowerCase().includes(this.searchQuery)
            );
        }

        return filtered;
    }

    // 初始化微缩日历
    initMiniCalendar() {
        const miniCalendar = document.getElementById('miniCalendar');
        if (!miniCalendar) return;

        const days = [];
        const now = new Date();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(now.getDate() + i);
            days.push({
                name: i === 0 ? '今' : weekdays[date.getDay()],
                number: date.getDate(),
                fullDate: date.toDateString(),
                active: i === 0
            });
        }

        miniCalendar.innerHTML = days.map(day => `
            <div class="calendar-day ${day.active ? 'active' : ''}" data-date="${day.fullDate}">
                <span class="day-name">${day.name}</span>
                <span class="day-number">${day.number}</span>
            </div>
        `).join('');

        // 绑定点击事件
        miniCalendar.querySelectorAll('.calendar-day').forEach(dayBtn => {
            dayBtn.addEventListener('click', () => {
                miniCalendar.querySelectorAll('.calendar-day').forEach(btn => btn.classList.remove('active'));
                dayBtn.classList.add('active');
                this.showNotification(`已切换到 ${dayBtn.dataset.date}`, 'info');
            });
        });
    }

    // 更新今日焦点磁贴
    updateTodayFocus() {
        const focusSection = document.getElementById('todayFocusSection');
        const focusTile = document.getElementById('todayFocusTile');
        if (!focusSection || !focusTile) return;

        const focusTask = this.getFocusTask();
        focusSection.style.display = 'block';

        if (focusTask) {
            const tagName = focusTask.tags[0] || '任务';
            focusTile.innerHTML = `
                <div class="focus-label">今日推荐焦点</div>
                <div class="focus-content">${this.escapeHtml(focusTask.content)}</div>
                <div class="focus-hint">✨ 这是目前最重要的${tagName}，建议现在开始</div>
            `;

            focusTile.onclick = () => {
                const element = document.querySelector(`[data-task-id="${focusTask.id}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-pulse');
                    setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
                }
            };
        } else {
            focusTile.innerHTML = `
                <div class="focus-label" style="background: rgba(255,255,255,0.1); color: var(--color-text-secondary);">暂无推荐焦点</div>
                <div class="focus-content" style="font-size: 0.9rem; opacity: 0.6;">添加带有 #灵感 的内容并完成 AI 拆解，系统将为您自动筛选焦点。</div>
            `;
            focusTile.onclick = null;
        }
    }

    // 获取当前最重要的任务
    getFocusTask() {
        const pending = this.tasks.filter(t => !t.completed);
        if (pending.length === 0) return null;
        return pending.find(t => t.breakdown && t.breakdown.length > 0) || pending[0];
    }

    // 更新统计数据
    updateStats() {
        const total = this.tasks.length;
        const todo = this.tasks.filter(t => !t.completed).length;
        const completed = this.tasks.filter(t => t.completed).length;

        const today = new Date().toDateString();
        const todayCount = this.tasks.filter(t => {
            return new Date(t.createdAt).toDateString() === today;
        }).length;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('todoCount').textContent = todo;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('todayCount').textContent = todayCount;
    }

    // 清除已完成任务
    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;

        if (completedCount === 0) {
            this.showNotification('没有已完成的任务', 'info');
            return;
        }

        if (confirm(`确定要清除 ${completedCount} 个已完成的任务吗？`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('已清除完成的任务', 'success');
        }
    }

    // 打开设置
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    // 关闭设置
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    // 导出数据
    exportData() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `quickidea_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.showNotification('数据已导出', 'success');
    }

    // 清除所有数据
    clearAllData() {
        if (confirm('⚠️ 警告：这将删除所有数据，且无法恢复！确定要继续吗？')) {
            if (confirm('再次确认：真的要删除所有数据吗？')) {
                this.tasks = [];
                this.saveTasks();
                this.renderTasks();
                this.updateStats();
                this.closeSettings();
                this.showNotification('所有数据已清除', 'success');
            }
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);

        // 创建页面内通知（toast）
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // 如果浏览器支持通知API，也使用系统通知
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('QuickIdea', {
                body: message,
                icon: '💡'
            });
        }
    }

    // 格式化时间
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes} 分钟前`;
        if (hours < 24) return `${hours} 小时前`;
        if (days < 7) return `${days} 天前`;

        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuickIdeaApp();
});
