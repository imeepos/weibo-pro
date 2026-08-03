import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { WorkflowGraphAst, Ast } from './ast';
import { Node, Input, Output, Handler } from './decorator';
import { NodeEvent } from './execution/events';
import { Injectable } from '@sker/core';

// 模拟上游节点：发射多次数据
@Node({ title: '数据源', type: 'basic' })
export class SourceAst extends Ast {
  @Output({ title: '数据A', defaultValue: '' })
  dataA: string = '';

  @Output({ title: '数据B', defaultValue: '' })
  dataB: string = '';

  @Output({ title: '数据C', defaultValue: '' })
  dataC: string = '';
}

// 模拟下游节点：接收多次数据
@Node({ title: '数据处理器', type: 'basic' })
export class ProcessorAst extends Ast {
  @Input({ title: '输入A', defaultValue: '' })
  inputA: string = '';

  @Input({ title: '输入B', defaultValue: '' })
  inputB: string = '';

  @Input({ title: '输入C', defaultValue: '' })
  inputC: string = '';
}

// 模拟上游节点的 Visitor：发射多次数据
@Injectable()
export class SourceVisitor {
  @Handler(SourceAst)
  visit(ast: SourceAst, _input$: Observable<Record<string, unknown>>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      obs.next({ type: 'node_runing', id: ast.id });

      // 模拟发射 3 次数据
      const data = [
        { dataA: 'A1', dataB: 'B1', dataC: 'C1' },
        { dataA: 'A2', dataB: 'B2', dataC: 'C2' },
        { dataA: 'A3', dataB: 'B3', dataC: 'C3' },
      ];

      data.forEach(d => {
        obs.next({ type: 'node_emit', id: ast.id, data: d });
      });

      obs.next({ type: 'node_success', id: ast.id });
      obs.complete();
    });
  }
}

// 模拟下游节点的 Visitor：记录接收到的数据，第一次会失败
@Injectable()
export class ProcessorVisitor {
  @Handler(ProcessorAst)
  visit(ast: ProcessorAst, input$: Observable<Record<string, unknown>>, _parent?: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      obs.next({ type: 'node_runing', id: ast.id });

      const receivedData: any[] = [];
      let failedCount = 0;

      input$.pipe(
        concatMap(async (data) => {
          receivedData.push(data);
          console.log('[ProcessorVisitor] 接收到数据，第', receivedData.length, '次');

          try {
            // 模拟第一次处理失败
            if (receivedData.length === 1) {
              throw new Error('第一次处理失败');
            }

            return [{ type: 'node_emit' as const, id: ast.id, data: { receivedCount: receivedData.length } }];
          } catch (error: any) {
            failedCount++;
            console.log('[ProcessorVisitor] 处理失败，第', failedCount, '次');
            return [{ type: 'node_emit' as const, id: ast.id, data: { error: error.message, failedCount } }];
          }
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          // 添加 error 回调 - 这是修复的关键
          console.log('[ProcessorVisitor] subscribe.error 捕获到错误:', error?.message);
          obs.next({ type: 'node_fail', id: ast.id, error: error?.message });
        },
        complete: () => {
          console.log('[ProcessorVisitor] input$ complete，总共接收到', receivedData.length, '次数据，失败', failedCount, '次');
          if (failedCount > 0) {
            obs.next({ type: 'node_fail', id: ast.id, error: `${failedCount} 次处理失败` });
          } else {
            obs.next({ type: 'node_success', id: ast.id });
          }
          obs.complete();
        }
      });
    });
  }
}
