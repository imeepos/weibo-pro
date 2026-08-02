import { Ast, Input, IS_MULTI, Node, Output, State } from "@sker/workflow";

/**
 * Keyword Agent - 关键词分析专家
 *
 * 职责：
 * - 从用户输入中提取关键词和分析维度
 * - 生成搜索策略和查询计划
 * - 协调各Agent的分析方向
 */
@Node({
    title: '关键词专家',
    type: 'sentiment',
    errorStrategy: 'retry',
    maxRetries: 3
})
export class KeywordAgentAst extends Ast {
    // === 输入：LLM 参数 ===
    @Input({ title: '温度', defaultValue: 0.6 })
    temperature: number = 0.6;

    @Input({ title: 'topP', defaultValue: 0.9 })
    top_p: number = 0.9;

    @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
    model: string = 'deepseek-ai/DeepSeek-V3.2';

    // === 输入：业务数据 ===
    @Input({ title: '分析主题', defaultValue: '' })
    topic: string = '';

    @Input({ title: '发言记录', mode: IS_MULTI, defaultValue: [] })
    speechesText: string[] = [];

    // === 内部状态：系统提示词 ===
    @State({ title: '系统提示词' })
    get systemPrompt(): string {
        return `你是一位专业的关键词分析专家。你的职责是从用户的舆情分析需求中提取关键信息，并生成有效的搜索策略。

## 核心任务

1. **关键词提取**：从用户输入中识别核心关键词、相关词、同义词
2. **维度分析**：确定需要分析的维度（时间、地域、人群、情感等）
3. **搜索策略**：为各Agent生成针对性的搜索建议
4. **查询优化**：考虑网络语言特点，优化搜索词

## 搜索词设计原则

**想象网友怎么说**：如果你是个普通网友，你会怎么讨论这个话题？

- **避免学术词汇**：杜绝"舆情"、"传播"、"倾向"等专业术语
- **使用具体词汇**：用具体的事件、人名、地名、现象描述
- **包含情感表达**：如"支持"、"反对"、"担心"、"愤怒"、"点赞"等
- **考虑网络文化**：网民的表达习惯、缩写、俚语

## 输出要求

**必须严格按照 JSON 格式输出**，不要输出任何其他文字或说明。

JSON 结构示例：
{
  "coreKeywords": ["特斯拉", "马斯克", "电动车"],
  "extendedKeywords": ["Model 3", "Model Y", "FSD", "Supercharger"],
  "hotWords": ["马斯克", "特斯拉yyds", "国产特斯拉"],
  "searchStrategy": {
    "queryAgent": "特斯拉最新新闻、马斯克言论、特斯拉股价",
    "mediaAgent": "特斯拉官方视频、车主评测、自动驾驶演示",
    "insightAgent": "特斯拉用户讨论、购买意向、品牌口碑",
    "dimensions": {
      "timeRange": "最近7天",
      "platforms": ["微博", "知乎", "B站", "抖音"],
      "targetAudience": "潜在购车者、特斯拉车主、科技爱好者"
    }
  }
}

请确保输出结构清晰、关键词精准、分析深入。`;
    }

    // === 输出：结构化结果 ===
    @Output({ title: '分析结果', defaultValue: '' })
    analysisResult: string = '';

    @Output({ title: '核心关键词', defaultValue: [] })
    coreKeywords: string[] = [];

    @Output({ title: '扩展关键词', defaultValue: [] })
    extendedKeywords: string[] = [];

    @Output({ title: '网络热词', defaultValue: [] })
    hotWords: string[] = [];

    @Output({ title: '搜索策略', defaultValue: {} })
    searchStrategy: SearchStrategy = {
        queryAgent: '',
        mediaAgent: '',
        insightAgent: '',
        dimensions: {
            timeRange: '',
            platforms: [],
            targetAudience: ''
        }
    };

    type = 'KeywordAgentAst';
}

export interface SearchStrategy {
    queryAgent: string;
    mediaAgent: string;
    insightAgent: string;
    dimensions: {
        timeRange: string;
        platforms: string[];
        targetAudience: string;
    };
}
