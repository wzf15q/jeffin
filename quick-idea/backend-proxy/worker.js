/**
 * QuickIdea AI Backend Proxy
 * 
 * 环境变量 (Environment Variables):
 * - GEMINI_API_KEY
 * - DEEPSEEK_API_KEY
 * - QWEN_API_KEY
 * - DEFAULT_MODEL (可选，默认 gemini)
 */

export default {
    async fetch(request, env) {
        // 1. 处理 CORS (跨域请求)
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // 只允许 POST 请求
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            // 2. 解析请求体
            const { prompt, model = env.DEFAULT_MODEL || 'gemini' } = await request.json();

            let result = "";

            // 3. 模型路由
            switch (model) {
                case 'deepseek':
                    result = await callDeepSeek(prompt, env.DEEPSEEK_API_KEY);
                    break;
                case 'qwen':
                    result = await callQwen(prompt, env.QWEN_API_KEY);
                    break;
                case 'gemini':
                default:
                    result = await callGemini(prompt, env.GEMINI_API_KEY);
                    break;
            }

            // 4. 返回结果
            return new Response(JSON.stringify({ result }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*", // 允许跨域
                },
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    },
};

// --- Gemini API ---
async function callGemini(prompt, apiKey) {
    if (!apiKey) throw new Error("Gemini API Key not configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `Gemini API Error: ${response.status}`);
    }

    return data.candidates[0].content.parts[0].text;
}

// --- DeepSeek API (OpenAI Compatible) ---
async function callDeepSeek(prompt, apiKey) {
    if (!apiKey) throw new Error("DeepSeek API Key not configured");

    const url = "https://api.deepseek.com/chat/completions";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt }
            ],
            stream: false
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `DeepSeek API Error: ${response.status}`);
    }

    return data.choices[0].message.content;
}

// --- Qwen (通义千问) API (OpenAI Compatible) ---
async function callQwen(prompt, apiKey) {
    if (!apiKey) throw new Error("Qwen API Key not configured");

    // 阿里云 DashScope 兼容 OpenAI 接口
    const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "qwen-plus", // 或者 qwen-max, qwen-turbo
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt }
            ]
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || `Qwen API Error: ${response.status}`);
    }

    return data.choices[0].message.content;
}
