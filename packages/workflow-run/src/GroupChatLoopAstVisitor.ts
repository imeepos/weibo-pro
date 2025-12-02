import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { GroupChatLoopAst, ChatMessage } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 循环群聊执行器 - 通过环图驱动循环
 *
 * 核心设计：
 * - 不做内部循环，循环由外部环图驱动
 * - 职责：收集新消息 + 维护历史记录 + 输出历史文本
 * - 外部通过连线形成环：historyText → LLM → newMessages → historyText
 *
 * 工作原理：
 * 1. 接收 newMessages（来自上游 LLM 的回复）
 * 2. 追加到 chatHistory
 * 3. 输出 historyText 供下游 LLM 读取
 * 4. 下游 LLM 生成回复后再次输入到 newMessages → 形成循环
 */
@Injectable()
export class GroupChatLoopAstVisitor {
    @Handler(GroupChatLoopAst)
    handler(ast: GroupChatLoopAst) {
        return new Observable<GroupChatLoopAst>(obs => {
            ast.state = 'running';
            ast.count += 1;
            obs.next(ast);

            // 如果是第一次执行（chatHistory 为空），初始化历史
            if (ast.chatHistory.length === 0) {
                ast.chatHistory = [{
                    round: 0,
                    agentName: 'System',
                    content: ast.initialTopic,
                    timestamp: new Date().toISOString()
                }];
                ast.currentRound = 0;
            }

            ast.state = 'emitting';
            obs.next(ast);

            ast.state = 'success';
            obs.next(ast);
            obs.complete();
        });
    }
}
