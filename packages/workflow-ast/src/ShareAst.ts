
/**
 * 群聊节点 - 多个 LLM Agent 循环对话
 *
 * 架构设计：
 * - ShareAst 作为"群聊房间"，维护完整对话历史
 * - 内部循环调用 LLM，实现 A → B → A → B 的多轮对话
 * - 不依赖工作流图的循环边（DAG 不支持）
 *
 * 使用场景：
 * 1. 两个 LLM Agent 的辩论/讨论
 * 2. 多角色对话生成（如剧本创作）
 * 3. Agent 协作解决问题
 */

import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

export interface ChatMessage {
    role: string;        // Agent 角色名称
    content: string;     // 消息内容
    timestamp: string;   // 时间戳
}

@Node({ type: 'basic', title: '群聊室' })
export class ShareAst extends Ast {

    // === 输入配置 ===

    @Input({ title: 'Agent A 配置' })
    agentAConfig: {
        name: string;           // Agent 名称（如 "正方"）
        model: string;          // 模型名称
        systemPrompt: string;   // 系统提示词
        temperature?: number;   // 温度参数
    } = {
        name: 'Agent A',
        model: 'deepseek-ai/DeepSeek-V3',
        systemPrompt: '你是一个友好的助手',
        temperature: 0.7
    };

    @Input({ title: 'Agent B 配置' })
    agentBConfig: {
        name: string;
        model: string;
        systemPrompt: string;
        temperature?: number;
    } = {
        name: 'Agent B',
        model: 'deepseek-ai/DeepSeek-V3',
        systemPrompt: '你是一个友好的助手',
        temperature: 0.7
    };

    @Input({ title: '初始话题' })
    initialTopic: string = '';

    @Input({ title: '对话轮数' })
    maxRounds: number = 3;

    // === 运行时状态 ===

    @Output({ title: '对话历史' })
    chatHistory: ChatMessage[] = [];

    @Output({ title: '当前轮次' })
    currentRound: number = 0;

    @Output({ title: '完整对话文本' })
    fullConversation: string = '';

    type: `ShareAst` = `ShareAst`
}