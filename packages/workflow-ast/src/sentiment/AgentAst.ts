import { Ast, Input, IS_MULTI, Node, Output } from '@sker/workflow';

/**
 * AgentAst - 舆情分析 Agent 基类
 *
 * 所有舆情分析 Agent 的抽象基类，定义了通用的输入输出结构和执行模式。
 * 子类应实现具体的分析逻辑和系统提示词。
 *
 * 职责：
 * - 定义 LLM 调用的通用参数（temperature, top_p, model）
 * - 提供结构化的分析结果输出
 * - 作为所有舆情 Agent 的类型基础
 */
@Node({
    title: '舆情分析基类',
    type: 'sentiment',
    errorStrategy: 'retry',
    maxRetries: 3
})
export abstract class AgentAst extends Ast {
    // === 输入：LLM 参数 ===
    @Input({ title: '温度', defaultValue: 0.6 })
    temperature: number = 0.6;

    @Input({ title: 'Top P', defaultValue: 0.9 })
    top_p: number = 0.9;

    @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
    model: string = 'deepseek-ai/DeepSeek-V3.2';

    // === 输入：业务数据 ===
    @Input({ title: '分析主题', defaultValue: '' })
    topic: string = '';

    @Input({ title: '发言记录', mode: IS_MULTI, defaultValue: [] })
    speechesText: string[] = [];

    // 子类实现：系统提示词
    abstract get systemPrompt(): string;

    // === 输出：结构化结果 ===
    @Output({ title: '分析结果', defaultValue: '' })
    analysisResult: string = '';

    @Output({ title: '原始数据', defaultValue: null })
    rawData: unknown = null;

    @Output({ title: '建议', defaultValue: [] })
    suggestions: string[] = [];
}
