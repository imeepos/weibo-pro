import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { WorkflowNodeGeneratorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { useLlmModel } from './llm-client';

@Injectable()
export class WorkflowNodeGeneratorAstVisitor {
  @Handler(WorkflowNodeGeneratorAst)
  visit(
    ast: WorkflowNodeGeneratorAst,
    input$: Observable<any>,
    ctx: WorkflowGraphAst
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      const subscription = input$
        .pipe(
          concatMap(async (inputData) => {
            ast.emitCount += 1;
            if (inputData) {
              Object.keys(inputData).forEach((key) => {
                (ast as any)[key] = inputData[key];
              });
            }

            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            const model = useLlmModel({ model: ast.model, temperature: 0.3 });

            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(ast);

            const result = await model.invoke([
              { role: 'system', content: systemPrompt },
              { role: 'human', content: userPrompt }
            ]);

            const content = result.content as string;
            const { astCode, visitorCode } = this.parseGeneratedCode(content);

            ast.astCode = astCode;
            ast.visitorCode = visitorCode;
            ast.success = !!astCode && !!visitorCode;

            return [
              { type: 'node_emit' as const, id: ast.id, property: 'astCode', value: astCode },
              { type: 'node_emit' as const, id: ast.id, property: 'visitorCode', value: visitorCode },
              { type: 'node_emit' as const, id: ast.id, property: 'success', value: ast.success }
            ];
          })
        )
        .subscribe({
          next: (events: NodeEvent[]) => {
            events.forEach((event) => obs.next(event));
          },
          error: (error) => {
            ast.state = 'fail';
            setAstError(ast, error);
            obs.next({ type: 'node_fail', id: ast.id, data: ast });
            obs.complete();
          },
          complete: () => {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
          }
        });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  private buildSystemPrompt(): string {
    return `你是一个工作流节点代码生成专家。你需要根据用户的需求描述，生成符合项目规范的 AST 节点定义和 Visitor 执行器代码。

## 项目架构

工作流系统基于装饰器驱动的元数据系统：
- AST 节点：使用 @Node, @Input, @Output 装饰器定义节点结构
- Visitor 执行器：使用 @Handler 装饰器绑定到 AST 节点，实现业务逻辑

## AST 节点示例

\`\`\`typescript
import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '节点标题',
  type: 'basic', // 'llm' | 'crawler' | 'control' | 'basic' | 'analysis'
  errorStrategy: 'retry', // 'retry' | 'skip' | 'fail' | 'abort'
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class MyNodeAst extends Ast {
  @Input({ title: '输入字段', type: 'text', defaultValue: '' })
  inputField: string = '';

  @Output({ title: '输出字段', defaultValue: '' })
  outputField = '';

  type: 'MyNodeAst' = 'MyNodeAst';
}
\`\`\`

## Visitor 执行器示例

\`\`\`typescript
import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { MyNodeAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';

@Injectable()
export class MyNodeAstVisitor {
  @Handler(MyNodeAst)
  visit(ast: MyNodeAst, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          // 业务逻辑
          const result = processData(ast.inputField);
          ast.outputField = result;

          return [
            { type: 'node_emit' as const, id: ast.id, property: 'outputField', value: result }
          ];
        })
      ).subscribe({
        next: (events: NodeEvent[]) => {
          events.forEach(event => obs.next(event));
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, data: ast });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id, data: ast });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
\`\`\`

## 输出格式

请按以下格式输出代码，使用 XML 标签分隔：

<ast_code>
// AST 节点代码
</ast_code>

<visitor_code>
// Visitor 执行器代码
</visitor_code>

## 要求

1. 类名必须以 Ast 结尾（如 MyNodeAst）
2. Visitor 类名必须是 AST 类名 + Visitor（如 MyNodeAstVisitor）
3. 必须包含 type 属性，值与类名一致
4. 所有输入输出必须有默认值
5. 使用 Observable 数据流模式
6. 支持 AbortController 取消机制
7. 代码简洁优雅，无冗余注释`;
  }

  private buildUserPrompt(ast: WorkflowNodeGeneratorAst): string {
    const nodeName = ast.nodeName || '自定义节点';
    const nodeType = ast.nodeType || 'basic';
    const description = ast.nodeDescription || '执行自定义逻辑';

    return `请生成以下工作流节点的代码：

节点名称：${nodeName}
节点类型：${nodeType}
功能描述：${description}

请生成完整的 AST 节点定义和 Visitor 执行器代码。`;
  }

  private parseGeneratedCode(content: string): { astCode: string; visitorCode: string } {
    const astMatch = content.match(/<ast_code>([\s\S]*?)<\/ast_code>/);
    const visitorMatch = content.match(/<visitor_code>([\s\S]*?)<\/visitor_code>/);

    return {
      astCode: astMatch ? astMatch[1]!.trim() : '',
      visitorCode: visitorMatch ? visitorMatch[1]!.trim() : ''
    };
  }
}
