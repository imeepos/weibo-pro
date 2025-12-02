import { Ast, Input, Node, Output } from '@sker/workflow';

/**
 * 条件分支节点
 *
 * 设计哲学：
 * - 存在即合理：仅暴露条件值与分支结果，充分利用边的 condition 机制
 * - 优雅即简约：不重复造轮子，与现有工作流引擎深度集成
 * - 代码即文档：类型和命名揭示一切
 *
 * 支持三种模式：
 * 1. if-else（二分支）：value 为 boolean，边条件为 true/false
 * 2. if-elseif-else（多分支）：value 为 string/number/enum，边条件为各分支值
 * 3. switch-case（多路分发）：value 为任意类型，边条件为各 case 值
 *
 * 用法示例：
 *
 * 【模式1：if-else】
 * ```
 * [数据源] → IfAst.value (输入: true/false)
 *             IfAst.result → [分支A] (边条件: { property: 'result', value: true })
 *             IfAst.result → [分支B] (边条件: { property: 'result', value: false })
 * ```
 *
 * 【模式2：if-elseif-else】
 * ```
 * [数据源] → IfAst.value (输入: 'success'/'error'/'pending')
 *             IfAst.result → [成功分支] (边条件: { property: 'result', value: 'success' })
 *             IfAst.result → [错误分支] (边条件: { property: 'result', value: 'error' })
 *             IfAst.result → [等待分支] (边条件: { property: 'result', value: 'pending' })
 * ```
 *
 * 【模式3：switch-case】
 * ```
 * [数据源] → IfAst.value (输入: 1/2/3)
 *             IfAst.result → [Case1] (边条件: { property: 'result', value: 1 })
 *             IfAst.result → [Case2] (边条件: { property: 'result', value: 2 })
 *             IfAst.result → [Default] (边条件: { property: 'result', value: 3 })
 * ```
 */
@Node({ title: '条件判断', type: 'control' })
export class IfAst extends Ast {
    @Input({ title: '条件值' })
    value: any = undefined;

    @Output({ title: '分支结果' })
    result: any = undefined;

    type: 'IfAst' = 'IfAst';
}
