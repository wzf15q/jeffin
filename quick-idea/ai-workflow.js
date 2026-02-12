// QuickIdea - AI 工作流集成
// 处理 AI 分析、拆解和日历录入的完整流程

import { aiAssistant } from './ai-assistant.js';
import { calendarIntegration } from './calendar-integration.js';
import { EXPERT_ROLES } from './expert-prompts.js';
import { InteractiveAIWizard } from './ai-wizard.js';

class AIWorkflow {
    constructor(app) {
        this.app = app;
        this.currentAnalysis = null;
        this.currentBreakdown = null;
        this.currentTask = null;
        this.isAnalyzing = false;
        this.lastAnalyzedInput = '';
        this.autoAnalyzeTimer = null;

        // 初始化交互式 AI 向导
        this.wizard = new InteractiveAIWizard(app, aiAssistant);

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
    }

    // 加载设置
    loadSettings() {
        // 加载 API Key (尽管现在已隐藏，但保留逻辑以防万一)
        const apiKey = localStorage.getItem('quickIdea_geminiApiKey');
        if (apiKey) {
            const apiKeyInput = document.getElementById('geminiApiKey');
            if (apiKeyInput) apiKeyInput.value = apiKey;
        }

        // 加载 AI 模型选择
        const aiModel = localStorage.getItem('quickIdea_aiModel') || 'gemini';
        const modelSelect = document.getElementById('aiModelSelect');
        if (modelSelect) {
            modelSelect.value = aiModel;
            this.aiAssistant.setModel(aiModel); // 初始化助手模型
        }

        // 加载自动提示设置
        const autoPrompt = localStorage.getItem('quickIdea_autoAiPrompt');
        if (autoPrompt !== null) {
            const autoPromptCheckbox = document.getElementById('autoAiPrompt');
            if (autoPromptCheckbox) autoPromptCheckbox.checked = autoPrompt === 'true';
        }
    }

    // 绑定事件
    bindEvents() {
        // 输入框变化检测
        const ideaInput = document.getElementById('ideaInput');
        if (!ideaInput) {
            console.error('❌ ideaInput 元素未找到');
            return;
        }

        console.log('✅ AI Workflow 事件绑定成功');

        ideaInput.addEventListener('input', () => {
            console.log('📝 输入框内容变化:', ideaInput.value);
            this.checkForAiPrompt();
        });

        // AI 分析按钮
        const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
        if (aiAnalyzeBtn) {
            aiAnalyzeBtn.addEventListener('click', () => {
                this.startAiAnalysis();
            });
        }

        // 跳过 AI 分析
        const aiSkipBtn = document.getElementById('aiSkipBtn');
        if (aiSkipBtn) {
            aiSkipBtn.addEventListener('click', () => {
                this.hideAiPrompt();
                this.app.addTask();
            });
        }

        // 关闭分析模态框
        document.getElementById('closeAnalysisBtn').addEventListener('click', () => {
            this.closeAnalysisModal();
        });

        // 直接保存（不拆解）
        document.getElementById('saveDirectBtn').addEventListener('click', () => {
            this.saveWithoutBreakdown();
        });

        // 查看拆解方案
        document.getElementById('viewBreakdownBtn').addEventListener('click', () => {
            this.startTaskBreakdown();
        });

        // 关闭拆解模态框
        document.getElementById('closeBreakdownBtn').addEventListener('click', () => {
            this.closeBreakdownModal();
        });

        // 取消拆解
        document.getElementById('cancelBreakdownBtn').addEventListener('click', () => {
            this.closeBreakdownModal();
        });

        // 确认拆解
        document.getElementById('confirmBreakdownBtn').addEventListener('click', () => {
            this.confirmBreakdown();
        });

        // 关闭日历模态框
        document.getElementById('closeCalendarBtn').addEventListener('click', () => {
            this.closeCalendarModal();
        });

        // 跳过日历
        document.getElementById('skipCalendarBtn').addEventListener('click', () => {
            this.closeCalendarModal();
            this.finishWorkflow();
        });

        // 确认日历录入
        document.getElementById('confirmCalendarBtn').addEventListener('click', () => {
            this.addToCalendar();
        });

        // 保存 API Key (尽管现在已隐藏，但保留逻辑以防万一)
        const apiKeyInput = document.getElementById('geminiApiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', (e) => {
                const apiKey = e.target.value.trim();
                localStorage.setItem('quickIdea_geminiApiKey', apiKey);
                this.aiAssistant.saveApiKey(apiKey);
                console.log('💾 API Key 已保存');
            });
        }

