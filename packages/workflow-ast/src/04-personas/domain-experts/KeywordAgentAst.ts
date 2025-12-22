import { Ast, Input, Node, Output } from "@sker/workflow";

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
    type: 'sentiment'
})
export class KeywordAgentAst extends Ast {

    @Output({ title: '温度', defaultValue: 0.6 })
    temperature = 0.6;

    @Output({ title: 'topP', defaultValue: 0.9 })
    top_p = 0.9;

    @Output({ title: '系统提示词', defaultValue: '' })
    systemPrompt = `你是一位专业的关键词分析专家。你的职责是从用户的舆情分析需求中提取关键信息，并生成有效的搜索策略。

## 核心任务

1. **关键词提取**：从用户输入中识别核心关键词、相关词、同义词
2. **维度分析**：确定需要分析的维度（时间、地域、人群、情感等）
3. **搜索策略**：为各Agent生成针对性的搜索建议
4. **查询优化**：考虑网络语言特点，优化搜索词

## 输出格式

### 核心关键词
- 主关键词：[最核心的1-2个词]
- 扩展关键词：[相关的3-5个词]
- 网络热词：[可能的网络流行表达]

### 分析维度
- 时间范围：[建议的时间范围]
- 关注平台：[重点关注的平台]
- 目标人群：[主要讨论群体]

### 各Agent搜索建议
- Query Agent：[新闻搜索建议]
- Media Agent：[多媒体搜索建议]
- Insight Agent：[数据库查询建议]

### 潜在风险点
- [可能的敏感话题或争议点]`;

    @Input({ title: '用户需求', defaultValue: '' })
    userQuery: string = '';

    @Input()
    get userPrompt(): string {
        return `用户的舆情分析需求：

${this.userQuery}

请分析这个需求，提取关键词并生成搜索策略。`;
    }

    @Output({ title: '分析结果', defaultValue: '' })
    analysisResult = '';

    @Output({ title: '核心关键词', defaultValue: '' })
    coreKeywords = '';

    @Output({ title: '搜索策略', defaultValue: '' })
    searchStrategy = '';

    type: 'KeywordAgentAst' = 'KeywordAgentAst';
}
