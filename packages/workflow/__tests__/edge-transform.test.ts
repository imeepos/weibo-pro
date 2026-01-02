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

describe('Edge Transformation', () => {
  it('applies transform expression to edge data', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['hello'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2],
      edges: [
        {
          id: 'e1',
          from: 'n1',
          to: 'n2',
          fromProperty: 'output',
          toProperty: 'input',
          transform: '$input.toUpperCase()'
        }
      ],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n2Emit = events.find(e => e.type === 'node_emit' && e.id === 'n2');
    expect(n2Emit?.data?.output).toBe('HELLO');
  });

  it('handles complex transform expressions', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['5'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2],
      edges: [
        {
          id: 'e1',
          from: 'n1',
          to: 'n2',
          fromProperty: 'output',
          toProperty: 'input',
          transform: 'Number($input) * 2'
        }
      ],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n2Emit = events.find(e => e.type === 'node_emit' && e.id === 'n2');
    expect(n2Emit?.data?.output).toBe('10');
  });
});
