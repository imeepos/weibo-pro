import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { IfAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

/**
 * 条件分支节点执行器
 *
 * 设计哲学：
 * - 存在即合理：执行器的唯一职责是将条件值传递到分支结果
 * - 优雅即简约：无需复杂逻辑，充分信任边的条件机制
 *
 * 执行流程：
 * 1. 读取 value 输入（可以是任意类型）
 * 2. 设置 result 输出为相同值
 * 3. 下游节点通过边的条件过滤自动执行对应分支
 *
 * 支持场景：
 * - if-else: value = true/false
 * - if-elseif-else: value = 'branch1'/'branch2'/'default'
 * - switch-case: value = 1/2/3/...
 */
@Injectable()
export class IfAstVisitor {
    @Handler(IfAst)
    handler(ast: IfAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running';
            obs.next({ ...ast });
            ast.result = ast.value;

            obs.next({ ...ast });

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        });
    }
}
