import { describe, it, expect, beforeEach } from 'vitest';
import { root, Injectable } from '@sker/core';
import { of } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { LegacyScheduler } from './scheduler';
import { DependencyAnalyzer } from './dependency-analyzer';
import { DataFlowManager } from './data-flow-manager';
import { StateMerger } from './state-merger';
import { VisitorExecutor } from './visitor-executor';
import { WorkflowGraphAst, Ast } from '../ast';
import { Node, Input, Output, Handler, NODE, INPUT, OUTPUT, STATE, HANDLER_METHOD } from '../decorator';
import { IDataEdge } from '../types';
import { generateId } from '../utils';

// 测试节点：简单计算节点
@Node({ title: '测试节点' })
class TestNode extends Ast {
    @Input()
    value: number = 0;

    @Output()
    result: number = 0;

    type = 'TestNode';
}

// 测试节点 Handler
@Injectable()
class TestNodeHandler {
    @Handler(TestNode)
    visit(ast: TestNode) {
        ast.result = ast.value * 2;
        ast.state = 'success';
        return of(ast);
    }
}

// 会失败的测试节点
@Node({ title: '失败节点' })
class FailingNode extends Ast {
    @Input()
    value: number = 0;

    type = 'FailingNode';
}

@Injectable()
class FailingNodeHandler {
    @Handler(FailingNode)
    visit(ast: FailingNode) {
        ast.state = 'fail';
        ast.setError(new Error('测试失败'));
        return of(ast);
    }
}

