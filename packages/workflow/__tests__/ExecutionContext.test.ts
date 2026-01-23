import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, NodeExecutionState } from '../src/execution/ExecutionContext';

describe('ExecutionContext', () => {
    let ctx: ExecutionContext;

    beforeEach(() => {
        ctx = new ExecutionContext();
    });

    describe('基础功能', () => {
        it('创建时生成唯一 executionId', () => {
            const ctx1 = new ExecutionContext();
            const ctx2 = new ExecutionContext();

            expect(ctx1.executionId).toBeDefined();
            expect(ctx2.executionId).toBeDefined();
            expect(ctx1.executionId).not.toBe(ctx2.executionId);
        });

        it('记录执行开始时间', () => {
            const before = new Date();
            const ctx = new ExecutionContext();
            const after = new Date();

            expect(ctx.startTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(ctx.startTime.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('计算执行时长', async () => {
            const ctx = new ExecutionContext();
            await new Promise(resolve => setTimeout(resolve, 10));
            const duration = ctx.getDuration();

            expect(duration).toBeGreaterThanOrEqual(10);
        });
    });

    describe('节点状态管理', () => {
        it('惰性初始化节点状态', () => {
            expect(ctx.hasNodeState('node1')).toBe(false);

            const state = ctx.getNodeState('node1');

            expect(ctx.hasNodeState('node1')).toBe(true);
            expect(state.state).toBe('pending');
            expect(state.count).toBe(0);
            expect(state.emitCount).toBe(0);
            expect(state.error).toBeUndefined();
        });

        it('多次获取返回同一状态对象', () => {
            const state1 = ctx.getNodeState('node1');
            const state2 = ctx.getNodeState('node1');

            expect(state1).toBe(state2);
        });

        it('不同节点有独立状态', () => {
            const state1 = ctx.getNodeState('node1');
            const state2 = ctx.getNodeState('node2');

            state1.state = 'running';
            state2.state = 'success';

            expect(state1.state).toBe('running');
            expect(state2.state).toBe('success');
        });

        it('可以修改节点状态', () => {
            const state = ctx.getNodeState('node1');

            state.state = 'running';
            state.count = 1;
            state.emitCount = 2;
            state.error = { message: 'test error' };

            expect(state.state).toBe('running');
            expect(state.count).toBe(1);
            expect(state.emitCount).toBe(2);
            expect(state.error?.message).toBe('test error');
        });

        it('获取所有节点状态', () => {
            ctx.getNodeState('node1').state = 'running';
            ctx.getNodeState('node2').state = 'success';

            const allStates = ctx.getAllNodeStates();

            expect(allStates.size).toBe(2);
            expect(allStates.get('node1')?.state).toBe('running');
            expect(allStates.get('node2')?.state).toBe('success');
        });
    });

    describe('并发执行隔离', () => {
        it('不同上下文的状态完全隔离', () => {
            const ctx1 = new ExecutionContext();
            const ctx2 = new ExecutionContext();

            // 在 ctx1 中设置状态
            ctx1.getNodeState('node1').state = 'running';
            ctx1.getNodeState('node1').count = 5;

            // 在 ctx2 中设置不同状态
            ctx2.getNodeState('node1').state = 'success';
            ctx2.getNodeState('node1').count = 10;

            // 验证状态隔离
            expect(ctx1.getNodeState('node1').state).toBe('running');
            expect(ctx1.getNodeState('node1').count).toBe(5);
            expect(ctx2.getNodeState('node1').state).toBe('success');
            expect(ctx2.getNodeState('node1').count).toBe(10);
        });

        it('模拟并发执行场景', async () => {
            const results: Array<{ ctxId: string; nodeState: string }> = [];

            // 模拟两个并发执行
            const execution1 = async () => {
                const ctx = new ExecutionContext();
                const state = ctx.getNodeState('node1');
                state.state = 'running';
                await new Promise(resolve => setTimeout(resolve, 10));
                state.state = 'success';
                results.push({ ctxId: ctx.executionId, nodeState: state.state });
            };

            const execution2 = async () => {
                const ctx = new ExecutionContext();
                const state = ctx.getNodeState('node1');
                state.state = 'running';
                await new Promise(resolve => setTimeout(resolve, 5));
                state.state = 'fail';
                results.push({ ctxId: ctx.executionId, nodeState: state.state });
            };

            await Promise.all([execution1(), execution2()]);

            // 验证两个执行的结果互不干扰
            expect(results.length).toBe(2);
            expect(results.some(r => r.nodeState === 'success')).toBe(true);
            expect(results.some(r => r.nodeState === 'fail')).toBe(true);
        });
    });

    describe('子上下文', () => {
        it('创建子上下文', () => {
            const parent = new ExecutionContext();
            const child = parent.createChildContext();

            expect(child.parent).toBe(parent);
            expect(child.executionId).not.toBe(parent.executionId);
        });

        it('子上下文状态独立于父上下文', () => {
            const parent = new ExecutionContext();
            const child = parent.createChildContext();

            parent.getNodeState('node1').state = 'success';
            child.getNodeState('node1').state = 'running';

            expect(parent.getNodeState('node1').state).toBe('success');
            expect(child.getNodeState('node1').state).toBe('running');
        });
    });

    describe('状态同步', () => {
        it('将上下文状态同步回节点', () => {
            const nodes = [
                { id: 'node1', state: 'pending' as const, count: 0, emitCount: 0 },
                { id: 'node2', state: 'pending' as const, count: 0, emitCount: 0 }
            ];

            ctx.getNodeState('node1').state = 'success';
            ctx.getNodeState('node1').count = 3;
            ctx.getNodeState('node1').emitCount = 2;
            ctx.getNodeState('node2').state = 'fail';
            ctx.getNodeState('node2').error = { message: 'error' };

            ctx.syncToNodes(nodes);

            expect(nodes[0].state).toBe('success');
            expect(nodes[0].count).toBe(3);
            expect(nodes[0].emitCount).toBe(2);
            expect(nodes[1].state).toBe('fail');
            expect(nodes[1].error?.message).toBe('error');
        });

        it('只同步存在于上下文中的节点', () => {
            const nodes = [
                { id: 'node1', state: 'pending' as const, count: 0, emitCount: 0 },
                { id: 'node2', state: 'pending' as const, count: 0, emitCount: 0 }
            ];

            // 只设置 node1 的状态
            ctx.getNodeState('node1').state = 'success';

            ctx.syncToNodes(nodes);

            expect(nodes[0].state).toBe('success');
            expect(nodes[1].state).toBe('pending'); // 未被修改
        });
    });
});
