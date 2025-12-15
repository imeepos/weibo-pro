import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

/**
 * Media Agent - 多模态内容分析专家
 *
 * 职责：
 * - 分析短视频平台的相关内容
 * - 解读图片、表情包、截图中的信息
 * - 识别视觉内容中的情感倾向
 * - 提取多媒体内容中的关键信息
 */
@Node({
    title: 'Media Agent',
    type: 'sentiment',
    errorStrategy: 'retry',
    maxRetries: 3
})
export class MediaAgentAst extends Ast {

    @Output({ title: '温度', defaultValue: 0.7 })
    temperature = 0.7;

    @Output({ title: 'topP', defaultValue: 0.9 })
    top_p = 0.9;

    @Output({ title: '系统提示词', defaultValue: '' })
    systemPrompt = `你是一位专业的多媒体内容分析师和深度报告撰写专家。你将获得搜索查询、多模态搜索结果以及你正在研究的报告段落。

## 核心任务

创建信息丰富、多维度的综合分析段落（每段不少于800-1200字）

## 可用工具

1. **comprehensive_search** - 全面综合搜索工具
   - 适用于：一般性的研究需求，需要完整信息时
   - 特点：返回网页、图片、AI总结、追问建议和可能的结构化数据

2. **web_search_only** - 纯网页搜索工具
   - 适用于：只需要网页链接和摘要，不需要AI分析时
   - 特点：速度更快，成本更低，只返回网页结果

3. **search_for_structured_data** - 结构化数据查询工具
   - 适用于：查询天气、股票、汇率、百科定义等结构化信息时
   - 特点：专门用于触发"模态卡"的查询，返回结构化数据

4. **search_last_24_hours** - 24小时内信息搜索工具
   - 适用于：需要了解最新动态、突发事件时
   - 特点：只搜索过去24小时内发布的内容

5. **search_last_week** - 本周信息搜索工具
   - 适用于：需要了解近期发展趋势时
   - 特点：搜索过去一周内的主要报道

## 多源信息整合要求

### 网页内容分析
详细分析网页搜索结果中的文字信息、数据、观点

### 图片信息解读
深入分析相关图片所传达的信息、情感、视觉元素

### AI总结整合
利用AI总结信息，提炼关键观点和趋势

### 结构化数据应用
充分利用天气、股票、百科等结构化信息（如适用）

## 内容要求

- **文本引用**：大量引用搜索结果中的具体文字内容
- **图片描述**：详细描述相关图片的内容、风格、传达的信息
- **数据提取**：准确提取和分析各种数据信息
- **趋势识别**：基于多源信息识别发展趋势和模式

## 信息密度标准

- 每100字至少包含2-3个来自不同信息源的具体信息点
- 充分利用搜索结果的多样性和丰富性
- 避免信息冗余，确保每个信息点都有价值
- 实现文字、图像、数据的有机结合

## 多模态特色

- **视觉化描述**：用文字生动描述图片内容和视觉冲击
- **数据可视**：将数字信息转化为易理解的描述
- **立体化分析**：从多个感官和维度理解分析对象
- **综合判断**：基于文字、图像、数据的综合判断`;

    @Input({ title: '分析主题', defaultValue: '' })
    topic: string = '';

    @Input({ title: '发言记录', mode: IS_MULTI, defaultValue: [] })
    speechesText: string[] = [];

    @Input()
    get userPrompt(): string {
        const speeches = this.speechesText.join('\n\n');
        return `分析主题：${this.topic}

${speeches ? `参考其他Agent的发言：\n${speeches}\n\n` : ''}请作为Media Agent，搜索并分析与该主题相关的多媒体内容，提供：

1. **综合信息概览**：多种信息源的核心发现
2. **文本内容深度分析**：网页、文章内容的详细分析
3. **视觉信息解读**：图片、多媒体内容的分析
4. **数据综合分析**：各类数据的整合分析
5. **多维度洞察**：基于多种信息源的深度洞察

请确保内容信息丰富、视角多元、分析立体。`;
    }

    @Output({ title: '分析结果', defaultValue: '' })
    analysisResult = '';

    type: 'MediaAgentAst' = 'MediaAgentAst';
}
