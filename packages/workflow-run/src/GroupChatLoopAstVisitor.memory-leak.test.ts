import { describe, it, expect } from 'vitest';
import { Subject } from 'rxjs';
import { GroupChatLoopAstVisitor } from './GroupChatLoopAstVisitor';
import { GroupChatLoopAst } from '@sker/workflow-ast';

/**
 * 内存泄漏回归测试：GroupChatLoopAstVisitor 中
 * `new Observable(obs => { ... input$.subscribe({...}) ... })` 缺少 `return () => sub.unsubscribe()`。
 *
 * 泄漏路径（已审计实证）：
 * - 该节点依赖外部环图驱动，input$ 不 complete
 * - 每次执行都留下存活订阅（input$ 的 observer 永不拆除）
 *
 * 修复：存储 input$.subscribe(...) 返回值，并在 Observable teardown 中 unsubscribe。
 */
describe('GroupChatLoopAstVisitor - 缺失 teardown 修复', () => {
    it('外层退订后应拆除对 input$ 的内部订阅', () => {
        const visitor = new GroupChatLoopAstVisitor();
        const ast = new GroupChatLoopAst();
        ast.id = 'loop-1';
        const input$ = new Subject<Record<string, unknown>>();

        const output$ = visitor.visit(ast, input$, {} as Record<string, unknown>);
        const sub = output$.subscribe({ next: () => {} });

        // 内部已订阅 input$（输入源不 complete，长期驻留）
        expect(input$.observed).toBe(true);

        // 退订外层（模拟 run 被中断/取消）
        sub.unsubscribe();

        // 修复前：缺少 teardown，内部订阅残留 → observed 仍为 true（红）
        // 修复后：teardown 拆除内部订阅 → observed 为 false（绿）
        expect(input$.observed).toBe(false);
    });

    it('修复后 input$ 不再向已退订节点传递消息', () => {
        const visitor = new GroupChatLoopAstVisitor();
        const ast = new GroupChatLoopAst();
        ast.id = 'loop-2';
        const input$ = new Subject<Record<string, unknown>>();
        const emitted: unknown[] = [];

        const output$ = visitor.visit(ast, input$, {} as Record<string, unknown>);
        const sub = output$.subscribe({ next: (e) => emitted.push(e) });

        sub.unsubscribe();

        // 退订后仍向 input$ 推入数据，若内部订阅泄漏则会产生新的 node_emit 事件
        input$.next({});
        expect(emitted.filter(e => (e as { type?: string }).type === 'node_emit').length).toBe(0);
    });
});
