import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Ast } from '../src/ast';
import { Node, Handler, Input, Output } from '../src/decorator';
import { Injectable } from '@sker/core';
import { Observable } from 'rxjs';
import { NodeEvent } from '../src/execution/events';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

@Node({ title: 'Error Node', type: 'test' })
class ErrorAst extends Ast {
  @Input({ title: 'Input' })
  input: any;

  @Output({ title: 'Output' })
  output: any;

  type = 'ErrorAst' as const;
}

@Injectable()
class ErrorAstVisitor {
  @Handler(ErrorAst)
  handler(ast: ErrorAst, input$: Observable<any>): Observable<NodeEvent> {
    return new Observable(obs => {
      obs.next({ type: 'node_runing', id: ast.id });
      obs.error(new Error('Test error'));
    });
  }
}

let compiler: Compiler;

beforeAll(() => {
  root.get(TextAreaAstVisitor);
  root.get(WorkflowGraphAstVisitor);
  root.get(ErrorAstVisitor);
});

beforeEach(() => {
  compiler = root.get(Compiler);
});

describe('Error Handling', () => {
  it('propagates node errors to workflow', async () => {
    const errorNode = compiler.compile(new ErrorAst());
    errorNode.id = 'n1';

    const workflow = createWorkflowGraphAst({
      nodes: [errorNode],
      edges: [],
      entryNodeIds: ['n1']
    });

    const events = await firstValueFrom(
      executeWorkflow(workflow, {}).pipe(toArray())
    );

    // 验证 node_fail 事件被发射
    expect(events.some(e => e.type === 'node_fail' && e.id === 'n1')).toBe(true);
    // 验证工作流状态为失败
    expect(workflow.state).toBe('fail');
  });

  it('workflow fails when node fails', async () => {
    const errorNode = compiler.compile(new ErrorAst());
    errorNode.id = 'n1';

    const workflow = createWorkflowGraphAst({
      nodes: [errorNode],
      edges: [],
      entryNodeIds: ['n1']
    });

    try {
      await firstValueFrom(
        executeWorkflow(workflow, {}).pipe(toArray())
      );
    } catch {
      // Expected
    }

    expect(workflow.state).toBe('fail');
  });

  it('downstream nodes do not execute after upstream error', async () => {
    const errorNode = compiler.compile(new ErrorAst());
    errorNode.id = 'n1';

    const n2 = compiler.compile(new TextAreaAst());
    n2.id = 'n2';

    const workflow = createWorkflowGraphAst({
      nodes: [errorNode, n2],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
      ],
      entryNodeIds: ['n1']
    });

    try {
      await firstValueFrom(
        executeWorkflow(workflow, {}).pipe(toArray())
      );
    } catch {
      // Expected
    }

    expect(n2.state).not.toBe('success');
  });
});
