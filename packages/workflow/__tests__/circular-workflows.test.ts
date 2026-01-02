import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { ArrayEmitterAst, ArrayEmitterAstVisitor } from './ArrayEmitterAst';

let compiler: Compiler;

beforeAll(() => {
  root.get(TextAreaAstVisitor);
  root.get(WorkflowGraphAstVisitor);
  root.get(ArrayEmitterAstVisitor);
});

beforeEach(() => {
  compiler = root.get(Compiler);
});

describe('Circular Workflows', () => {
  it('handles simple loop with completion', async () => {
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
  });

  it('handles feedback loop with merge', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['init'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any }
      ],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
  });

  it('completes when all input sources complete', async () => {
    const n1 = compiler.compile(new ArrayEmitterAst());
    n1.id = 'n1';
    n1.items = ['a', 'b'];

    const n2 = compiler.compile(new ArrayEmitterAst());
    n2.id = 'n2';
    n2.items = ['1'];

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
    expect(n3Emits.length).toBe(3);
    expect(workflow.state).toBe('success');
  });
});
