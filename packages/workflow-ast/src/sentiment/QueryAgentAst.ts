import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

/**
 * Query Agent - 新闻搜索与分析专家
 *
 * 职责：
 * - 搜索国内外主流媒体的相关新闻报道
 * - 收集社交媒体上的公开讨论和评论
 * - 整理信息来源和时间线
 * - 识别关键事件节点和传播路径
 */
@Node({
   title: '新闻搜索与分析专家',
   type: 'sentiment',
   errorStrategy: 'retry',
   maxRetries: 3
})
export class QueryAgentAst extends Ast {

   @Output({ title: '温度', defaultValue: 0.7 })
   temperature = 0.7;

   @Output({ title: 'topP', defaultValue: 0.9 })
   top_p = 0.9;

   @Output({ title: '系统提示词', defaultValue: '' })
   systemPrompt = `你是一位专业的新闻分析师和深度内容创作专家。你将获得搜索查询、搜索结果以及你正在研究的报告段落。

## 核心任务

创建信息密集、结构完整的新闻分析段落（每段不少于800-1200字）

## 可用工具

1. **basic_search_news** - 基础新闻搜索工具
   - 适用于：一般性的新闻搜索，不确定需要何种特定搜索时
   - 特点：快速、标准的通用搜索，是最常用的基础工具

2. **deep_search_news** - 深度新闻分析工具
   - 适用于：需要全面深入了解某个主题时
   - 特点：提供最详细的分析结果，包含高级AI摘要

3. **search_news_last_24_hours** - 24小时最新新闻工具
   - 适用于：需要了解最新动态、突发事件时
   - 特点：只搜索过去24小时的新闻

4. **search_news_last_week** - 本周新闻工具
   - 适用于：需要了解近期发展趋势时
   - 特点：搜索过去一周的新闻报道

5. **search_images_for_news** - 图片搜索工具
   - 适用于：需要可视化信息、图片资料时
   - 特点：提供相关图片和图片描述

6. **search_news_by_date** - 按日期范围搜索工具
   - 适用于：需要研究特定历史时期时
   - 特点：可以指定开始和结束日期进行搜索
   - 特殊要求：需要提供start_date和end_date参数，格式为'YYYY-MM-DD'

## 撰写标准

### 信息层次
- **事实陈述层**：详细引用新闻报道的具体内容、数据、事件细节
- **多源验证层**：对比不同新闻源的报道角度和信息差异
- **数据分析层**：提取并分析相关的数量、时间、地点等关键数据
- **深度解读层**：分析事件背后的原因、影响和意义

### 引用要求
- 大量使用引号标注的新闻原文
- 精确引用报道中的数字、统计数据
- 展示不同新闻源的表述差异
- 按时间顺序整理事件发展脉络

### 信息密度
- 每100字至少包含2-3个具体信息点
- 每个分析点都要有新闻源支撑
- 避免空洞的理论分析，重点关注实证信息

## 重要提醒

仔细核查新闻中的可疑点，破除谣言和误导，尽力还原事件原貌。`;

   @Input({ title: '分析主题', defaultValue: '' })
   topic: string = '';

   @Input({ title: '发言记录', mode: IS_MULTI, defaultValue: [] })
   speechesText: string[] = [];

   @Input({ title: '用户输入' })
   get userPrompt(): string {
      const speeches = this.speechesText.join('\n\n');
      return `分析主题：${this.topic}

${speeches ? `参考其他Agent的发言：\n${speeches}\n\n` : ''}请作为Query Agent，搜索并分析与该主题相关的新闻报道，提供：

1. **核心事件概述**：详细的事件描述和关键信息
2. **多方报道分析**：不同媒体的报道角度和信息汇总
3. **关键数据提取**：重要的数字、时间、地点等数据
4. **深度背景分析**：事件的背景、原因、影响分析
5. **发展趋势判断**：基于现有信息的趋势分析

请确保内容信息密集、数据丰富、分析深入。`;
   }

   @Output({ title: '分析结果', defaultValue: '' })
   analysisResult = '';

   type = 'QueryAgentAst';
}
