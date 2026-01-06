import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { CodeGeneratorAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from './llm-client';

const CODE_GENERATOR_SYSTEM_PROMPT = `你是一个代码艺术家，专注于生成优雅、简洁、可维护的代码。

## 核心原则
1. 存在即合理 - 每行代码都有不可替代的理由
2. 优雅即简约 - 代码自解释，无需冗余注释
3. 性能即艺术 - 高效且美观

## 输出格式
返回 JSON 格式：
{
  "filePath": "相对文件路径",
  "operation": "create" | "modify" | "delete",
  "code": "完整代码内容",
  "explanation": "简短说明（一句话）"
}

## 约束
- 不要过度设计
- 不要添加未要求的功能
- 保持代码风格一致
- 遵循项目现有架构`;

@Injectable({ providedIn: 'auto' })
export class CodeGeneratorAstVisitor {
    @Handler(CodeGeneratorAst)
    visit(ast: CodeGeneratorAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController();

            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id });

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1;

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            (ast as unknown as Record<string, unknown>)[key] = inputData[key];
                        });
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消');
                    }

                    const tasks = Array.isArray(ast.tasks) ? ast.tasks : [ast.tasks];
                    const context = Array.isArray(ast.context) ? ast.context.join('\n\n') : ast.context;
                    const existingCode = Array.isArray(ast.existingCode) ? ast.existingCode.join('\n\n---\n\n') : ast.existingCode;

                    const prompt = `## 技术栈
${ast.techStack || '根据上下文推断'}

## 项目上下文
${context || '无'}

## 现有代码
${existingCode || '无'}

## 任务列表
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请为第 ${ast.currentTaskIndex + 1} 个任务生成代码。`;

                    const model = useLlmModel({ model: ast.model, temperature: ast.temperature });
                    const response = await model.invoke([
                        { role: 'system', content: CODE_GENERATOR_SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ]);

                    const content = typeof response.content === 'string'
                        ? response.content
                        : JSON.stringify(response.content);

                    // 解析 JSON 响应，使用 json-harmony 提供容错能力
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parseResult = parseWithHarmony(jsonMatch[0]);

                        if (typeof parseResult.data === 'object' && parseResult.data !== null) {
                            const result = parseResult.data as Record<string, any>;
                            ast.generatedCode = result.code || '';
                            ast.filePath = result.filePath || '';
                            ast.operation = result.operation || 'create';
                        } else {
                            // 解析失败，使用原始内容
                            ast.generatedCode = content;
                            ast.filePath = '';
                            ast.operation = 'create';
                        }
                    } else {
                        ast.generatedCode = content;
                        ast.filePath = '';
                        ast.operation = 'create';
                    }

                    ast.currentTaskIndex += 1;
                    ast.isComplete = ast.currentTaskIndex >= tasks.length;

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { generatedCode: ast.generatedCode, filePath: ast.filePath, operation: ast.operation, isComplete: ast.isComplete } }
                    ];
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[CodeGeneratorAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[CodeGeneratorAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error);
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id });
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
