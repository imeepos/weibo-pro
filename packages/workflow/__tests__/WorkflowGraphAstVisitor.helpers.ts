import { root } from '@sker/core';
import { Compiler } from '../src/compiler';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { ArrayEmitterAst, ArrayEmitterAstVisitor } from './ArrayEmitterAst';
import { createWorkflowGraphAst, WorkflowGraphAst } from '../src/ast';
import { IEdge, INode } from '../src/types';

/**
 * WorkflowGraphAstVisitor 测试辅助
 *
 * 将原 WorkflowGraphAstVisitor.test.ts 中的公共 fixtures / 初始化逻辑抽离于此，
 * 拆分后的多个测试文件共享使用，避免重复注册与重复构建节点。
 */

/**
 * 注册被测 Visitor（触发 @Handler 装饰器收集）并返回 Compiler 实例。
 * 语义与拆分前的 beforeAll + beforeEach 一致（注册为幂等操作）。
 */
export function setupCompiler(): Compiler {
    root.get(TextAreaAstVisitor);
    root.get(WorkflowGraphAstVisitor);
    root.get(ArrayEmitterAstVisitor);
    return root.get(Compiler);
}

/** 编译一个 TextArea 节点 fixture（可携带输入列表） */
export function textNode(compiler: Compiler, id: string, input?: unknown[]): INode {
    const node = compiler.compile(new TextAreaAst());
    node.id = id;
    if (input) node.input = input;
    return node;
}

/** 编译一个 ArrayEmitter 节点 fixture（可携带 items 列表） */
export function emitterNode(compiler: Compiler, id: string, items: unknown[] = []): INode {
    const node = compiler.compile(new ArrayEmitterAst());
    node.id = id;
    node.items = items;
    return node;
}

/** 创建工作流图 fixture */
export function makeWorkflow(nodes: INode[], edges: IEdge[], entryNodeIds: string[]): WorkflowGraphAst {
    return createWorkflowGraphAst({ nodes, edges, entryNodeIds });
}
