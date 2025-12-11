import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ShareAst, ChatMessage } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 群聊节点执行器 - 收集和组织消息
 *
 * 职责：
 * - 收集所有上游节点的消息（通过 IS_BUFFER | IS_MULTI）
 * - 组织成对话历史格式（ChatMessage[]）
 * - 输出历史记录供下游节点使用
 *
 * 注意：
 * - 每个上游消息会自动标记为 "Agent N"
 * - 如果需要自定义角色名，上游节点应该输出格式化的文本："[角色名]: 内容"
 */
@Injectable()
export class ShareAstVisitor {
    @Handler(ShareAst)
    handler(ast: ShareAst) {
        return new Observable<ShareAst>(obs => {
            ast.state = 'running';
            ast.count += 1;
            obs.next(ast);

            /**
             * 循环场景下的历史记录累积
             *
             * 优雅设计:
             * - 如果 previousHistory 有数据,从它开始(循环的第 N 轮)
             * - 否则从空数组开始(循环的第 1 轮)
             * - 追加当前轮次的新消息
             * - 这样即使节点被 clone,历史也能通过输入边传递
             */
            ast.chatHistory = Array.isArray(ast.previousHistory) && ast.previousHistory.length > 0
                ? [...ast.previousHistory] // 复制上一轮的历史
                : []; // 第一轮,从空开始

            // 追加本轮新消息
            ast.chatHistory.push({
                role: ast.username || '未知角色',
                content: ast.prompt,
                timestamp: new Date().toISOString()
            })

            // 格式化对话历史为 LLM 可读的字符串
            ast.formattedHistory = ast.chatHistory
                .map(msg => `【${msg.role}】${msg.content}`)
                .join('\n\n---\n\n');
            obs.next(ast);

            ast.state = 'success';
            obs.next(ast);
            obs.complete();
        });
    }
}
