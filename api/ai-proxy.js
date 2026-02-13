/**
 * QuickIdea AI Backend Proxy (Vercel Serverless Function)
 * 
 * 环境变量:
 * - GEMINI_API_KEY
 * - DEEPSEEK_API_KEY
 * - QWEN_API_KEY
 * - DEFAULT_MODEL
 */

export const config = {
    runtime: 'edge', // 使用 Edge Runtime，速度更快，这就和 Cloudflare Worker 几乎一样了
};

export default async function handler(request) {
    // 1. 处理 CORS
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    // 只允许 POST
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 助手函数：获取环境变量（不论大小写）
    const getEnv = (key) => {
        const upperKey = key.toUpperCase();
        const lowerKey = key.toLowerCase();
        // Edge Runtime 中直接访问变量名最稳妥
        return process.env[upperKey] || process.env[lowerKey];
    };

    try {
        const { prompt, model = getEnv('DEFAULT_MODEL') || 'gemini' } = await request.json();

        console.log(`🤖 收到 AI 请求 | 模型: ${model} | Prompt 长度: ${prompt?.length || 0}`);

        let result = "";

        // 2. 模型路由
        switch (model) {
            case 'deepseek':
                result = await callDeepSeek(prompt, getEnv('DEEPSEEK_API_KEY'));
                break;
            case 'qwen':
                result = await callQwen(prompt, getEnv('QWEN_API_KEY'));
                break;
            case 'gemini':
            default:
                result = await callGemini(prompt, getEnv('GEMINI_API_KEY'));
                break;
        }

        // 3. 返回结果
        return new Response(JSON.stringify({ result }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
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
}

// --- API 调用逻辑 (与之前相同) ---

async function callGemini(prompt, apiKey) {
    if (!apiKey) throw new Error("Backend: Gemini API Key not configured");

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

async function callDeepSeek(prompt, apiKey) {
    if (!apiKey) throw new Error("Backend: DeepSeek API Key not configured");

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

async function callQwen(prompt, apiKey) {
    if (!apiKey) throw new Error("Backend: Qwen API Key not configured");

    const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "qwen-plus",
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
