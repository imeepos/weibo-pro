import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PassThroughAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';

/**
 * 透传节点执行器 - 接收输入立即原样输出
 *
 * 重构特点：
 * - 使用函数式管道风格，声明式数据流
 * - tap 操作符处理副作用（状态更新、日志）
 * - map 操作符进行数据转换
 * - catchError 统一错误处理
 */
@Injectable()
export class PassThroughAstVisitor {
  @Handler(PassThroughAst)
  visit(ast: PassThroughAst, input$: Observable<any>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      // 设置运行状态
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      // 使用函数式管道处理输入流
      const subscription = input$.pipe(
        // 使用 tap 处理副作用（状态更新、计数、日志）
        tap((inputData) => {
          ast.emitCount += 1;

          // 应用输入数据到 AST 实例
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }
        }),
        // map 进行数据转换：输入 -> 输出事件
        map((inputData) => {
          // 直接透传：output = input
          ast.output = ast.input;

          // 返回发射的事件
          return {
            type: 'node_emit' as const,
            id: ast.id,
            property: 'output' as const,
            value: ast.output
          };
        }),
        // tap 发射输出事件（副作用）
        tap((event) => {
          obs.next(event);
        }),
        // 错误处理：捕获并传播错误
        catchError((error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
          return [];
        })
      ).subscribe({
        // 流完成时
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      // 清理函数：取消订阅并完成观察者
      return () => {
        subscription.unsubscribe();
        obs.complete();
      };
    });
  }
}
