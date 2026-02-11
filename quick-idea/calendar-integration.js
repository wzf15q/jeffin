// QuickIdea - 日历集成模块
// 智能日程规划和日历导出功能

class CalendarIntegration {
    constructor() {
        this.settings = this.loadSettings();
    }

    // 加载设置
    loadSettings() {
        const saved = localStorage.getItem('quickIdea_calendarSettings');
        return saved ? JSON.parse(saved) : {
            preferredCalendar: 'ical', // 'ical' | 'google' | 'feishu'
            defaultReminderHours: 24,
            avoidWeekends: true
        };
    }

    // 保存设置
    saveSettings() {
        localStorage.setItem('quickIdea_calendarSettings', JSON.stringify(this.settings));
    }

    // 建议完成日期
    suggestCompletionDate(task) {
        const now = new Date();
        const { estimatedHours, priority, complexity } = task;

        let daysToAdd = 0;

        // 根据复杂度和优先级计算天数
        if (complexity === '简单') {
            daysToAdd = priority === '高' ? 1 : 3;
        } else if (complexity === '中等') {
            daysToAdd = priority === '高' ? 3 : 7;
        } else {
            daysToAdd = priority === '高' ? 7 : 14;
        }

        // 如果有预估时间，也考虑进去
        if (estimatedHours) {
            const estimatedDays = Math.ceil(estimatedHours / 4); // 假设每天工作 4 小时
            daysToAdd = Math.max(daysToAdd, estimatedDays);
        }

        let targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysToAdd);

        // 避开周末
        if (this.settings.avoidWeekends) {
            while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
                targetDate.setDate(targetDate.getDate() + 1);
            }
        }

        return targetDate;
    }

    // 生成 iCal 文件内容
    generateICalContent(task, dueDate) {
        const now = new Date();
        const dtStamp = this.formatICalDate(now);
        const dtStart = this.formatICalDate(dueDate);
        const dtEnd = this.formatICalDate(new Date(dueDate.getTime() + 60 * 60 * 1000)); // 1小时后

        // 提醒时间
        const reminderDate = new Date(dueDate);
        reminderDate.setHours(reminderDate.getHours() - this.settings.defaultReminderHours);
        const alarmTime = this.formatICalDate(reminderDate);

        const ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//QuickIdea//Task Manager//CN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:QuickIdea 任务',
            'X-WR-TIMEZONE:Asia/Shanghai',
            'BEGIN:VEVENT',
            `UID:${task.id}@quickidea.app`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${this.escapeICalText(task.content)}`,
            `DESCRIPTION:${this.escapeICalText(this.generateDescription(task))}`,
            'STATUS:CONFIRMED',
            'PRIORITY:5',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            `DESCRIPTION:任务提醒: ${this.escapeICalText(task.content)}`,
            `TRIGGER:${alarmTime}`,
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        return ical;
    }

    // 生成任务描述
    generateDescription(task) {
        let desc = task.content;

        if (task.breakdown && task.breakdown.length > 0) {
            desc += '\n\n任务拆解：\n';
            task.breakdown.forEach((step, index) => {
                desc += `${index + 1}. ${step.step} (${step.estimatedHours}h)\n`;
            });
        }

        if (task.aiAnalysis) {
            desc += `\n复杂度: ${task.aiAnalysis.complexity}`;
            desc += `\n预计耗时: ${task.aiAnalysis.estimatedHours}小时`;
        }

        return desc;
    }

    // 格式化 iCal 日期
    formatICalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    }

    // 转义 iCal 文本
    escapeICalText(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }

    // 下载 iCal 文件
    downloadICalFile(task, dueDate) {
        const icalContent = this.generateICalContent(task, dueDate);
        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `quickidea_task_${task.id}.ics`;
        link.click();

        URL.revokeObjectURL(url);

        return {
            success: true,
            message: 'iCal 文件已下载，请导入到你的日历应用'
        };
    }

    // Google Calendar 集成（未来实现）
    async addToGoogleCalendar(task, dueDate) {
        // TODO: 实现 Google Calendar API 集成
        return {
            success: false,
            message: 'Google Calendar 集成即将推出'
        };
    }

    // 飞书日历集成（未来实现）
    async addToFeishuCalendar(task, dueDate) {
        // TODO: 实现飞书日历 API 集成
        return {
            success: false,
            message: '飞书日历集成即将推出'
        };
    }

    // 添加到日历（统一入口）
    async addToCalendar(task, dueDate, calendarType) {
        const type = calendarType || this.settings.preferredCalendar;

        switch (type) {
            case 'ical':
                return this.downloadICalFile(task, dueDate);
            case 'google':
                return await this.addToGoogleCalendar(task, dueDate);
            case 'feishu':
                return await this.addToFeishuCalendar(task, dueDate);
            default:
                return this.downloadICalFile(task, dueDate);
        }
    }

    // 格式化日期显示
    formatDateDisplay(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];

        return `${year}-${month}-${day} (${weekday})`;
    }

    // 计算距离天数
    getDaysUntil(date) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        const diff = target - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return '今天';
        if (days === 1) return '明天';
        if (days === 2) return '后天';
        if (days > 0) return `${days}天后`;
        if (days === -1) return '昨天';
        return `${Math.abs(days)}天前`;
    }
}

// 导出单例
export const calendarIntegration = new CalendarIntegration();
