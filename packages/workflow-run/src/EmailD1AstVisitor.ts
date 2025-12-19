import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { EmailD1Ast } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';

interface EmailD1Data {
  id: number;
  address: string;
  from_address: string;
  subject: string | null;
  content: string;
  message_id: string | null;
  received_at: string;
}

@Injectable()
export class EmailD1AstVisitor {
  @Handler(EmailD1Ast)
  handler(ast: EmailD1Ast, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      ast.count += 1;
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            ast.emitCount += 1;
            obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            // 生成随机邮箱地址
            const username = this.generateRandomString(10);
            const email = `${username}@${ast.domain}`;
            ast.email = email;

            // 先输出邮箱地址
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { email: ast.email },
            });

            // 轮询检查邮件（最多等待 30 秒）
            const maxAttempts = 30;
            const pollInterval = 1000; // 1 秒
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              if (abortController.signal.aborted) {
                throw new Error('工作流已取消');
              }

              const message = await this.getLatestMessage(email, ast.apiUrl);

              if (message) {
                ast.message = message;
                obs.next({
                  type: 'node_emit',
                  id: ast.id,
                  data: { email: ast.email },
                });
                return []
              }

              // 等待一秒后重试
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
              obs.next({
                type: 'node_progress',
                id: ast.id,
                data: { status: 'executing', stage: 'wait', message: `${maxAttempts - attempt}s` },
              });
            }
            throw new Error(`获取邮件超时:${ast.email}`);
          }),
          mergeMap((events: NodeEvent[]) => from(events))
        )
        .subscribe({
          next: (event: NodeEvent) => {
            obs.next(event);
          },
          error: (error) => {
            ast.state = 'fail';
            setAstError(ast, error instanceof Error ? error : new Error(String(error)));
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
            obs.complete();
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          },
        });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async getLatestMessage(
    address: string,
    apiUrl: string
  ): Promise<{
    id: string;
    from: string;
    subject: string;
    content: string;
    receivedAt: Date;
  } | null> {
    const url = `${apiUrl}/api/latest?address=${encodeURIComponent(address)}`;

    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`获取邮件失败: ${response.statusText}`);
    }

    try {
      const email: EmailD1Data = await response.json();
      return {
        id: email.id.toString(),
        from: email.from_address,
        subject: email.subject || '',
        content: email.content,
        receivedAt: new Date(email.received_at),
      };
    } catch (error) {
      // JSON 解析失败说明暂无邮件，返回 null 继续轮询
      return null;
    }
  }
}
