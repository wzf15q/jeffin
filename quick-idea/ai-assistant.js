// QuickIdea - AI 助手模块
// 集成 Gemini API 进行任务分析和拆解

import { ANALYSIS_PROMPT, BREAKDOWN_PROMPT, matchExpertRole, EXPERT_ROLES } from './expert-prompts.js';

class AIAssistant {
    constructor() {
        this.apiKey = this.loadApiKey();
        // 使用 v1beta API 和 Gemini Flash Latest 模型
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
        this.enabled = !!this.apiKey;
    }

    // 加载 API Key
    loadApiKey() {
        return localStorage.getItem('quickIdea_geminiApiKey') || '';
    }

    // 保存 API Key
    saveApiKey(apiKey) {
        localStorage.setItem('quickIdea_geminiApiKey', apiKey);
        this.apiKey = apiKey;
        this.enabled = !!apiKey;
    }

    // 检查是否已配置
    isConfigured() {
        return this.enabled;
    }

    // 调用 Gemini API
    async callGemini(prompt) {
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
            const prompt = ANALYSIS_PROMPT(userInput);
            const response = await this.callGemini(prompt);
            const analysis = this.parseJsonResponse(response);

            // 如果 AI 没有返回 expertRole，使用智能匹配
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