describe('LegacyScheduler', () => {
    let scheduler: LegacyScheduler;

    beforeEach(() => {
        // 重置并注册服务
        root.set([
            { provide: DependencyAnalyzer, useClass: DependencyAnalyzer },
            { provide: DataFlowManager, useClass: DataFlowManager },
            { provide: StateMerger, useClass: StateMerger },
            { provide: VisitorExecutor, useClass: VisitorExecutor },
            { provide: LegacyScheduler, useClass: LegacyScheduler },
            { provide: TestNodeHandler, useClass: TestNodeHandler },
            { provide: FailingNodeHandler, useClass: FailingNodeHandler },
        ]);

        scheduler = root.get(LegacyScheduler);
    });

    it('已完成的工作流直接返回', async () => {
        const ast = new WorkflowGraphAst();
        ast.state = 'success';

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results).toHaveLength(1);
        expect(results![0].state).toBe('success');
    });

    it('失败状态的工作流直接返回', async () => {
        const ast = new WorkflowGraphAst();
        ast.state = 'fail';

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results).toHaveLength(1);
        expect(results![0].state).toBe('fail');
    });

    it('空节点工作流保持 running 状态', async () => {
        const ast = new WorkflowGraphAst();
        ast.nodes = [];
        ast.edges = [];

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results!.length).toBeGreaterThan(0);
        const finalResult = results![results!.length - 1];
        // 空工作流没有节点可执行，调度器无法判断完成状态
        expect(finalResult.state).toBe('running');
    });

    it('单节点工作流正常执行', async () => {
        const ast = new WorkflowGraphAst();

        const node: TestNode = {
            id: 'node-1',
            type: 'TestNode',
            state: 'pending',
            value: 5,
            result: 0,
            error: undefined,
            position: { x: 0, y: 0 },
            setError: (e: unknown) => { node.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        ast.nodes = [node];
        ast.edges = [];

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results!.length).toBeGreaterThan(0);
        const finalResult = results![results!.length - 1];
        expect(finalResult.state).toBe('success');

        const executedNode = finalResult.nodes.find(n => n.id === 'node-1');
        expect(executedNode?.state).toBe('success');
        expect((executedNode as any)?.result).toBe(10);
    });

    it('线性工作流（A → B）正常执行', async () => {
        const ast = new WorkflowGraphAst();

        const nodeA: TestNode = {
            id: 'node-a',
            type: 'TestNode',
            state: 'pending',
            value: 3,
            result: 0,
            error: undefined,
            position: { x: 0, y: 0 },
            setError: (e: unknown) => { nodeA.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        const nodeB: TestNode = {
            id: 'node-b',
            type: 'TestNode',
            state: 'pending',
            value: 0,
            result: 0,
            error: undefined,
            position: { x: 100, y: 0 },
            setError: (e: unknown) => { nodeB.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        const edge: IDataEdge = {
            id: 'edge-1',
            type: 'data',
            from: 'node-a',
            to: 'node-b',
            fromProperty: 'result',
            toProperty: 'value',
        };

        ast.nodes = [nodeA, nodeB];
        ast.edges = [edge];

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results!.length).toBeGreaterThan(0);
        const finalResult = results![results!.length - 1];
        expect(finalResult.state).toBe('success');

        const executedNodeA = finalResult.nodes.find(n => n.id === 'node-a');
        const executedNodeB = finalResult.nodes.find(n => n.id === 'node-b');

        expect(executedNodeA?.state).toBe('success');
        expect((executedNodeA as any)?.result).toBe(6); // 3 * 2

        expect(executedNodeB?.state).toBe('success');
        expect((executedNodeB as any)?.result).toBe(12); // 6 * 2
    });

    it('节点失败时工作流状态为 fail', async () => {
        const ast = new WorkflowGraphAst();

        const node = {
            id: 'failing-node',
            type: 'FailingNode',
            state: 'pending',
            value: 1,
            error: undefined,
            position: { x: 0, y: 0 },
            setError: function(e: unknown) { this.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        ast.nodes = [node];
        ast.edges = [];

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results!.length).toBeGreaterThan(0);
        const finalResult = results![results!.length - 1];
        expect(finalResult.state).toBe('fail');
    });

    it('并行节点（A → B, A → C）正常执行', async () => {
        const ast = new WorkflowGraphAst();

        const nodeA: TestNode = {
            id: 'node-a',
            type: 'TestNode',
            state: 'pending',
            value: 2,
            result: 0,
            error: undefined,
            position: { x: 0, y: 0 },
            setError: (e: unknown) => { nodeA.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        const nodeB: TestNode = {
            id: 'node-b',
            type: 'TestNode',
            state: 'pending',
            value: 0,
            result: 0,
            error: undefined,
            position: { x: 100, y: -50 },
            setError: (e: unknown) => { nodeB.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        const nodeC: TestNode = {
            id: 'node-c',
            type: 'TestNode',
            state: 'pending',
            value: 0,
            result: 0,
            error: undefined,
            position: { x: 100, y: 50 },
            setError: (e: unknown) => { nodeC.error = e as any; },
            getDeepError: () => undefined,
            getErrorDescription: () => undefined,
        } as any;

        const edgeAB: IDataEdge = {
            id: 'edge-ab',
            type: 'data',
            from: 'node-a',
            to: 'node-b',
            fromProperty: 'result',
            toProperty: 'value',
        };

        const edgeAC: IDataEdge = {
            id: 'edge-ac',
            type: 'data',
            from: 'node-a',
            to: 'node-c',
            fromProperty: 'result',
            toProperty: 'value',
        };

        ast.nodes = [nodeA, nodeB, nodeC];
        ast.edges = [edgeAB, edgeAC];

        const results = await scheduler.schedule(ast, {}).pipe(toArray()).toPromise();

        expect(results!.length).toBeGreaterThan(0);
        const finalResult = results![results!.length - 1];
        expect(finalResult.state).toBe('success');

        const executedNodeA = finalResult.nodes.find(n => n.id === 'node-a');
        const executedNodeB = finalResult.nodes.find(n => n.id === 'node-b');
        const executedNodeC = finalResult.nodes.find(n => n.id === 'node-c');

        expect(executedNodeA?.state).toBe('success');
        expect((executedNodeA as any)?.result).toBe(4); // 2 * 2

        expect(executedNodeB?.state).toBe('success');
        expect((executedNodeB as any)?.result).toBe(8); // 4 * 2

        expect(executedNodeC?.state).toBe('success');
        expect((executedNodeC as any)?.result).toBe(8); // 4 * 2
    });
});
