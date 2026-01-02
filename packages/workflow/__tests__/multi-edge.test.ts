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

describe('Multi-Edge Scenarios', () => {
  it('multiple edges with same mode (MERGE)', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['a'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';
    n2.input = ['b'];

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';
    n3.input = ['c'];

    const n4 = compiler.compile(new TextAreaAst());
    n4.id = 'n4';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3, n4],
      edges: [
        { id: 'e1', from: 'n1', to: 'n4', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any },
        { id: 'e2', from: 'n2', to: 'n4', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any },
        { id: 'e3', from: 'n3', to: 'n4', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any }
      ],
      entryNodeIds: ['n1', 'n2', 'n3']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n4Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n4');
    expect(n4Emits.length).toBe(3);
  });

  it('multiple edges with different modes', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['a'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';
    n2.input = ['b'];

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: 'merge' as any },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: 'combineLatest' as any }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    expect(workflow.state).toBe('success');
  });

  it('validates isMulti requirement for multiple edges', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['a'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';
    n2.input = ['b'];

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

    expect(workflow.state).toBe('success');
  });
});
