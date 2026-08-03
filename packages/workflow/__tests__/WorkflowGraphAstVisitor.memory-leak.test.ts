import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Observable } from 'rxjs';
import { Ast, createWorkflowGraphAst, WorkflowGraphAst } from '../src/ast';
import { Node, Output, Handler } from '../src/decorator';
import { NodeEvent } from '../src/execution/events';
import { Injectable, root } from '@sker/core';
import { executeWorkflow } from '../src/executor';
import { Compiler } from '../src/compiler';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';

/**
 * 内存泄漏回归测试：WorkflowGraphAstVisitor 中节点执行流使用了
 * `shareReplay({ bufferSize: Infinity, refCount: false })`。
 *
 * 泄漏路径（已审计实证）：
 * - refCount: false 使最后订阅者退订时不拆除源订阅
 * - 配合 bufferSize: Infinity 无上限缓冲
 * - 当 run 被中断/取消（外层 subscription.unsubscribe()）或存在环图/长驻节点流不终止时，
 *   整条节点执行链（AST、ExecutionContext、LLM 流、上游 shareReplay）永久存活。
 *
 * 修复：`shareReplay({ bufferSize: Infinity, refCount: true })`，
 * 仅让 refCount 归零时拆除源，bufferSize 保持 Infinity（节点事件数本身有界，replay 语义不变）。
 */

// 一个执行源永不完成、但带 teardown 的节点（模拟长驻/环图中的节点流）
@Node({ title: '长驻节点', type: 'basic' })
class LongLivedNodeAst extends Ast {
    @Output({ title: '输出', defaultValue: '' })
    output: string = '';

    type: string = 'LongLivedNodeAst';
}

let teardownSpy = vi.fn();

@Injectable()
class LongLivedNodeVisitor {
    @Handler(LongLivedNodeAst)
    handler(ast: LongLivedNodeAst, _input$: Observable<any>, _ctx: WorkflowGraphAst): Observable<NodeEvent> {
        // 源 Observable 不发射、不完成，但构造时注册 teardown（模拟 LLM 流 / 外部环图驱动）
        return new Observable<NodeEvent>(() => () => {
            teardownSpy();
        });
    }
}

describe('WorkflowGraphAstVisitor - 节点执行流内存泄漏（shareReplay refCount）', () => {
    let compiler: Compiler;

    beforeAll(() => {
        root.get(LongLivedNodeVisitor);
        root.get(WorkflowGraphAstVisitor);
    });

    beforeEach(() => {
        teardownSpy = vi.fn();
        compiler = root.get(Compiler);
    });

    it('外层退订后应拆除节点执行源（source teardown 被调用）', () => {
        const node = compiler.compile(new LongLivedNodeAst());
        node.id = 'n1';
        node.type = 'LongLivedNodeAst';

        const workflow = createWorkflowGraphAst({
            nodes: [node],
            edges: [],
            entryNodeIds: ['n1'],
        });

        const subscription = executeWorkflow(workflow, {}).subscribe({ next: () => {} });

        // 节点已订阅，但尚未退订 → source teardown 不应被调用
        expect(teardownSpy).not.toHaveBeenCalled();

        // 在完成前退订（模拟 run 被中断/取消）
        subscription.unsubscribe();

        // 修复前：refCount:false 不拆源 → teardownSpy 未被调用（红）
        // 修复后：refCount:true 归零拆源 → teardownSpy 被调用（绿）
        expect(teardownSpy).toHaveBeenCalledTimes(1);
    });
});
