import { Injectable, root } from '@sker/core';
import { Visitor, WorkflowGraphAst, setAstError } from '../ast';
import { findNodeType, HANDLER_METHOD } from '../decorator';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap, concatMap } from 'rxjs/operators';
import { INode } from '../types';
import { DefaultVisitor } from '../defaultVisitor';
import { NodeEvent } from './events';

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
    visit(ast: INode, input$: Observable<any>, parent?: WorkflowGraphAst): Observable<NodeEvent> {
        const type = findNodeType(ast.type);
        const methods = root.get(HANDLER_METHOD, []);

        if (!methods || methods.length === 0) {
            return this.handleError(new Error(`未找到任何 Handler`), ast);
        }

        const method = methods.find(it => it.ast === type);
        if (!method) {
            return this.useDefaultVisitor(ast, input$, parent);
        }

        const instance = root.get(method.target);
        if (!method.property || typeof (instance as any)[method.property] !== 'function') {
            return this.handleError(new Error(`Handler 方法不存在或不可调用: ${String(method.property)}`), ast);
        }

        try {
            // 检查 Handler 的参数数量，判断是新模式还是旧模式
            const handlerFn = (instance as any)[method.property];
            const handlerLength = handlerFn.length;

            // 新模式：handler(ast, ctx) - 需要将 input$ 数据应用到 ast
            // 旧模式：handler(ast, input$, ctx) - 直接传递 input$
            if (handlerLength <= 2) {
                // 新模式：从 input$ 中提取数据并应用到 ast
                return input$.pipe(
                    concatMap(inputData => {
                        // 将输入数据应用到节点对象
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                        const result = handlerFn.call(instance, ast, parent);
                        return this.normalizeResult(result, ast);
                    }),
                    catchError(error => this.handleError(error, ast))
                );
            } else {
                // 旧模式：直接传递 input$
                const result = handlerFn.call(instance, ast, input$, parent);
                return this.normalizeResult(result, ast);
            }
        } catch (error) {
            return this.handleError(error, ast);
        }
    }

    /**
     * 将 Handler 返回值统一为 Observable
     *
     * 优雅设计：
     * - 自动识别 Promise、Observable、同步值
     * - 直接传递所有事件，不做转换
     * - 错误转换为失败节点（Error as Data 模式）
     * - 支持嵌套类型：Promise<Observable<INode>>
     */
    private normalizeResult(result: any, ast: INode): Observable<NodeEvent> {
        // 1. Observable → 直接传递，只处理错误
        if (result && typeof result.subscribe === 'function') {
            return result.pipe(
                catchError(error => this.handleError(error, ast))
            );
        }

        // 2. Promise → 转 Observable，支持嵌套（Promise<Observable>）
        if (result && typeof result.then === 'function') {
            return from(result as Promise<any>).pipe(
                switchMap(res => {
                    // Promise resolve 的值可能是 Observable，需要递归处理
                    if (res && typeof res.subscribe === 'function') {
                        return this.normalizeResult(res, ast);
                    }
                    return of(res);
                }),
                catchError(error => this.handleError(error, ast))
            );
        }

        // 3. 同步值 → 包装为 Observable
        return of(result as NodeEvent).pipe(
            catchError(error => this.handleError(error, ast))
        );
    }

    private useDefaultVisitor(ast: INode, input$: Observable<any>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        const defaultVisitor = new DefaultVisitor();
        return defaultVisitor.visit(ast, input$, workflow).pipe(
            catchError(error => this.handleError(error, ast))
        );
    }

    /**
     * 创建失败状态的节点
     *
     * 优雅设计：
     * - 纯函数：不修改原节点，返回新节点
     * - Error as Data：错误作为节点的属性，而非异常
     */
    private createFailedNode(ast: INode, error: unknown): NodeEvent {
        const failedNode = { ...ast };
        failedNode.state = 'fail';
        setAstError(failedNode, error);
        return { type: 'node_fail', id: ast.id, data: ast };
    }

    /**
     * 统一错误处理（保留用于兼容性）
     *
     * 优雅设计：
     * - NoRetryError 不可重试错误特殊处理
     * - 设置节点状态为 fail
     * - 返回失败状态的节点（作为 Observable 完成）
     */
    private handleError(error: unknown, ast: INode): Observable<NodeEvent> {
        return of(this.createFailedNode(ast, error));
    }
}
