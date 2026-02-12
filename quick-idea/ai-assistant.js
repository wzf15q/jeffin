// QuickIdea - AI 助手模块
// 集成 Gemini API 进行任务分析和拆解

import { ANALYSIS_PROMPT, BREAKDOWN_PROMPT, matchExpertRole, EXPERT_ROLES } from './expert-prompts.js';

class AIAssistant {
    constructor() {
        this.apiKey = this.loadApiKey();
        // 默认代理地址 (用户部署后需替换此 URL)
        this.proxyUrl = 'https://jeffin.vercel.app/api/ai-proxy';
        this.useProxy = true; // 默认开启代理模式
        this.currentModel = localStorage.getItem('quickIdea_aiModel') || 'gemini';

        // 直连模式配置
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    // 加载 API Key
    loadApiKey() {
        return localStorage.getItem('quickIdea_geminiApiKey') || '';
    }

    // 保存 API Key
    saveApiKey(apiKey) {
        localStorage.setItem('quickIdea_geminiApiKey', apiKey);
        this.apiKey = apiKey;
    }

    // 切换模型
    setModel(modelId) {
        this.currentModel = modelId;
        localStorage.setItem('quickIdea_aiModel', modelId);
        console.log(`🤖 模型已切换为: ${modelId}`);
    }

    // 检查是否已配置
    isConfigured() {
        // 代理模式下，默认认为已配置 (Key 在后端)
        if (this.useProxy) return true;
        return !!this.apiKey;
    }

    // 统一调用入口
    async callGemini(prompt) {
        if (this.useProxy) {
            return this.callProxy(prompt);
        } else {
            return this.callDirectGemini(prompt);
        }
    }

    // 通过后端代理调用 (支持多模型)
    async callProxy(prompt) {
        if (!this.proxyUrl) {
            throw new Error('未配置代理服务地址');
        }

        try {
            console.log(`📡 通过代理调用 AI (${this.currentModel})...`);

            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: this.currentModel
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `请求失败: ${response.status}`);
            }

            const data = await response.json();

            if (!data.result) {
                throw new Error('AI 返回数据为空');
            }

            return data.result;
        } catch (error) {
            console.error('API 代理调用失败:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('无法连接到 AI 代理服务器。请检查网络或 CORS 配置。');
            }
            throw error;
        }
    }

    // 直接调用 Google Gemini API (旧模式)
    async callDirectGemini(prompt) {
        if (!this.apiKey) {
            throw new Error('请先配置 Gemini API Key');
        }

        const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API 调用失败: ${error.error?.message || '未知错误'}`);
        }

        const data = await response.json();
        const text = data.candidates[0]?.content?.parts[0]?.text;

        if (!text) {
            throw new Error('API 返回数据格式错误');
        }

        return text;
    }

    // 解析 JSON 响应
    parseJsonResponse(text) {
        // 尝试提取 JSON（有时 AI 会返回带有额外文字的内容）
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('无法解析 AI 返回的 JSON');
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error('JSON 解析失败: ' + e.message);
        }
    }

    // 分析任务
    async analyzeTask(userInput) {
        try {
            // ... (保持原有逻辑，但 callGemini 会自动路由)
            const prompt = ANALYSIS_PROMPT(userInput);
            const response = await this.callGemini(prompt);
            const analysis = this.parseJsonResponse(response);

            if (!analysis.expertRole) {
                analysis.expertRole = matchExpertRole(userInput, analysis.taskType);
            }

            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            console.error('任务分析失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 拆解任务
    async breakdownTask(userInput, analysis) {
        try {
            const prompt = BREAKDOWN_PROMPT(userInput, analysis.expertRole, analysis);
            const response = await this.callGemini(prompt);
            const breakdown = this.parseJsonResponse(response);

            return {
                success: true,
                data: breakdown
            };
        } catch (error) {
            console.error('任务拆解失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取专家信息
    getExpertInfo(expertRole) {
        return EXPERT_ROLES[expertRole] || EXPERT_ROLES.project;
    }

    // 测试 API 连接
    async testConnection() {
        try {
            const response = await this.callGemini('请回复"连接成功"');
            return {
                success: true,
                message: '连接成功！'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// 导出单例
export const aiAssistant = new AIAssistant();
