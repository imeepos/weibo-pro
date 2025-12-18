import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PropertySelectorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

/**
 * 从对象中提取深层属性
 * @param obj 源对象
 * @param path 属性路径，如 "parent.key.key2"
 * @returns 提取的值，如果路径不存在则返回 undefined
 */
function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

@Injectable()
export class PropertySelectorAstVisitor {
  @Handler(PropertySelectorAst)
  handler(ast: PropertySelectorAst, input$: Observable<Record<string, unknown>>, ctx: any) {
    return new Observable<NodeEvent>(obs => {
      ast.state = 'running';
      ast.count += 1;
      obs.next({ type: 'node_runing', id: ast.id });

      input$.subscribe({
        next: (inputData) => {
          console.log(`[PropertySelectorAstVisitor] 节点 ${ast.id} 接收输入:`, inputData);
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          // 合并输入
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              console.log(`[PropertySelectorAstVisitor] 设置 ast.${key} =`, inputData[key]);
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          try {
            console.log(`[PropertySelectorAstVisitor] 节点 ${ast.id} input$ complete, 开始提取属性`);
            console.log(`[PropertySelectorAstVisitor] ast.path =`, ast.path);
            console.log(`[PropertySelectorAstVisitor] ast.data =`, ast.data);
            console.log(`[PropertySelectorAstVisitor] ast.data 类型:`, typeof ast.data, Array.isArray(ast.data) ? '(数组)' : '');

            // 验证必要参数
            if (!ast.path) {
              throw new Error('请配置属性路径');
            }

            // 提取值
            const extractedValue = getValueByPath(ast.data, ast.path);
            console.log(`[PropertySelectorAstVisitor] extractedValue =`, extractedValue);
            console.log(`[PropertySelectorAstVisitor] extractedValue 类型:`, typeof extractedValue);

            // 如果为空，不触发 emit
            if (extractedValue == null) {
              console.log(`[PropertySelectorAstVisitor] extractedValue 为空，跳过 emit`);
              ast.state = 'success';
              obs.next({ type: 'node_success', id: ast.id });
              obs.complete();
              return;
            }

            // 更新 AST 状态
            ast.value = extractedValue;

            // 发射输出
            console.log(`[PropertySelectorAstVisitor] 发射 node_emit, value =`, extractedValue);
            obs.next({
              type: 'node_emit',
              id: ast.id,
              data: { value: extractedValue }
            });

            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
            obs.complete();
          } catch (error) {
            console.error(`[PropertySelectorAstVisitor] 执行出错:`, error);
            ast.state = 'fail';
            setAstError(ast, error instanceof Error ? error : new Error(String(error)));
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
            obs.complete();
          }
        }
      });
    });
  }
}
