import { Injectable, root } from '@sker/core';
import { Visitor, WorkflowGraphAst } from '../ast';
import { findNodeType, HANDLER_METHOD } from '../decorator';
import { NoRetryError } from '../errors';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { INode } from '../types';

/**
 * 访问者执行器 - 工作流引擎的核心执行者
 *
 * 优雅设计：
 * - 通过装饰器系统自动查找并调用 Handler
 * - 支持 Promise 和 Observable 两种返回类型的 Handler
 * - 统一错误处理，设置节点状态
 * - Observable 流式输出，支持交互式执行
 */
@Injectable()
export class VisitorExecutor implements Visitor {
    visit(ast: INode, ctx: WorkflowGraphAst): Observable<INode> {
        const type = findNodeType(ast.type);
        const methods = root.get(HANDLER_METHOD, []);

        if (!methods || methods.length === 0) {
            return this.handleError(new Error(`未找到任何 Handler`), ast);
        }

        const method = methods.find(it => it.ast === type);
        if (!method) {
            return this.handleError(new Error(`未找到节点 ${ast.type} 的 Handler`), ast);
        }

        const instance = root.get(method.target);
        if (!method.property || typeof (instance as any)[method.property] !== 'function') {
            return this.handleError(new Error(`Handler 方法不存在或不可调用: ${String(method.property)}`), ast);
        }

        try {
            const result = (instance as any)[method.property](ast, ctx);
            return this.normalizeResult(result, ast);
        } catch (error) {
            return this.handleError(error, ast);
        }
    }

    /**
     * 将 Handler 返回值统一为 Observable
     *
     * 优雅设计：
     * - 自动识别 Promise、Observable、同步值
     * - Promise -> Observable (使用 from)
     * - Observable -> 直接返回
     * - 同步值 -> Observable (使用 of)
     */
    private normalizeResult(result: any, ast: INode): Observable<INode> {
        if (result && typeof result.subscribe === 'function') {
            return result.pipe(
                catchError(error => this.handleError(error, ast))
            );
        }
        if (result && typeof result.then === 'function') {
            return from(result as Promise<INode>).pipe(
                switchMap(res => this.normalizeResult(res, ast)),
                catchError(error => this.handleError(error, ast))
            );
        }
        return of(result as INode).pipe(
            catchError(error => this.handleError(error, ast))
        );
    }

    /**
     * 统一错误处理
     *
     * 优雅设计：
     * - NoRetryError 不可重试错误特殊处理
     * - 设置节点状态为 fail
     * - 返回失败状态的节点（作为 Observable 完成）
     */
    private handleError(error: unknown, ast: INode): Observable<INode> {
        if (error instanceof Event) {
            ast.state = 'fail';
            ast.setError(error);
            return of(ast)
        }
        if (error instanceof NoRetryError) {
            ast.state = 'fail';
            ast.setError(error);
            return of(ast);
        }

        ast.state = 'fail';
        ast.setError(error);
        return of(ast);
    }
}
