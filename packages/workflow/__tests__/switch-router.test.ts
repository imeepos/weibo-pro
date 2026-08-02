import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { SwitchAst } from '../src/SwitchAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

let compiler: Compiler;

beforeAll(() => {
  root.get(TextAreaAstVisitor);
  root.get(WorkflowGraphAstVisitor);
});

beforeEach(() => {
  compiler = root.get(Compiler);
});

describe('Switch/Router Nodes', () => {
  it('routes to default branch', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['5'];

    const switchNode = compiler.compile(new SwitchAst());
    switchNode.id = 'switch';

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, switchNode, n2],
      edges: [
        { id: 'e1', from: 'n1', to: 'switch', fromProperty: 'output', toProperty: 'value' },
        { id: 'e2', from: 'switch', to: 'n2', fromProperty: 'output_default', toProperty: 'input' }
      ],
      entryNodeIds: ['n1']
    });

    const _events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
  });

  it('completes workflow with switch node', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['test'];

    const switchNode = compiler.compile(new SwitchAst());
    switchNode.id = 'switch';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, switchNode],
      edges: [
        { id: 'e1', from: 'n1', to: 'switch', fromProperty: 'output', toProperty: 'value' }
      ],
      entryNodeIds: ['n1']
    });

    const _events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
  });
});
