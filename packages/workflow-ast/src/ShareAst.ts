
/**
 * 群聊节点 - 通过连线组织 LLM 群聊
 *
 * 架构设计：
 * - ShareAst 作为"群聊房间"，收集所有上游节点的消息
 * - 使用 IS_BUFFER | IS_MULTI 模式收集多个 LLM 的输出
 * - 维护完整的对话历史记录
 * - 输出历史记录供下游节点（其他 LLM）读取
 *
 * 连线方式：
 * ```
 * LLM A (text) ──┐
 *                ├──> ShareAst (prompt) ──> chatHistory ──> LLM B (prompt)
 * LLM B (text) ──┘
 * ```
 *
 * 工作原理：
 * 1. LLM A 输出 text → ShareAst 收集到 prompt
 * 2. LLM B 输出 text → ShareAst 收集到 prompt
 * 3. ShareAst 组织成历史记录并输出
 * 4. 其他 LLM 可以读取 chatHistory 来生成回复
 */

import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

export interface ChatMessage {
    role: string;        // 发言者角色
    content: string;     // 消息内容
    timestamp: string;   // 时间戳
}

@Node({ type: 'basic', title: '群聊室' })
export class ShareAst extends Ast {

    // === 输入：收集所有上游消息 ===

    @Input({ title: '消息输入' })
    prompt: string = ``;

    @Input({ title: '名称' })
    username: string = ``

    @Input({ title: '介绍' })
    profile: string = ``

    // === 输出：对话历史 ===

    @Output({ title: '对话历史' })
    chatHistory: ChatMessage[] = [];

    type: `ShareAst` = `ShareAst`
}