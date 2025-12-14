import { Injectable, root } from "@sker/core";
import { INode } from "../types";
import { Observable, Subject, map, switchMap } from "rxjs";
import { WorkflowGraphAst } from "../ast";


/**
 * 节点由元数据加一些其他属性组成
 * {metadata: {class, inputs, outputs}, xxx}
 * 每个节点由多个input 和 多个output 还有一些运行中的 临时状态组成
 * 
 * 数据加工厂： visitor 是处理 不同的原材料 从不同的input传输过来， 经过加工 ，不同的成品从不同的 output 中出来
 * 
 * 工作流：决定了多个节点间的数据流转路径
 */

export class VisitorExecutor {
    visit(node: INode, ctx: WorkflowGraphAst): Observable<any> {
        return new Observable((obs) => {
            // 如果是 router 说明是分支控制
        })
    }
}

@Injectable()
export class Executor {
    /**
     * 执行制定工作流中的指定节点
     * @param node 执行的节点
     * @param input 执行的输入参数
     * @param ctx 执行的工作流
     * @returns 返回这个节点的执行结果
     */
    execute<In, Out>(node: INode, input: Subject<In>, ctx: WorkflowGraphAst): Observable<Out> {
        const visitor = root.get(VisitorExecutor);
        return input.pipe(
            map(data => Object.assign(node, data)),
            switchMap(updatedNode => visitor.visit(updatedNode, ctx) as Observable<Out>)
        );
    }
}
