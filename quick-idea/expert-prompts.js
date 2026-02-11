// QuickIdea - 专家提示词库
// 定义不同领域的专家角色和提示词模板

export const EXPERT_ROLES = {
    programming: {
        name: '资深工程师',
        domain: '编程开发',
        expertise: '技术架构、代码实现、调试优化',
        icon: '👨‍💻'
    },
    product: {
        name: '产品经理',
        domain: '产品设计',
        expertise: '需求分析、功能规划、用户体验',
        icon: '📱'
    },
    content: {
        name: '内容策划师',
        domain: '内容创作',
        expertise: '文案撰写、内容规划、传播策略',
        icon: '✍️'
    },
    learning: {
        name: '学习教练',
        domain: '学习成长',
        expertise: '学习路径、知识体系、效率方法',
        icon: '📚'
    },
    project: {
        name: '项目经理',
        domain: '项目管理',
        expertise: '任务拆解、时间规划、风险控制',
        icon: '📊'
    },
    design: {
        name: '创意总监',
        domain: '设计创意',
        expertise: '设计思路、视觉方案、创意执行',
        icon: '🎨'
    }
};

// 任务分析提示词
export const ANALYSIS_PROMPT = (userInput) => `你是一个任务分析专家。请分析以下用户输入的内容：

用户输入：${userInput}

请仔细分析这个任务，并以 JSON 格式返回分析结果。要求：
1. 识别任务的主要类型和所属领域
2. 评估任务的复杂度（简单/中等/复杂）
3. 估算完成所需的总时间（小时）
4. 匹配最适合的专家角色
5. 判断是否需要拆解（复杂任务建议拆解）

返回格式：
{
  "taskType": "学习|工作|创意|生活|其他",
  "domain": "具体领域名称",
  "complexity": "简单|中等|复杂",
  "estimatedHours": 数字,
  "expertRole": "programming|product|content|learning|project|design",
  "needsBreakdown": true或false,
  "reasoning": "简短的分析理由"
}

只返回 JSON，不要有其他文字。`;

// 任务拆解提示词
export const BREAKDOWN_PROMPT = (userInput, expertRole, analysis) => {
    const expert = EXPERT_ROLES[expertRole];

    return `你是一位${expert.name}，擅长${expert.expertise}。

用户有以下想法需要执行：
"${userInput}"

任务分析：
- 类型：${analysis.taskType}
- 领域：${analysis.domain}
- 复杂度：${analysis.complexity}
- 预计总耗时：${analysis.estimatedHours}小时

请帮助用户将这个想法拆解为可执行的具体任务。要求：
1. 拆解为 3-5 个具体步骤（不要太多，保持聚焦）
2. 每个步骤要清晰、可执行、有明确的产出
3. 估算每个步骤的耗时（小时）
4. 设置合理的优先级（高/中/低）
5. 标注步骤之间的依赖关系（如果有）
6. 给出执行建议和注意事项

返回格式：
{
  "breakdown": [
    {
      "step": "步骤描述（简洁明确）",
      "estimatedHours": 数字,
      "priority": "高|中|低",
      "dependencies": [依赖的步骤序号数组，如 [1, 2]，没有依赖则为空数组]
    }
  ],
  "totalEstimatedHours": 数字,
  "suggestions": "执行建议（1-2句话）",
  "tips": "注意事项（1-2句话）"
}

只返回 JSON，不要有其他文字。`;
};

// 领域关键词映射
export const DOMAIN_KEYWORDS = {
    programming: ['代码', '编程', '开发', '程序', '算法', '网站', '应用', 'app', 'bug', '调试', '前端', '后端', 'API'],
    product: ['产品', '需求', '功能', '用户', '体验', 'PRD', '原型', '竞品', '迭代'],
    content: ['文章', '写作', '内容', '文案', '博客', '公众号', '视频', '脚本', '策划'],
    learning: ['学习', '教程', '课程', '知识', '掌握', '理解', '研究', '阅读', '笔记'],
    project: ['项目', '计划', '管理', '协调', '进度', '里程碑', '交付', '团队'],
    design: ['设计', '界面', 'UI', 'UX', '视觉', '图标', 'logo', '配色', '排版', '创意']
};

// 智能匹配专家角色
export function matchExpertRole(userInput, taskType) {
    const input = userInput.toLowerCase();

    // 统计每个领域的关键词匹配数
    const scores = {};
    for (const [role, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        scores[role] = keywords.filter(keyword =>
            input.includes(keyword.toLowerCase())
        ).length;
    }

    // 找出得分最高的领域
    const bestMatch = Object.entries(scores).reduce((a, b) =>
        a[1] > b[1] ? a : b
    );

    // 如果有明确匹配，返回匹配的角色
    if (bestMatch[1] > 0) {
        return bestMatch[0];
    }

    // 否则根据任务类型返回默认角色
    const defaultRoles = {
        '学习': 'learning',
        '工作': 'project',
        '创意': 'design',
        '生活': 'project'
    };

    return defaultRoles[taskType] || 'project';
}
