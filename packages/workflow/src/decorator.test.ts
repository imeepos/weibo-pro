import { describe, it, expect } from 'vitest';
import { root, Injectable } from '@sker/core';
import {
    Node,
    Input,
    Output,
    State,
    Handler,
    Render,
    IS_MULTI,
    IS_BUFFER,
    hasMultiMode,
    hasBufferMode,
    getAllNodeTypes,
    findNodeType,
    getInputMetadata,
    getStateMetadata,
    NODE,
    INPUT,
    OUTPUT,
    STATE,
    HANDLER_METHOD,
    RENDER_METHOD,
} from './decorator';
import { Ast } from './ast';
import { Observable } from 'rxjs';
import { INode } from './types';

describe('decorator', () => {
    describe('@Node 装饰器', () => {
        it('注册节点类型', () => {
            @Node({ title: '测试节点' })
            class TestAst extends Ast {
                type = 'TestAst';
            }

            const nodes = root.get(NODE, []);
            const testNode = nodes.find(n => n.target === TestAst);

            expect(testNode).toBeDefined();
            expect(testNode?.title).toBe('测试节点');
        });

        it('注册节点类型选项', () => {
            @Node({ title: 'LLM节点', type: 'llm' })
            class LLMAst extends Ast {
                type = 'LLMAst';
            }

            const nodes = root.get(NODE, []);
            const llmNode = nodes.find(n => n.target === LLMAst);

            expect(llmNode).toBeDefined();
            expect(llmNode?.type).toBe('llm');
        });

        it('getAllNodeTypes 返回所有节点', () => {
            @Node({ title: 'Node1' })
            class Node1Ast extends Ast {
                type = 'Node1Ast';
            }

            @Node({ title: 'Node2' })
            class Node2Ast extends Ast {
                type = 'Node2Ast';
            }

            const types = getAllNodeTypes();

            expect(types).toContain(Node1Ast);
            expect(types).toContain(Node2Ast);
        });

        it('findNodeType 根据名称查找', () => {
            @Node({ title: '可查找节点' })
            class FindableAst extends Ast {
                type = 'FindableAst';
            }

            const found = findNodeType('FindableAst');

            expect(found).toBe(FindableAst);
        });
    });

    describe('@Input 装饰器', () => {
        it('注册输入属性', () => {
            @Node({ title: '输入节点' })
            class InputTestAst extends Ast {
                @Input() value?: string;
                type = 'InputTestAst';
            }

            const metadata = getInputMetadata(InputTestAst, 'value') as any;

            expect(metadata).toBeDefined();
            expect(metadata.propertyKey).toBe('value');
        });

        it('IS_MULTI 模式注册', () => {
            @Node({ title: '多值节点' })
            class MultiInputAst extends Ast {
                @Input({ mode: IS_MULTI }) items: string[] = [];
                type = 'MultiInputAst';
            }

            const metadata = getInputMetadata(MultiInputAst, 'items') as any;

            expect(metadata.mode).toBe(IS_MULTI);
            expect(hasMultiMode(metadata.mode)).toBe(true);
        });

        it('IS_BUFFER 模式注册', () => {
            @Node({ title: '缓冲节点' })
            class BufferInputAst extends Ast {
                @Input({ mode: IS_BUFFER }) buffer: any[] = [];
                type = 'BufferInputAst';
            }

            const metadata = getInputMetadata(BufferInputAst, 'buffer') as any;

            expect(metadata.mode).toBe(IS_BUFFER);
            expect(hasBufferMode(metadata.mode)).toBe(true);
        });

        it('IS_MULTI | IS_BUFFER 组合模式', () => {
            @Node({ title: '组合模式节点' })
            class CombinedInputAst extends Ast {
                @Input({ mode: IS_MULTI | IS_BUFFER }) combined: any[] = [];
                type = 'CombinedInputAst';
            }

            const metadata = getInputMetadata(CombinedInputAst, 'combined') as any;

            expect(hasMultiMode(metadata.mode)).toBe(true);
            expect(hasBufferMode(metadata.mode)).toBe(true);
        });

        it('向后兼容 isMulti 选项', () => {
            @Node({ title: '旧版多值节点' })
            class LegacyMultiAst extends Ast {
                @Input({ isMulti: true }) items: string[] = [];
                type = 'LegacyMultiAst';
            }

            const metadata = getInputMetadata(LegacyMultiAst, 'items') as any;

            expect(metadata.mode).toBe(IS_MULTI);
            expect(metadata.isMulti).toBe(true);
        });

        it('输入选项完整性', () => {
            @Node({ title: '完整输入节点' })
            class FullInputAst extends Ast {
                @Input({
                    required: true,
                    defaultValue: 'default',
                    title: '输入字段',
                    type: 'string',
                })
                value?: string;
                type = 'FullInputAst';
            }

            const metadata = getInputMetadata(FullInputAst, 'value') as any;

            expect(metadata.required).toBe(true);
            expect(metadata.defaultValue).toBe('default');
            expect(metadata.title).toBe('输入字段');
            expect(metadata.type).toBe('string');
        });

        it('获取所有输入元数据', () => {
            @Node({ title: '多输入节点' })
            class MultiInputPropsAst extends Ast {
                @Input() input1?: string;
                @Input() input2?: number;
                @Input() input3?: boolean;
                type = 'MultiInputPropsAst';
            }

            const allInputs = getInputMetadata(MultiInputPropsAst) as any[];

            expect(allInputs).toHaveLength(3);
            expect(allInputs.map(m => m.propertyKey)).toEqual(
                expect.arrayContaining(['input1', 'input2', 'input3'])
            );
        });
    });

    describe('@Output 装饰器', () => {
        it('注册输出属性', () => {
            @Node({ title: '输出节点' })
            class OutputTestAst extends Ast {
                @Output() result?: string;
                type = 'OutputTestAst';
            }

            const outputs = root.get(OUTPUT, []);
            const outputMeta = outputs.find(o => o.target === OutputTestAst && o.propertyKey === 'result');

            expect(outputMeta).toBeDefined();
        });

        it('注册路由输出', () => {
            @Node({ title: '路由节点' })
            class RouterAst extends Ast {
                @Output({ isRouter: true }) branchA?: any;
                @Output({ isRouter: true }) branchB?: any;
                type = 'RouterAst';
            }

            const outputs = root.get(OUTPUT, []);
            const routerOutputs = outputs.filter(o => o.target === RouterAst && o.isRouter);

            expect(routerOutputs).toHaveLength(2);
        });

        it('输出选项完整性', () => {
            @Node({ title: '完整输出节点' })
            class FullOutputAst extends Ast {
                @Output({
                    title: '输出结果',
                    type: 'object',
                    description: '处理后的结果',
                })
                result?: any;
                type = 'FullOutputAst';
            }

            const outputs = root.get(OUTPUT, []);
            const outputMeta = outputs.find(o => o.target === FullOutputAst);

            expect(outputMeta?.title).toBe('输出结果');
            expect(outputMeta?.type).toBe('object');
            expect(outputMeta?.description).toBe('处理后的结果');
        });
    });

    describe('@State 装饰器', () => {
        it('注册状态属性', () => {
            @Node({ title: '状态节点' })
            class StateTestAst extends Ast {
                @State() status?: string;
                type = 'StateTestAst';
            }

            const metadata = getStateMetadata(StateTestAst, 'status') as any;

            expect(metadata).toBeDefined();
            expect(metadata.propertyKey).toBe('status');
        });

        it('获取所有状态元数据', () => {
            @Node({ title: '多状态节点' })
            class MultiStateAst extends Ast {
                @State() state1?: string;
                @State() state2?: number;
                type = 'MultiStateAst';
            }

            const allStates = getStateMetadata(MultiStateAst) as any[];

            expect(allStates).toHaveLength(2);
            expect(allStates.map(m => m.propertyKey)).toEqual(
                expect.arrayContaining(['state1', 'state2'])
            );
        });

        it('状态选项完整性', () => {
            @Node({ title: '完整状态节点' })
            class FullStateAst extends Ast {
                @State({ title: '当前状态', type: 'string' })
                status?: string;
                type = 'FullStateAst';
            }

            const metadata = getStateMetadata(FullStateAst, 'status') as any;

            expect(metadata.title).toBe('当前状态');
            expect(metadata.type).toBe('string');
        });
    });

    describe('@Handler 装饰器', () => {
        it('注册处理器方法', () => {
            @Node({ title: '测试节点' })
            class TestHandlerAst extends Ast {
                type = 'TestHandlerAst';
            }

            @Injectable()
            class TestVisitor {
                @Handler(TestHandlerAst)
                visit(ast: TestHandlerAst): Observable<INode> {
                    return new Observable();
                }
            }

            const handlers = root.get(HANDLER_METHOD, []);
            const handler = handlers.find(h => h.ast === TestHandlerAst);

            expect(handler).toBeDefined();
            expect(handler?.target).toBe(TestVisitor);
            expect(handler?.property).toBe('visit');
        });

        it('自动注册 Visitor 到容器', () => {
            @Node({ title: '自动注册节点' })
            class AutoRegisterAst extends Ast {
                type = 'AutoRegisterAst';
            }

            @Injectable()
            class AutoRegisterVisitor {
                @Handler(AutoRegisterAst)
                visit(ast: AutoRegisterAst): Observable<INode> {
                    return new Observable();
                }
            }

            const instance = root.get(AutoRegisterVisitor);
            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf(AutoRegisterVisitor);
        });
    });

    describe('@Render 装饰器', () => {
        it('注册渲染器方法', () => {
            @Node({ title: '测试节点' })
            class TestRenderAst extends Ast {
                type = 'TestRenderAst';
            }

            @Injectable()
            class TestRenderer {
                @Render(TestRenderAst)
                render(ast: TestRenderAst): any {
                    return null;
                }
            }

            const renders = root.get(RENDER_METHOD, []);
            const render = renders.find(r => r.ast === TestRenderAst);

            expect(render).toBeDefined();
            expect(render?.target).toBe(TestRenderer);
            expect(render?.property).toBe('render');
        });

        it('自动注册 Renderer 到容器', () => {
            @Node({ title: '自动渲染节点' })
            class AutoRenderAst extends Ast {
                type = 'AutoRenderAst';
            }

            @Injectable()
            class AutoRenderer {
                @Render(AutoRenderAst)
                render(ast: AutoRenderAst): any {
                    return null;
                }
            }

            const instance = root.get(AutoRenderer);
            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf(AutoRenderer);
        });
    });

    describe('hasMultiMode() 和 hasBufferMode()', () => {
        it('hasMultiMode 检测 IS_MULTI', () => {
            expect(hasMultiMode(IS_MULTI)).toBe(true);
            expect(hasMultiMode(IS_BUFFER)).toBe(false);
            expect(hasMultiMode(IS_MULTI | IS_BUFFER)).toBe(true);
            expect(hasMultiMode(0)).toBe(false);
            expect(hasMultiMode(undefined)).toBe(false);
        });

        it('hasBufferMode 检测 IS_BUFFER', () => {
            expect(hasBufferMode(IS_BUFFER)).toBe(true);
            expect(hasBufferMode(IS_MULTI)).toBe(false);
            expect(hasBufferMode(IS_MULTI | IS_BUFFER)).toBe(true);
            expect(hasBufferMode(0)).toBe(false);
            expect(hasBufferMode(undefined)).toBe(false);
        });

        it('位标志独立性', () => {
            const combined = IS_MULTI | IS_BUFFER;
            expect(combined).not.toBe(IS_MULTI);
            expect(combined).not.toBe(IS_BUFFER);
            expect(hasMultiMode(combined)).toBe(true);
            expect(hasBufferMode(combined)).toBe(true);
        });
    });
});
