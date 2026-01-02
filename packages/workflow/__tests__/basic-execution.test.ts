import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

describe('Basic Workflow Execution', () => {
  let compiler: Compiler;

  beforeAll(() => {
    root.get(TextAreaAstVisitor);
    root.get(WorkflowGraphAstVisitor);
  });

  beforeEach(() => {
    compiler = root.get(Compiler);
  });

  it('executes single node', async () => {
    const node = compiler.compile(new TextAreaAst());
    node.id = 'n1';
    node.input = ['test'];

    const workflow = createWorkflowGraphAst({
      nodes: [node],
      edges: [],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(events.some(e => e.type === 'node_success' && e.id === 'n1')).toBe(true);
    expect(events.some(e => e.type === 'node_success' && e.id === workflow.id)).toBe(true);
  });

  it('executes linear workflow', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['hello'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2],
      edges: [{ id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(events.some(e => e.type === 'node_success' && e.id === 'n1')).toBe(true);
    expect(events.some(e => e.type === 'node_success' && e.id === 'n2')).toBe(true);
    expect(workflow.state).toBe('success');
  });
});
