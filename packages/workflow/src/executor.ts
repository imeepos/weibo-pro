import { ArrayIteratorAst, Ast, Visitor, WorkflowGraphAst } from "./ast";
import { Handler } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
import { WorkflowScheduler } from './execution/scheduler';
import { VisitorExecutor } from './execution/visitor-executor';
import { Observable } from 'rxjs';
import { expand, takeWhile, last } from 'rxjs/operators';
import { Injectable, root } from "@sker/core";

export type NodeHandler = (ast: Ast, ctx: Visitor) => Promise<any>;
export type DispatchTable = Map<string, NodeHandler>;

@Injectable()
export class WorkflowExecutorVisitor {
    private scheduler = new WorkflowScheduler();

    /**
     * 执行工作流图
     *
     * 优雅设计：
     * - 委托给 WorkflowScheduler 执行调度
     * - WorkflowScheduler.schedule 返回 Observable
     * - VisitorExecutor 会自动将 Observable 处理为流式输出
     * - 保持 async 返回 Promise 以保持向后兼容
     */
    @Handler(WorkflowGraphAst)
    async visit(ast: WorkflowGraphAst, ctx: any): Promise<INode> {
        // scheduler.schedule 返回 Observable，使用 lastValueFrom 转为 Promise
        const { lastValueFrom } = await import('rxjs');
        return lastValueFrom(this.scheduler.schedule(ast, ctx));
    }
}

@Injectable()
export class ArrayIteratorVisitor {
    @Handler(ArrayIteratorAst)
    async visit(ast: ArrayIteratorAst, _ctx: any): Promise<ArrayIteratorAst> {
        const { array, currentIndex } = ast;

        if (!Array.isArray(array) || array.length === 0) {
            ast.state = 'success';
            ast.isDone = true;
            ast.hasNext = false;
            ast.currentItem = undefined;
            return ast;
        }

        if (currentIndex >= array.length) {
            ast.state = 'success';
            ast.isDone = true;
            ast.hasNext = false;
            ast.currentItem = undefined;
            return ast;
        }

        ast.currentItem = array[currentIndex];
        ast.hasNext = currentIndex + 1 < array.length;
        ast.isDone = currentIndex + 1 >= array.length;
        ast.currentIndex = currentIndex + 1;
        ast.state = 'success';

        return ast;
    }
}

/**
 * 执行单个 AST 节点
 *
 * 优雅设计：
 * - 返回 Observable 支持流式输出
 * - 自动转换 JSON 为 AST 实例
 * - 委托给 Visitor 执行
 */
export function executeAst<S extends INode>(state: S, context: any): Observable<S> {
    const ast = fromJson(state);
    const visitor = root.get(VisitorExecutor)
    return visitor.visit(ast, context) as Observable<S>;
}

/**
 * 循环执行 AST 直到完成
 *
 * 优雅设计：
 * - 使用 RxJS expand 操作符实现递归执行
 * - 自动循环直到节点状态为 success 或 fail
 * - 返回 Observable<S> 支持流式监控
 * - 使用 last() 获取最终状态
 *
 * @deprecated 推荐直接使用 executeAst，由调用方控制执行流程
 */
export function execute<S extends INode>(
    state: S,
    context: any,
): Observable<S> {
    return executeAst(state, context).pipe(
        expand(currentState => {
            // 如果状态是 pending 或 running，继续执行
            if (currentState.state === 'pending' || currentState.state === 'running') {
                return executeAst(currentState as S, context);
            }
            // 否则，返回空 Observable，停止递归
            return [];
        }),
        // 持续执行直到状态不再是 pending 或 running
        takeWhile(currentState =>
            currentState.state === 'pending' || currentState.state === 'running',
            true // inclusive: true - 包括最后一个不满足条件的值
        ),
        // 获取最后一个状态（即最终状态）
        last()
    );
}
