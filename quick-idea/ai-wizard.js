// 交互式 AI 向导 - 逐步引导式任务拆解
export class InteractiveAIWizard {
    constructor(app, aiAssistant) {
        this.app = app;
        this.aiAssistant = aiAssistant;
        this.currentSession = null;
        this.wizardModal = null;
        this.initUI();
    }

    // 初始化 UI
    initUI() {
        // 查找内联容器
        const container = document.getElementById('aiWizardInlineContainer');
        if (!container) {
            console.warn('⚠️ 未找到 aiWizardInlineContainer，尝试在 body 中创建');
        }

        const wizardDiv = document.createElement('div');
        wizardDiv.id = 'aiWizardPanel';
        wizardDiv.className = 'wizard-inline-panel glass-card';
        wizardDiv.style.display = 'none'; // 初始隐藏
        wizardDiv.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <h3 id="wizardTitle">📝 AI 智能拆解</h3>
                    <button class="close-btn" id="closeWizardBtn">×</button>
                </div>
                <div class="wizard-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="wizardProgress"></div>
                    </div>
                </div>
                <div class="wizard-context" id="wizardContext"></div>
                <div class="wizard-body" id="wizardBody"></div>
                <div class="wizard-actions">
                    <div class="wizard-actions-left">
                        <button class="btn-text-small" id="wizardBackBtn" style="display: none;">
                            ← 返回上一步
                        </button>
                    </div>
                    <div class="wizard-actions-right">
                        <button class="btn-secondary" id="wizardSaveBtn">
                            💾 保存进度
                        </button>
                        <button class="btn-primary" id="wizardContinueBtn">
                            继续拆解 →
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (container) {
            container.appendChild(wizardDiv);
        } else {
            document.body.appendChild(wizardDiv);
        }

        this.wizardPanel = wizardDiv;

        // 绑定事件
        document.getElementById('closeWizardBtn').addEventListener('click', () => this.closeWizard());
        const backBtn = document.getElementById('wizardBackBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.goBack());
        document.getElementById('wizardSaveBtn').addEventListener('click', () => this.saveProgress());
        document.getElementById('wizardContinueBtn').addEventListener('click', () => this.continueWizard());
    }

    // 开始新的向导会话
    async startWizard(input) {
        console.log('🧙 启动 AI 向导:', input);

        this.currentSession = {
            id: `wizard_${Date.now()}`,
            originalInput: input,
            currentStep: 1,
            history: [],
            choices: {},
            createdAt: new Date().toISOString()
        };

        // 显示加载状态
        this.showLoading();
        this.wizardPanel.style.display = 'block';
        this.wizardPanel.classList.add('active');

        // 平滑滚动到向导面板
        this.wizardPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            // 获取第一步建议
            const firstStep = await this.getNextStep();
            this.showWizardStep(firstStep);
        } catch (error) {
            console.error('启动向导失败:', error);
            this.app.showNotification('AI 向导启动失败，请重试', 'error');
            this.closeWizard();
        }
    }

