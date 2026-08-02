import { isObservable, Observable, from } from "rxjs";
import { INode } from "./types";
import { NodeEvent } from "./execution/events";
import { setAstError } from "./ast-utils";
import { WorkflowGraphAst } from "./ast";
import { InjectionToken, Injectable } from "@sker/core";
import { concatMap, mergeMap } from "rxjs/operators";

/**
 * 默认访问者接口
 *
 * 当节点没有找到对应的 @Handler 时，使用默认访问者执行
 *
 * 双容器模式：
 * - 后端：使用 DefaultVisitor（本地执行）
 * - 前端：使用 RemoteDefaultVisitor（远程代理执行）
 */
export interface IDefaultVisitor {
    visit(ast: INode, input$: Observable<INode>, workflow?: WorkflowGraphAst): Observable<NodeEvent>;
}

/**
 * 默认访问者的 DI Token
 */
export const DEFAULT_VISITOR = new InjectionToken<IDefaultVisitor>('DEFAULT_VISITOR');

/**
 * 默认访问者实现 - 后端使用
 *
 * 简单的输入输出透传逻辑：
 * - 将输入的所有属性复制到输出
 * - 适用于没有特殊处理逻辑的节点
 */
@Injectable()
export class DefaultVisitor implements IDefaultVisitor {
    visit(ast: INode, input$: Observable<INode>, _workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable(obs => {
            console.log(`DefaultVisitor run ${ast.type}`)
            if (!input$) throw new Error(`[DefaultVisitor.handler] input$ is empty`)
            if (!isObservable(input$)) throw new Error(`[DefaultVisitor.handler] input$ must be an Observable`)
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (data) => {
                    // 默认 一个输入 一个输出 输出直接等于输入
                    const emitData: Record<string, any> = {};
                    ast.metadata?.inputs.forEach(input => {
                        ast.metadata?.outputs.forEach(output => {
                            ast[output.property] = data[input.property];
                            emitData[output.property] = ast[output.property];
                        })
                    })
                    return [
                        { type: 'node_emit' as const, id: ast.id, data: emitData }
                    ];
                }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                    // 发射空数据让下游继续
                    obs.next({ type: 'node_emit', id: ast.id, data: {} })
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete();
                }
            })

            return () => subscription.unsubscribe();
        });
    }
}