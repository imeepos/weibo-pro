import { describe, it, expect, beforeEach } from 'vitest';
import { RecalculateStatisticsAst } from '@sker/workflow-ast';
import { RecalculateStatisticsVisitor } from './RecalculateStatisticsVisitor';
import { of } from 'rxjs';

describe('RecalculateStatisticsVisitor', () => {
  let visitor: RecalculateStatisticsVisitor;
  let ast: RecalculateStatisticsAst;

  beforeEach(() => {
    visitor = new RecalculateStatisticsVisitor();
    ast = new RecalculateStatisticsAst();
    ast.eventId = 'test-event-123';
  });

  it('应该验证必填参数', (done) => {
    ast.eventId = '';
    const input$ = of({});
    const ctx = {};

    const events: any[] = [];
    visitor.handler(ast, input$, ctx).subscribe({
      next: (event) => events.push(event),
      error: (error) => {
        expect(error.message).toContain('事件ID不能为空');
        done();
      },
      complete: () => {
        done(new Error('应该抛出错误'));
      }
    });
  });

  it('应该正确初始化状态', (done) => {
    const input$ = of({ eventId: 'test-event-123' });
    const ctx = {};

    const events: any[] = [];
    visitor.handler(ast, input$, ctx).subscribe({
      next: (event) => {
        events.push(event);
        if (event.type === 'node_runing') {
          expect(ast.state).toBe('running');
          expect(ast.completedSteps).toBe(0);
          expect(ast.errors).toEqual([]);
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
