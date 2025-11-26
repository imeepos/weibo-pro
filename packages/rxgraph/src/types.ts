
/**
 * rxjs的Obervable是一等公民
 * zod 做类型校验
 * json schema 自动生成表单
 */
import { Observable, Subject } from 'rxjs'
/**
 * 节点：流的转换单元 
 * 图也是节点，实现递归组合
 */
export interface RxNode<In = unknown, Out = unknown> {
    id: string;
    inputs$: Subject<In>;
    outputs$: Observable<Out>;
}
/**
 * 边：：连接节点的数据流
 */
export interface RxEdge {
    from: string;
    to: string;
    fromPort?: string;
    toPort?: string;
}

/**
 * 端口：子图与外界的接口
 */
export interface RxPort {
    id: string;
    nodeId: string;
}

/**
 * 图：节点的容器，本身也是节点 
 * 递归组合的核心：图可以嵌套图
 */
export interface RxGraph<In = unknown, Out = unknown> extends RxNode<In, Out> {
    nodes: Array<RxNode | RxGraph>;
    edges: RxEdge[];
    inputPorts?: RxPort[];
    outputPorts?: RxPort[];
}
