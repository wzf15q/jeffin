// QuickIdea - 通知管理模块
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.bindEvents();
        this.scheduleNotifications();
    }

    // 加载设置
    loadSettings() {
        const saved = localStorage.getItem('quickIdea_notificationSettings');
        return saved ? JSON.parse(saved) : {
            morningNotification: true,
            eveningNotification: true,
            morningTime: '09:00',
            eveningTime: '21:00'
        };
    }

    // 保存设置
    saveSettings() {
        localStorage.setItem('quickIdea_notificationSettings', JSON.stringify(this.settings));
    }

    // 绑定事件
    bindEvents() {
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.requestPermission();
            });
        }

        // 设置中的通知开关
        const morningCheckbox = document.getElementById('morningNotification');
        const eveningCheckbox = document.getElementById('eveningNotification');

        if (morningCheckbox) {
            morningCheckbox.checked = this.settings.morningNotification;
            morningCheckbox.addEventListener('change', (e) => {
                this.settings.morningNotification = e.target.checked;
                this.saveSettings();
            });
        }

        if (eveningCheckbox) {
            eveningCheckbox.checked = this.settings.eveningNotification;
            eveningCheckbox.addEventListener('change', (e) => {
                this.settings.eveningNotification = e.target.checked;
                this.saveSettings();
            });
        }
    }

    // 请求通知权限
    async requestPermission() {
        if (!('Notification' in window)) {
            alert('您的浏览器不支持通知功能');
            return;
        }

        if (this.permission === 'granted') {
            this.showNotification('通知已开启', '您将收到每日任务提醒');
            return;
        }

        if (this.permission === 'denied') {
            alert('通知权限已被拒绝，请在浏览器设置中手动开启');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                this.showNotification('通知已开启', '您将收到每日任务提醒');
                this.scheduleNotifications();
            } else {
                alert('需要通知权限才能使用提醒功能');
            }
        } catch (error) {
            console.error('请求通知权限失败:', error);
        }
    }

    // 显示通知
    showNotification(title, body, options = {}) {
        if (this.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '💡',
            badge: '💡',
            tag: 'quickidea',
            requireInteraction: false,
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 自动关闭
        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    // 调度通知
    scheduleNotifications() {
        // 每分钟检查一次是否需要发送通知
        setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000); // 60秒

        // 立即检查一次
        this.checkScheduledNotifications();
    }

    // 检查是否需要发送通知
    checkScheduledNotifications() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 晨间提醒
        if (this.settings.morningNotification && currentTime === this.settings.morningTime) {
            this.sendMorningNotification();
        }

        // 晚间回顾
        if (this.settings.eveningNotification && currentTime === this.settings.eveningTime) {
            this.sendEveningNotification();
        }
    }

    // 发送晨间提醒
    sendMorningNotification() {
        if (!app || !app.tasks) return;

        const todoTasks = app.tasks.filter(t => !t.completed);
        const highPriorityTasks = todoTasks.filter(t =>
            t.tags.includes('任务') || t.tags.includes('待办')
        ).slice(0, 3);

        let body = `早上好！今天有 ${todoTasks.length} 个任务待完成`;

        if (highPriorityTasks.length > 0) {
            body += '\n\n优先任务：\n';
            highPriorityTasks.forEach((task, index) => {
                const preview = task.content.substring(0, 30);
                body += `${index + 1}. ${preview}${task.content.length > 30 ? '...' : ''}\n`;
            });
        }

        this.showNotification('☀️ QuickIdea 晨间提醒', body);
    }

    // 发送晚间回顾
    sendEveningNotification() {
        if (!app || !app.tasks) return;

        const today = new Date().toDateString();
        const todayTasks = app.tasks.filter(t =>
            new Date(t.createdAt).toDateString() === today
        );

        const completedToday = todayTasks.filter(t => t.completed).length;
        const todoToday = todayTasks.filter(t => !t.completed).length;

        let body = `今日总结\n✅ 完成 ${completedToday} 个任务`;

        if (todoToday > 0) {
            body += `\n⏳ 还有 ${todoToday} 个未完成`;
        }

        body += '\n\n明天继续加油！';

        this.showNotification('🌙 QuickIdea 晚间回顾', body);
    }

    // 发送自定义提醒
    sendCustomNotification(task) {
        const preview = task.content.substring(0, 50);
        this.showNotification(
            '⏰ 任务提醒',
            preview + (task.content.length > 50 ? '...' : '')
        );
    }
}

// 初始化通知管理器
let notificationManager;
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
});
