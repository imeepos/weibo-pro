import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
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

describe('Workflow Completion', () => {
  it('completes when all nodes finish', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['a'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';
    n2.input = ['b'];

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2],
      edges: [],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
    expect(events[events.length - 1]?.type).toBe('node_success');
    expect(events[events.length - 1]?.id).toBe(workflow.id);
  });

  it('completes linear chain correctly', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['start'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input' }
      ],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
    expect(events.filter(e => e.type === 'node_success').length).toBe(4);
  });

  it('completes diamond pattern correctly', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['start'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const n4 = compiler.compile(new TextAreaAst());
    n4.id = 'n4';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3, n4],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' },
        { id: 'e2', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input' },
        { id: 'e3', from: 'n2', to: 'n4', fromProperty: 'output', toProperty: 'input' },
        { id: 'e4', from: 'n3', to: 'n4', fromProperty: 'output', toProperty: 'input' }
      ],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
  });
});
