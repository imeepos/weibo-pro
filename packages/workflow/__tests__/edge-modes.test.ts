import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { EdgeMode } from '../src/types';
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

describe('Edge Mode - MERGE', () => {
  it('triggers downstream on any upstream emit', async () => {
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
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
    expect(n3Emits.length).toBe(2);
  });
});

describe('Edge Mode - ZIP', () => {
  it('pairs upstream values by index', async () => {
    const n1 = compiler.compile(new ArrayEmitterAst());
    n1.id = 'n1';
    n1.items = ['a', 'b'];

    const n2 = compiler.compile(new ArrayEmitterAst());
    n2.id = 'n2';
    n2.items = ['1', '2'];

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.ZIP },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.ZIP }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
    expect(n3Emits.length).toBe(2);
  });
});

describe('Edge Mode - COMBINE_LATEST', () => {
  it('triggers on any change with latest values', async () => {
    const n1 = compiler.compile(new TextAreaAst());
    n1.id = 'n1';
    n1.input = ['a'];

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';
    n2.input = ['1'];

    const n3 = compiler.compile(new TextAreaAst());
    n3.id = 'n3';

    const workflow = createWorkflowGraphAst({
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.COMBINE_LATEST },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.COMBINE_LATEST }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
    expect(n3Emits.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Edge Mode - WITH_LATEST_FROM', () => {
  it('primary stream triggers with secondary latest', async () => {
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
        { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true },
        { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.WITH_LATEST_FROM }
      ],
      entryNodeIds: ['n1', 'n2']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
    expect(n3Emits.length).toBe(2);
  });
});
