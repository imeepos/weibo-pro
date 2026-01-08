import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { StoryQualityLoopAst, QualityResult, RewriteRequest } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';

/**
 * 故事质量循环执行器
 *
 * 设计哲学：
 * - 存在即合理：循环反馈是必需的，通过 IS_BUFFER 避免死锁
 * - 优雅即简约：判断逻辑清晰，职责单一
 * - 性能即艺术：及时退出循环，避免无意义的重试
 */
@Injectable()
export class StoryQualityLoopAstVisitor {
  @Handler(StoryQualityLoopAst)
  visit(
    ast: StoryQualityLoopAst,
    input$: Observable<Record<string, unknown>>,
    ctx: WorkflowGraphAst
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            ast.emitCount += 1;
            obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })
            // 应用输入数据
            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            // 初始状态：首次运行，qualityResults 为空
            if (ast.qualityResults.length === 0) {
              console.log('[StoryQualityLoop] 初始状态，触发首次生成');
              ast.currentAttempt = 1;
              ast.isComplete = false;

              // 输出 undefined 触发 StoryWeaver（通过 Switch 节点路由）
              ast.rewriteRequest = undefined;
              ast.finalChapter = undefined;

              return [
                { type: 'node_emit' as const, id: ast.id, data: { currentAttempt: 1, isComplete: false } }
              ];
            }

            // 获取最新的质检结果
            const latestResult = ast.qualityResults[ast.qualityResults.length - 1]!;
            ast.currentAttempt = ast.qualityResults.length;

            console.log(
              `[StoryQualityLoop] 第${ast.currentAttempt}次尝试，分数: ${latestResult.score}，通过: ${latestResult.passed}`
            );

            // 判断 1：质量达标
            if (latestResult.passed || latestResult.score >= ast.minQualityScore) {
              console.log('[StoryQualityLoop] ✅ 质量达标，输出最终章节');
              ast.isComplete = true;
              ast.rewriteRequest = undefined;

              // 从最新结果中提取 chapter（假设 QualityChecker 返回的结果包含 chapter）
              interface QualityResult {
                chapter?: Record<string, unknown>;
                score?: number;
                passed?: boolean;
              }

              const finalChapter = (latestResult as QualityResult).chapter;
              ast.finalChapter = finalChapter as any;

              return [
                { type: 'node_emit' as const, id: ast.id, data: { finalChapter, isComplete: true, currentAttempt: ast.currentAttempt } }
              ];
            }

            // 判断 2：超过最大重试次数
            if (ast.currentAttempt >= ast.maxRetries) {
              console.warn(
                `[StoryQualityLoop] ⚠️ 已达最大重试次数（${ast.maxRetries}），强制输出最终章节`
              );
              ast.isComplete = true;
              ast.rewriteRequest = undefined;

              const finalChapter = (latestResult as QualityResult).chapter;
              ast.finalChapter = finalChapter as any;

              return [
                { type: 'node_emit' as const, id: ast.id, data: { finalChapter, isComplete: true, currentAttempt: ast.currentAttempt } }
              ];
            }

            // 判断 3：质量不达标，触发重写
            console.log('[StoryQualityLoop] ⚠️ 质量不达标，触发重写');
            ast.isComplete = false;
            ast.finalChapter = undefined;

            interface ChapterContent {
              content?: string;
              [key: string]: unknown;
            }

            const rewriteRequest: RewriteRequest = {
              previousContent: ((latestResult as QualityResult).chapter as ChapterContent)?.content || '',
              issues: latestResult.issues,
              suggestions: latestResult.suggestions,
              attemptNumber: ast.currentAttempt + 1
            };
            ast.rewriteRequest = rewriteRequest;

            return [
              { type: 'node_emit' as const, id: ast.id, data: { rewriteRequest, isComplete: false, currentAttempt: ast.currentAttempt } }
            ];
          })
        )
        .subscribe({
          next: (events: NodeEvent[]) => {
            events.forEach((event) => obs.next(event));
          },
          error: (error) => {
            ast.state = 'fail';
            setAstError(ast, error);
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          }
        });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
