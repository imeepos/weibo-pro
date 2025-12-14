import { Injectable } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
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
    handler(ast: ShareAst): Observable<NodeEvent> {
        return new Observable(obs => {
            ast.state = 'running';
            ast.count += 1;
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            const currentHistory = Array.isArray(ast.previousHistory) && ast.previousHistory.length > 0
                ? [...ast.previousHistory]
                : [];

            currentHistory.push({
                role: ast.username || '未知角色',
                content: ast.prompt,
                timestamp: new Date().toISOString()
            })

            obs.next({ type: 'node_emit', id: ast.id, property: 'chatHistory', value: currentHistory });

            const formatted = currentHistory
                .map(msg => `【${msg.role}】${msg.content}`)
                .join('\n\n---\n\n');
            obs.next({ type: 'node_emit', id: ast.id, property: 'formattedHistory', value: formatted });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        });
    }
}