    // 获取下一步建议
    async getNextStep() {
        const prompt = this.buildPrompt();
        console.log('📤 发送 Prompt:', prompt);

        const response = await this.aiAssistant.callGemini(prompt);
        console.log('📥 收到响应:', response);

        // 解析 JSON 响应
        try {
            // 尝试提取 JSON（AI 可能返回带说明的文本）
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch (error) {
            console.error('解析 AI 响应失败:', error);
            throw new Error('AI 响应格式错误');
        }
    }

    // 构建 AI Prompt
    buildPrompt() {
        const { originalInput, currentStep, history, choices } = this.currentSession;

        let prompt = `你是一个智能任务拆解助手。用户想要：「${originalInput}」\n\n`;

        // 添加历史选择
        if (history.length > 0) {
            prompt += `用户已经做出的选择：\n`;
            history.forEach((item, index) => {
                prompt += `${index + 1}. ${item.question}: ${item.selectedLabel}\n`;
            });
            prompt += `\n`;
        }

        prompt += `请为用户提供第 ${currentStep} 步的选择建议。要求：

1. 分析用户的目标和已有选择
2. 提供 2-4 个具体的选项
3. 每个选项需要包含：
   - 清晰的标签
   - 数据支持或统计信息（如果适用，可以虚构但要合理）
   - 简短的建议说明（为什么选这个）
   - 一个合适的 emoji 图标

4. 判断是否还需要继续细化（如果已经足够具体，设置 canContinue 为 false）

严格按照以下 JSON 格式返回，不要添加任何其他文字：

{
  "step": ${currentStep},
  "question": "问题描述（如：选择题材）",
  "description": "这一步的说明（可选）",
  "options": [
    {
      "id": "option1",
      "label": "选项名称",
      "icon": "📚",
      "data": "数据支持（如：月榜前10占60%）",
      "suggestion": "建议说明（如：新手友好，容易上手）"
    }
  ],
  "canContinue": true,
  "nextStepHint": "下一步可能会做什么（可选）"
}`;

        return prompt;
    }

    // 显示向导步骤
    showWizardStep(stepData) {
        const { step, question, description, options, canContinue, nextStepHint } = stepData;

        // 更新标题和进度
        document.getElementById('wizardTitle').textContent = `📝 AI 智能拆解 - 第 ${step} 步`;

        // 更新进度条（假设最多 5 步）
        const progress = Math.min((step / 5) * 100, 100);
        document.getElementById('wizardProgress').style.width = `${progress}%`;

        // 显示上下文（已选择的内容）
        const contextDiv = document.getElementById('wizardContext');
        if (this.currentSession.history.length > 0) {
            const choicesSummary = this.currentSession.history
                .map(h => `${h.question}: ${h.selectedLabel}`)
                .join(' | ');
            contextDiv.innerHTML = `
                <div class="context-summary">
                    <strong>已选择：</strong> ${choicesSummary}
                </div>
            `;
            contextDiv.style.display = 'block';
        } else {
            contextDiv.style.display = 'none';
        }

        // 显示问题和选项
        const bodyDiv = document.getElementById('wizardBody');
        bodyDiv.innerHTML = `
            <div class="wizard-question">
                <h4>${question}</h4>
                ${description ? `<p class="question-description">${description}</p>` : ''}
            </div>
            <div class="wizard-options" id="wizardOptions">
                ${options.map(option => `
                    <label class="option-card" data-option-id="${option.id}">
                        <input type="radio" name="wizardChoice" value="${option.id}">
                        <div class="option-content">
                            <div class="option-header">
                                <span class="option-icon">${option.icon || '📌'}</span>
                                <span class="option-label">${option.label}</span>
                            </div>
                            ${option.data ? `<div class="option-data">📊 ${option.data}</div>` : ''}
                            ${option.suggestion ? `<div class="option-suggestion">💡 ${option.suggestion}</div>` : ''}
                        </div>
                    </label>
                `).join('')}
            </div>
            ${nextStepHint ? `<div class="next-step-hint">💭 ${nextStepHint}</div>` : ''}
        `;

        // 更新按钮状态
        document.getElementById('wizardBackBtn').style.display =
            this.currentSession.history.length > 0 ? 'inline-block' : 'none';

        const continueBtn = document.getElementById('wizardContinueBtn');
        continueBtn.textContent = canContinue ? '继续拆解 →' : '完成拆解 ✓';

        // 保存当前步骤数据
        this.currentStepData = stepData;

        // 添加选项点击事件
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', () => {
                const radio = card.querySelector('input[type="radio"]');
                radio.checked = true;
            });
        });
    }

    // 继续向导
    async continueWizard() {
        const selectedOption = document.querySelector('input[name="wizardChoice"]:checked');

        if (!selectedOption) {
            this.app.showNotification('请选择一个选项', 'warning');
            return;
        }

        const optionId = selectedOption.value;
        const option = this.currentStepData.options.find(opt => opt.id === optionId);

        // 记录选择并缓存当前的步骤建议，以便返回
        this.currentSession.history.push({
            step: this.currentSession.currentStep,
            question: this.currentStepData.question,
            optionId: optionId,
            selectedLabel: option.label,
            selectedData: option,
            stepData: this.currentStepData // 缓存数据用于返回
        });

        this.currentSession.choices[this.currentStepData.question] = option.label;

        // 检查是否可以继续
        if (!this.currentStepData.canContinue) {
            // 完成拆解
            this.completeWizard();
            return;
        }

        // 继续下一步
        this.currentSession.currentStep++;
        this.showLoading();

        try {
            const nextStep = await this.getNextStep();
            this.showWizardStep(nextStep);
        } catch (error) {
            console.error('获取下一步失败:', error);
            this.app.showNotification('获取建议失败，请重试', 'error');
        }
    }

    // 返回上一步
    goBack() {
        if (!this.currentSession || this.currentSession.history.length === 0) return;

        // 弹出最后一步选择
        const lastChoice = this.currentSession.history.pop();
        delete this.currentSession.choices[lastChoice.question];
        this.currentSession.currentStep--;

        // 重新显示缓存的上一步内容，无需再次请求 AI
        this.showWizardStep(lastChoice.stepData);
    }

    // 保存进度
    saveProgress() {
        const summary = Object.entries(this.currentSession.choices)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        const task = {
            content: `${this.currentSession.originalInput}\n\n拆解进度：\n${summary}`,
            tags: ['灵感', '进行中'],
            aiWizard: {
                sessionId: this.currentSession.id,
                status: 'in_progress',
                currentStep: this.currentSession.currentStep,
                history: this.currentSession.history,
                choices: this.currentSession.choices,
                canContinue: true,
                savedAt: new Date().toISOString()
            }
        };

        this.app.addTaskWithData(task);
        this.app.showNotification('✅ 进度已保存，可随时继续', 'success');
        this.closeWizard();
    }

    // 完成拆解
    completeWizard() {
        const summary = Object.entries(this.currentSession.choices)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        const task = {
            content: `${this.currentSession.originalInput}\n\n完整拆解：\n${summary}`,
            tags: ['灵感', '已拆解'],
            aiWizard: {
                sessionId: this.currentSession.id,
                status: 'completed',
                history: this.currentSession.history,
                choices: this.currentSession.choices,
                completedAt: new Date().toISOString()
            }
        };

        this.app.addTaskWithData(task);
        this.app.showNotification('🎉 拆解完成并已保存！', 'success');
        this.closeWizard();
    }

    // 显示加载状态
    showLoading() {
        const bodyDiv = document.getElementById('wizardBody');
        bodyDiv.innerHTML = `
            <div class="wizard-loading">
                <div class="loading-spinner"></div>
                <p>AI 正在分析并生成建议...</p>
            </div>
        `;
    }

    // 关闭向导
    closeWizard() {
        this.wizardPanel.classList.remove('active');
        setTimeout(() => {
            this.wizardPanel.style.display = 'none';
            this.currentSession = null;
        }, 300);
    }

    // 从已保存的任务继续
    async continueFromTask(task) {
        console.log('🔄 从任务继续向导:', task);

        this.currentSession = {
            id: task.aiWizard.sessionId,
            originalInput: task.content.split('\n')[0],
            currentStep: task.aiWizard.currentStep,
            history: task.aiWizard.history || [],
            choices: task.aiWizard.choices || {}
        };

        this.wizardModal.classList.add('active');
        this.showLoading();

        try {
            const nextStep = await this.getNextStep();
            this.showWizardStep(nextStep);
        } catch (error) {
            console.error('继续向导失败:', error);
            this.app.showNotification('继续拆解失败，请重试', 'error');
            this.closeWizard();
        }
    }
}
