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

            // 组织成 ChatMessage 格式
            ast.chatHistory = ast.chatHistory || [];
            ast.chatHistory.push({
                role: ast.username || '未知角色',
                content: ast.prompt,
                timestamp: new Date().toISOString()
            })

            // 格式化对话历史为 LLM 可读的字符串
            ast.formattedHistory = ast.chatHistory
                .map(msg => `【${msg.role}】${msg.content}`)
                .join('\n\n---\n\n');

            console.log('[ShareAstVisitor] 格式化历史记录:', {
                totalMessages: ast.chatHistory.length,
                formattedLength: ast.formattedHistory.length,
                latestRole: ast.username
            });

            ast.state = 'emitting';
            obs.next(ast);

            ast.state = 'success';
            obs.next(ast);
            obs.complete();
        });
    }
}
