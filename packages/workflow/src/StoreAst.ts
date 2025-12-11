import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";
import { BehaviorSubject } from "rxjs";

/**
 * 存储获取节点
 *
 * 用途：从工作流全局存储中读取变量值
 * 场景：跨节点数据传递、状态保持、配置共享
 */
@Node({ title: '获取存储', type: 'basic' })
export class StoreGetAst extends Ast {
    type: `StoreGetAst` = `StoreGetAst`

    @Input({ title: '键名' })
    key: string = ``

    @Output({ title: '值' })
    value: BehaviorSubject<any> = new BehaviorSubject<any>(``)
}

/**
 * 存储设置节点
 *
 * 用途：将数据写入工作流全局存储
 * 场景：缓存计算结果、保存中间状态、跨节点传递数据
 */
@Node({ title: '设置存储', type: 'basic' })
export class StoreSetAst extends Ast {
    type: `StoreSetAst` = `StoreSetAst`

    @Input({ title: '键名' })
    key: string = ``

    @Input({ title: '值' })
    @Output({ title: '值' })
    value: BehaviorSubject<any> = new BehaviorSubject<any>(``)
}

