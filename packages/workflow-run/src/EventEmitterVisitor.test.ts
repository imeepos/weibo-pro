import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitterAst } from '@sker/workflow-ast';
import { EventEmitterVisitor } from './EventEmitterVisitor';
import { of } from 'rxjs';

describe('EventEmitterVisitor', () => {
  let visitor: EventEmitterVisitor;
  let ast: EventEmitterAst;

  beforeEach(() => {
    visitor = new EventEmitterVisitor();
    ast = new EventEmitterAst();
  });

  it('应该正确初始化状态', (done) => {
    const input$ = of({});
    const ctx = {};

    const events: any[] = [];
    visitor.handler(ast, input$, ctx).subscribe({
      next: (event) => {
        events.push(event);
        if (event.type === 'node_runing') {
          expect(ast.state).toBe('running');
        }
      },
      error: done,
      complete: () => {
        expect(events.some(e => e.type === 'node_runing')).toBe(true);
        done();
      }
    });
  });
});
