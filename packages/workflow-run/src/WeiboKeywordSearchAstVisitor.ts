import { Inject, Injectable, createLogger } from "@sker/core";
import { Handler, NodeEvent } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import { WeiboHtmlParser } from "./services/WeiboHtmlParser";
import { PlaywrightService } from "./services/PlaywrightService";
import { WorkerBrowserService } from "./services/WorkerBrowserService";
import { WeiboAccountService } from "./services/weibo-account.service";
import { DelayService } from "./services/delay.service";
import { WeiboKeywordSearchExecutor } from "./services/WeiboKeywordSearchExecutor";
import { Observable, from } from "rxjs";
import { concatMap, mergeMap } from "rxjs/operators";
import { ErrorHandlerOperators } from "./utils/error-handler.util";
import { useEntityManager, EventEntity } from "@sker/entities";

const logger = createLogger('WeiboKeywordSearchAstVisitor');

/**
 * 微博关键词搜索节点执行器
 *
 * 仅保留 @Handler 响应式管道；搜索执行逻辑抽到
 * services/WeiboKeywordSearchExecutor.ts，日期格式化抽到
 * utils/weibo-date-format.util.ts。
 */
@Injectable()
export class WeiboKeywordSearchAstVisitor {
    private executor: WeiboKeywordSearchExecutor;

    constructor(
        @Inject(WeiboHtmlParser) parser: WeiboHtmlParser,
        @Inject(PlaywrightService) playwright: PlaywrightService,
        @Inject(WorkerBrowserService) workerBrowser: WorkerBrowserService,
        @Inject(WeiboAccountService) account: WeiboAccountService,
        @Inject(DelayService) private delayService: DelayService
    ) {
        this.executor = new WeiboKeywordSearchExecutor(parser, playwright, workerBrowser, account, delayService);
    }

    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            const wrappedCtx = {
                ...ctx,
                abortSignal: abortController.signal,
                get isAborted() {
                    return abortController.signal.aborted || (ctx as any).abortSignal?.aborted;
                }
            };

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;
                    obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

                    // 记录接收到的输入数据
                    logger.info('[WeiboKeywordSearch] 接收到输入数据:', {
                        inputDataKeys: inputData ? Object.keys(inputData) : [],
                        inputData: inputData,
                        astKeywordBefore: ast.keyword,
                        astEventIdBefore: ast.event_id,
                        astStartDateBefore: ast.startDate,
                        astEndDateBefore: ast.endDate
                    });

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    // 记录更新后的 AST 状态
                    logger.info('[WeiboKeywordSearch] 更新后的 AST 状态:', {
                        keyword: ast.keyword,
                        event_id: ast.event_id,
                        startDate: ast.startDate,
                        endDate: ast.endDate
                    });

                    await this.executor.executeSearch(ast, wrappedCtx, obs);
                    return [];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboKeywordSearchAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: async (error) => {
                    // 记录错误原因到事件
                    await useEntityManager(async (manager) => {
                        if (ast.event_id) {
                            const event = await manager.findOne(EventEntity, { where: { id: ast.event_id } });
                            if (event) {
                                event.crawl_end_reason = `搜索出错：${(error as Error).message}`;
                                await manager.save(EventEntity, event);
                            }
                        }
                    });

                    obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
                    // 发射 null 数据让下游节点可以继续处理
                    obs.next({
                        type: 'node_emit',
                        id: ast.id,
                        data: { mblogid: null, uid: null, isEnd: true }
                    });
                    obs.complete();
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
