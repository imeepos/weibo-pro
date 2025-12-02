/**
 * 循环群聊节点 - 通过连线组织多个 Agent 参与群聊
 *
 * 架构设计：
 * - 支持环图：通过连线形成循环反馈
 * - 职责：收集新消息 + 维护历史记录 + 输出历史文本
 * - 循环由外部连线驱动，不做内部循环
 *
 * 连线方式（环图）：
 * ```
 * GroupChatLoop ──> historyText ──┬──> LLM Agent A (读取历史作为 system)
 *       ↑                         │
 *       │                         └──> LLM Agent B (读取历史作为 system)
 *       │                                     │
 *       └─────────── newMessages ────────────┘
 * ```
 *
 * 工作原理：
 * 1. 初始：设置 initialTopic 作为第一条系统消息
 * 2. 输出：historyText 供下游 LLM 节点读取
 * 3. 接收：LLM 节点生成的回复通过 newMessages 输入
 * 4. 循环：追加新消息到历史 → 输出更新后的 historyText → LLM 再次读取
 */

import { Ast, Input, IS_MULTI, IS_BUFFER, Node, Output } from "@sker/workflow";

/**
 * Agent 配置（保留接口定义供未来扩展）
 */
export interface AgentConfig {
    name: string;           // Agent 名称（如 "正方"、"反方"）
    model: string;          // 模型名称
    systemPrompt: string;   // 系统提示词
    temperature?: number;   // 温度参数 (0-1)
}

/**
 * 对话消息
 */
export interface ChatMessage {
    round: number;          // 第几轮
    agentName: string;      // 发言者名称
    content: string;        // 消息内容
    timestamp: string;      // 时间戳
}

@Node({ type: 'llm', title: '循环群聊' })
export class GroupChatLoopAst extends Ast {

    // === 输入配置 ===

    @Input({ title: '初始话题' })
    initialTopic: string = '讨论人工智能的未来发展';

    @Input({ mode: IS_BUFFER | IS_MULTI, title: '新消息' })
    newMessages: string[] = [];

    @Input({ title: '最大轮数' })
    maxRounds: number = 10;

    // === 运行时状态 ===

    @Output({ title: '对话历史（数组）' })
    chatHistory: ChatMessage[] = [];

    @Output({ title: '对话历史（文本）' })
    historyText: string = '';

    @Output({ title: '当前轮次' })
    currentRound: number = 0;

    type: `GroupChatLoopAst` = `GroupChatLoopAst`;
}