        // AI 模型切换监听
        const modelSelect = document.getElementById('aiModelSelect');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                const modelId = e.target.value;
                this.aiAssistant.setModel(modelId);
                // 使用 toast 提示模型已切换
                if (typeof this.showToast === 'function') {
                    this.showToast(`AI 模型已切换为: ${modelId}`);
                } else {
                    console.log(`🤖 AI 模型已切换为: ${modelId}`);
                }
            });
        }

        // 保存自动提示设置
        document.getElementById('autoAiPrompt').addEventListener('change', (e) => {
            localStorage.setItem('quickIdea_autoAiPrompt', e.target.checked);
            console.log('💾 自动提示设置已保存:', e.target.checked);
        });

        // 测试 AI 连接
        document.getElementById('testAiConnectionBtn').addEventListener('click', () => {
            this.testAiConnection();
        });

        // 点击模态框外部关闭
        const modals = ['aiAnalysisModal', 'breakdownModal', 'calendarModal'];
        modals.forEach(modalId => {
            document.getElementById(modalId).addEventListener('click', (e) => {
                if (e.target.id === modalId) {
                    this[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1, -5)}Modal`]();
                }
            });
        });
    }

    // 检查是否自动触发 AI 向导
    checkForAiPrompt() {
        const input = document.getElementById('ideaInput').value;
        const autoPrompt = document.getElementById('autoAiPrompt').checked;
        const hasInspirationTag = input.includes('#灵感');
        const isConfigured = aiAssistant.isConfigured();

        console.log('🔍 [AUTO-WIZARD] 检查自动触发条件:', {
            input: input.substring(0, 30) + '...',
            inputLength: input.length,
            autoPrompt,
            hasInspirationTag,
            isConfigured
        });

        // 如果启用自动提示、有灵感标签、已配置 API，且输入内容足够长
        if (autoPrompt && hasInspirationTag && isConfigured && input.trim().length > 5) {
            console.log('✅ [AUTO-WIZARD] 满足自动触发条件');

            // 防止重复触发：检查是否已经在分析中或已分析过相同内容
            if (!this.isAnalyzing && input !== this.lastAnalyzedInput) {
                this.isAnalyzing = true;
                this.lastAnalyzedInput = input;

                console.log('🚀 [AUTO-WIZARD] 设置定时器，800ms 后自动启动向导');

                // 延迟 800ms 自动触发，确保用户输入完成
                clearTimeout(this.autoAnalyzeTimer);
                this.autoAnalyzeTimer = setTimeout(() => {
                    console.log('⚡ [AUTO-WIZARD] 定时器触发，启动交互式 AI 向导');
                    // 启动交互式向导
                    this.wizard.startWizard(input);
                    // 重置状态
                    this.isAnalyzing = false;
                }, 800);
            } else {
                console.log('⏸️ [AUTO-WIZARD] 跳过触发（已在分析中或内容未变化）');
            }
        } else {
            console.log('❌ [AUTO-WIZARD] 不满足自动触发条件');

            // 如果有 #灵感 但未配置 API Key，给出提示
            if (hasInspirationTag && !isConfigured) {
                console.warn('⚠️ [AUTO-WIZARD] 请先配置 Gemini API Key');
                this.app.showNotification('请先在设置中配置 Gemini API Key', 'warning');
            }
        }
    }

    // 隐藏 AI 提示
    hideAiPrompt() {
        document.getElementById('aiPrompt').style.display = 'none';
    }

    // 开始 AI 分析
    async startAiAnalysis() {
        const input = document.getElementById('ideaInput').value.trim();

        if (!input) {
            this.app.showNotification('请先输入内容', 'warning');
            this.isAnalyzing = false;
            return;
        }

        if (!aiAssistant.isConfigured()) {
            this.app.showNotification('请先在设置中配置 Gemini API Key', 'warning');
            this.app.openSettings();
            this.isAnalyzing = false;
            return;
        }

        // 隐藏提示，显示分析模态框
        this.hideAiPrompt();
        this.openAnalysisModal();

        // 显示加载状态
        this.showAnalysisLoading();

        // 调用 AI 分析
        const result = await aiAssistant.analyzeTask(input);

        if (result.success) {
            this.currentAnalysis = result.data;
            this.currentTask = { content: input };
            this.showAnalysisResult(result.data);
        } else {
            this.showAnalysisError(result.error);
        }

        // 重置分析状态
        this.isAnalyzing = false;
    }

    // 显示分析加载状态
    showAnalysisLoading() {
        const resultDiv = document.getElementById('analysisResult');
        resultDiv.innerHTML = `
            <div class="analysis-loading">
                <div class="spinner"></div>
                <p>AI 正在分析中...</p>
            </div>
        `;
        document.getElementById('viewBreakdownBtn').style.display = 'none';
    }

    // 显示分析结果
    showAnalysisResult(analysis) {
        const expert = aiAssistant.getExpertInfo(analysis.expertRole);
        const complexityClass = analysis.complexity === '简单' ? 'complexity-simple' :
            analysis.complexity === '中等' ? 'complexity-medium' :
                'complexity-complex';

        const resultDiv = document.getElementById('analysisResult');
        resultDiv.innerHTML = `
            <div class="analysis-info">
                <div class="analysis-row">
                    <span class="analysis-label">任务类型</span>
                    <span class="analysis-value">${analysis.taskType}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">领域</span>
                    <span class="analysis-value">${analysis.domain}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">复杂度</span>
                    <span class="analysis-value ${complexityClass}">${analysis.complexity}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">预计耗时</span>
                    <span class="analysis-value">${analysis.estimatedHours} 小时</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">匹配专家</span>
                    <span class="expert-badge">
                        <span>${expert.icon}</span>
                        <span>${expert.name}</span>
                    </span>
                </div>
            </div>
            ${analysis.reasoning ? `
                <div class="analysis-reasoning">
                    <strong>💡 分析理由：</strong>${analysis.reasoning}
                </div>
            ` : ''}
        `;

        // 显示按钮
        if (analysis.needsBreakdown) {
            document.getElementById('viewBreakdownBtn').style.display = 'block';
        }
    }

    // 显示分析错误
    showAnalysisError(error) {
        const resultDiv = document.getElementById('analysisResult');
        resultDiv.innerHTML = `
            <div class="analysis-loading">
                <p style="color: var(--color-danger);">❌ 分析失败</p>
                <p style="font-size: 0.875rem; color: var(--color-text-muted);">${error}</p>
            </div>
        `;
    }

    // 直接保存（不拆解）
    saveWithoutBreakdown() {
        this.closeAnalysisModal();

        // 创建带有 AI 分析的任务
        const task = {
            ...this.currentTask,
            aiAnalysis: this.currentAnalysis
        };

        this.app.addTaskWithData(task);
        this.finishWorkflow();
    }

    // 开始任务拆解
    async startTaskBreakdown() {
        this.closeAnalysisModal();
        this.openBreakdownModal();
        this.showBreakdownLoading();

        const result = await aiAssistant.breakdownTask(
            this.currentTask.content,
            this.currentAnalysis
        );

        if (result.success) {
            this.currentBreakdown = result.data;
            this.showBreakdownResult(result.data);
        } else {
            this.showBreakdownError(result.error);
        }
    }

    // 显示拆解加载状态
    showBreakdownLoading() {
        const resultDiv = document.getElementById('breakdownResult');
        resultDiv.innerHTML = `
            <div class="breakdown-loading">
                <div class="spinner"></div>
                <p>AI 正在生成拆解方案...</p>
            </div>
        `;
        document.getElementById('confirmBreakdownBtn').style.display = 'none';
    }

    // 显示拆解结果
    showBreakdownResult(breakdown) {
        const expert = aiAssistant.getExpertInfo(this.currentAnalysis.expertRole);

        const resultDiv = document.getElementById('breakdownResult');
        resultDiv.innerHTML = `
            <div class="breakdown-header">
                <div class="breakdown-expert">
                    <span>${expert.icon}</span>
                    <span>专家：${expert.name}</span>
                </div>
            </div>

            <div class="breakdown-steps">
                ${breakdown.breakdown.map((step, index) => `
                    <div class="breakdown-step">
                        <div class="step-header">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-content">${step.step}</div>
                        </div>
                        <div class="step-meta">
                            <span class="step-time">⏱️ ${step.estimatedHours}h</span>
                            <span class="step-priority ${step.priority === '高' ? 'high' : step.priority === '中' ? 'medium' : 'low'}">
                                ${step.priority === '高' ? '🔴' : step.priority === '中' ? '🟡' : '🟢'} ${step.priority}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="breakdown-summary">
                <div class="summary-row">
                    <span class="summary-label">总耗时</span>
                    <span class="summary-value">${breakdown.totalEstimatedHours} 小时</span>
                </div>
            </div>

            ${breakdown.suggestions ? `
                <div class="breakdown-suggestions">
                    <strong>💡 执行建议：</strong>${breakdown.suggestions}
                </div>
            ` : ''}

            ${breakdown.tips ? `
                <div class="breakdown-suggestions" style="margin-top: 0.5rem;">
                    <strong>⚠️ 注意事项：</strong>${breakdown.tips}
                </div>
            ` : ''}
        `;

        document.getElementById('confirmBreakdownBtn').style.display = 'block';
    }

    // 显示拆解错误
    showBreakdownError(error) {
        const resultDiv = document.getElementById('breakdownResult');
        resultDiv.innerHTML = `
            <div class="breakdown-loading">
                <p style="color: var(--color-danger);">❌ 拆解失败</p>
                <p style="font-size: 0.875rem; color: var(--color-text-muted);">${error}</p>
            </div>
        `;
    }

    // 确认拆解
    confirmBreakdown() {
        this.closeBreakdownModal();

        // 创建带有拆解的任务
        const task = {
            ...this.currentTask,
            aiAnalysis: this.currentAnalysis,
            breakdown: this.currentBreakdown.breakdown
        };

        // 保存任务
        this.app.addTaskWithData(task);

        // 打开日历录入
        this.openCalendarModal(task);
    }

    // 打开日历模态框
    openCalendarModal(task) {
        // 计算建议完成日期
        const dueDate = calendarIntegration.suggestCompletionDate({
            estimatedHours: this.currentAnalysis.estimatedHours,
            priority: '高', // 默认高优先级
            complexity: this.currentAnalysis.complexity
        });

        // 显示信息
        document.getElementById('calendarTaskName').textContent = task.content;
        document.getElementById('calendarDueDate').textContent =
            calendarIntegration.formatDateDisplay(dueDate);
        document.getElementById('calendarDaysUntil').textContent =
            calendarIntegration.getDaysUntil(dueDate);

        // 保存当前任务和日期
        this.currentDueDate = dueDate;

        // 显示模态框
        document.getElementById('calendarModal').classList.add('active');
    }

    // 添加到日历
    async addToCalendar() {
        const calendarType = document.querySelector('input[name="calendarType"]:checked').value;

        // 获取最后添加的任务
        const task = this.app.tasks[0];

        const result = await calendarIntegration.addToCalendar(
            task,
            this.currentDueDate,
            calendarType
        );

        if (result.success) {
            this.app.showNotification(result.message, 'success');

            // 更新任务的日程信息
            task.schedule = {
                dueDate: this.currentDueDate.toISOString(),
                reminderBefore: 24,
                calendarAdded: true,
                calendarType: calendarType
            };
            this.app.saveTasks();
        } else {
            this.app.showNotification(result.message, 'warning');
        }

        this.closeCalendarModal();
        this.finishWorkflow();
    }

    // 测试 AI 连接
    async testAiConnection() {
        const btn = document.getElementById('testAiConnectionBtn');
        btn.textContent = '测试中...';
        btn.disabled = true;

        const result = await aiAssistant.testConnection();

        if (result.success) {
            this.app.showNotification('✅ ' + result.message, 'success');
        } else {
            this.app.showNotification('❌ ' + result.message, 'warning');
        }

        btn.textContent = '测试 AI 连接';
        btn.disabled = false;
    }

    // 完成工作流
    finishWorkflow() {
        // 清空输入框
        document.getElementById('ideaInput').value = '';
        document.getElementById('ideaInput').focus();

        // 重置状态
        this.currentAnalysis = null;
        this.currentBreakdown = null;
        this.currentTask = null;
        this.currentDueDate = null;
    }

    // 模态框控制
    openAnalysisModal() {
        document.getElementById('aiAnalysisModal').classList.add('active');
    }

    closeAnalysisModal() {
        document.getElementById('aiAnalysisModal').classList.remove('active');
    }

    openBreakdownModal() {
        document.getElementById('breakdownModal').classList.add('active');
    }

    closeBreakdownModal() {
        document.getElementById('breakdownModal').classList.remove('active');
    }

    closeCalendarModal() {
        document.getElementById('calendarModal').classList.remove('active');
    }
}

// 导出
export { AIWorkflow };
