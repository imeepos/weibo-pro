import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ShareAst, ChatMessage } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { ChatOpenAI } from "@langchain/openai";

/**
 * 群聊节点执行器 - 实现多轮 Agent 对话
 *
 * 执行流程：
 * 1. Agent A 根据初始话题发言
 * 2. Agent B 看到 A 的发言后回复
 * 3. Agent A 看到 B 的回复后继续
 * 4. 循环 N 轮直到达到 maxRounds
 *
 * 设计要点：
 * - 每个 Agent 看到完整的历史记录
 * - 使用 Observable 实时推送对话进度
 * - 支持取消操作
 */
@Injectable()
export class ShareAstVisitor {
    @Handler(ShareAst)
    handler(ast: ShareAst, ctx: any) {
        return new Observable<ShareAst>(obs => {
            const abortController = new AbortController();

            const run = async () => {
                try {
                    // 检查取消信号
                    if (ctx.abortSignal?.aborted) {
                        ast.state = 'fail';
                        ast.setError(new Error('工作流已取消'));
                        obs.next({ ...ast });
                        return;
                    }

                    ast.state = 'running';
                    ast.count += 1;
                    ast.chatHistory = [];
                    ast.currentRound = 0;
                    obs.next({ ...ast });

                    // 初始化两个 LLM
                    const agentA = new ChatOpenAI({
                        model: ast.agentAConfig.model,
                        temperature: ast.agentAConfig.temperature || 0.7
                    });

                    const agentB = new ChatOpenAI({
                        model: ast.agentBConfig.model,
                        temperature: ast.agentBConfig.temperature || 0.7
                    });

                    // Agent A 先发言（基于初始话题）
                    const initialMessage: ChatMessage = {
                        role: ast.agentAConfig.name,
                        content: ast.initialTopic,
                        timestamp: new Date().toISOString()
                    };
                    ast.chatHistory.push(initialMessage);
                    obs.next({ ...ast });

                    // 开始循环对话
                    for (let round = 1; round <= ast.maxRounds; round++) {
                        // 检查取消
                        if (ctx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        ast.currentRound = round;

                        // === Agent B 回复 ===
                        const historyForB = this.formatHistory(ast.chatHistory);
                        const promptForB = `${ast.agentBConfig.systemPrompt}\n\n对话历史：\n${historyForB}\n\n请基于以上对话继续你的回复：`;

                        const responseB = await agentB.invoke(promptForB);
                        const messageBContent = typeof responseB.content === 'string'
                            ? responseB.content
                            : JSON.stringify(responseB.content);

                        const messageB: ChatMessage = {
                            role: ast.agentBConfig.name,
                            content: messageBContent,
                            timestamp: new Date().toISOString()
                        };
                        ast.chatHistory.push(messageB);
                        obs.next({ ...ast });

                        // 如果是最后一轮，B 回复后就结束
                        if (round === ast.maxRounds) {
                            break;
                        }

                        // 检查取消
                        if (ctx.abortSignal?.aborted) {
                            throw new Error('工作流已取消');
                        }

                        // === Agent A 回复 ===
                        const historyForA = this.formatHistory(ast.chatHistory);
                        const promptForA = `${ast.agentAConfig.systemPrompt}\n\n对话历史：\n${historyForA}\n\n请基于以上对话继续你的回复：`;

                        const responseA = await agentA.invoke(promptForA);
                        const messageAContent = typeof responseA.content === 'string'
                            ? responseA.content
                            : JSON.stringify(responseA.content);

                        const messageA: ChatMessage = {
                            role: ast.agentAConfig.name,
                            content: messageAContent,
                            timestamp: new Date().toISOString()
                        };
                        ast.chatHistory.push(messageA);
                        obs.next({ ...ast });
                    }

                    // 生成完整对话文本
                    ast.fullConversation = ast.chatHistory
                        .map(msg => `[${msg.role}]: ${msg.content}`)
                        .join('\n\n');

                    ast.state = 'emitting';
                    obs.next({ ...ast });

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete();

                } catch (e) {
                    ast.state = 'fail';
                    ast.error = e as Error;
                    obs.next({ ...ast });
                    obs.complete();
                }
            };

            run();

            // 返回清理函数
            return () => {
                console.log('[ShareAstVisitor] 订阅被取消');
                abortController.abort();
                obs.complete();
            };
        });
    }

    /**
     * 格式化历史记录为文本
     */
    private formatHistory(history: ChatMessage[]): string {
        return history
            .map(msg => `[${msg.role}]: ${msg.content}`)
            .join('\n\n');
    }
}
