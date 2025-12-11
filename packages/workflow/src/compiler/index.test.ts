import { describe, it, expect, beforeEach } from 'vitest';
import { root } from '@sker/core';
import { Compiler } from './index';
import { Node, Input, Output, State, IS_MULTI } from '../decorator';
import { Ast } from '../ast';

describe('Compiler', () => {
    let compiler: Compiler;

    beforeEach(() => {
        compiler = root.get(Compiler);
    });

    describe('compile()', () => {
        it('编译简单 AST 节点', () => {
            @Node({ title: '简单节点' })
            class SimpleAst extends Ast {
                type = 'SimpleAst';
            }

            const ast = new SimpleAst();
            ast.id = 'node1';

            const node = compiler.compile(ast);

            expect(node.id).toBe('node1');
            expect(node.type).toBe('SimpleAst');
            expect(node.metadata).toBeDefined();
            expect(node.metadata?.class.title).toBe('简单节点');
        });

        it('编译带输入输出的节点', () => {
            @Node({ title: '计算节点' })
            class CalculateAst extends Ast {
                @Input() x?: number;
                @Input() y?: number;
                @Output() result?: number;
                type = 'CalculateAst';
            }

            const ast = new CalculateAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.inputs).toHaveLength(2);
            expect(node.metadata!.inputs.map(i => i.property)).toEqual(
                expect.arrayContaining(['x', 'y'])
            );
            expect(node.metadata!.outputs).toHaveLength(1);
            expect(node.metadata!.outputs[0]!.property).toBe('result');
        });

        it('编译带状态的节点', () => {
            @Node({ title: '状态节点' })
            class StatefulAst extends Ast {
                @State({ title: '进度' }) progress?: number;
                @State({ title: '状态' }) status?: string;
                type = 'StatefulAst';
            }

            const ast = new StatefulAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.states).toHaveLength(2);
            expect(node.metadata!.states.map(s => String(s.propertyKey))).toEqual(
                expect.arrayContaining(['progress', 'status'])
            );
        });

        it('编译 IS_MULTI 输入节点', () => {
            @Node({ title: '聚合节点' })
            class AggregateAst extends Ast {
                @Input({ mode: IS_MULTI }) items: string[] = [];
                type = 'AggregateAst';
            }

            const ast = new AggregateAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.inputs).toHaveLength(1);
            expect(node.metadata!.inputs[0]!.mode).toBe(IS_MULTI);
        });

        it('编译路由输出节点', () => {
            @Node({ title: '路由节点' })
            class RouterAst extends Ast {
                @Output({ isRouter: true }) branchA?: any;
                @Output({ isRouter: true }) branchB?: any;
                type = 'RouterAst';
            }

            const ast = new RouterAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.outputs).toHaveLength(2);
            expect(node.metadata!.outputs.every(o => o.isRouter)).toBe(true);
        });

        it('编译节点类型选项', () => {
            @Node({ title: 'LLM节点', type: 'llm' })
            class LLMAst extends Ast {
                type = 'LLMAst';
            }

            const ast = new LLMAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.class.type).toBe('llm');
        });

        it('编译完整输入元数据', () => {
            @Node({ title: '完整节点' })
            class FullInputAst extends Ast {
                @Input({
                    title: '输入值',
                    type: 'string',
                    required: true,
                    defaultValue: 'default',
                })
                value?: string;
                type = 'FullInputAst';
            }

            const ast = new FullInputAst();
            const node = compiler.compile(ast);

            const inputMeta = node.metadata!.inputs[0];
            expect(inputMeta?.title).toBe('输入值');
            expect(inputMeta?.type).toBe('string');
            expect(inputMeta?.required).toBe(true);
            expect(inputMeta?.defaultValue).toBe('default');
            expect(inputMeta?.isStatic).toBe(true);
        });

        it('编译完整输出元数据', () => {
            @Node({ title: '完整输出节点' })
            class FullOutputAst extends Ast {
                @Output({
                    title: '输出结果',
                    type: 'object',
                    isRouter: false,
                    dynamic: false,
                })
                result?: any;
                type = 'FullOutputAst';
            }

            const ast = new FullOutputAst();
            const node = compiler.compile(ast);

            const outputMeta = node.metadata!.outputs[0];
            expect(outputMeta?.title).toBe('输出结果');
            expect(outputMeta?.type).toBe('object');
            expect(outputMeta?.isRouter).toBe(false);
            expect(outputMeta?.dynamic).toBe(false);
            expect(outputMeta?.isStatic).toBe(true);
        });

        it('编译动态输入输出节点', () => {
            @Node({ title: '动态节点', dynamicInputs: true, dynamicOutputs: true })
            class DynamicAst extends Ast {
                type = 'DynamicAst';
            }

            const ast = new DynamicAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.class.dynamicInputs).toBe(true);
            expect(node.metadata!.class.dynamicOutputs).toBe(true);
        });

        it('编译保留 AST 原有属性', () => {
            @Node({ title: '属性节点' })
            class PropertyAst extends Ast {
                @Input() input?: string;
                @Output() output?: string;
                customProperty: string = 'custom';
                type = 'PropertyAst';
            }

            const ast = new PropertyAst();
            ast.id = 'node1';
            ast.customProperty = 'test-value';
            (ast as any).input = 'input-value';

            const node = compiler.compile(ast);

            expect(node.id).toBe('node1');
            expect((node as any).customProperty).toBe('test-value');
            expect((node as any).input).toBe('input-value');
        });

        it('已编译的 INode 直接返回', () => {
            @Node({ title: '测试节点' })
            class TestAst extends Ast {
                type = 'TestAst';
            }

            const ast = new TestAst();
            const node1 = compiler.compile(ast);
            const node2 = compiler.compile(node1);

            expect(node1).toBe(node2);
        });

        it('未注册节点类型抛出错误', () => {
            class UnregisteredAst extends Ast {
                type = 'UnregisteredAst';
            }

            const ast = new UnregisteredAst();

            expect(() => compiler.compile(ast)).toThrow(/not found/);
        });

        it('复杂节点完整编译', () => {
            @Node({
                title: '复杂节点',
                type: 'crawler',
                dynamicInputs: true,
                dynamicOutputs: false,
            })
            class ComplexAst extends Ast {
                @Input({ mode: IS_MULTI, title: '输入列表', required: true }) inputs: any[] = [];
                @Input({ title: '配置', type: 'object' }) config?: any;
                @Output({ title: '结果', type: 'array' }) results?: any[];
                @Output({ title: '状态', isRouter: true }) status?: string;
                @State({ title: '进度', type: 'number' }) progress?: number;
                type = 'ComplexAst';
            }

            const ast = new ComplexAst();
            const node = compiler.compile(ast);

            expect(node.metadata!.class.title).toBe('复杂节点');
            expect(node.metadata!.class.type).toBe('crawler');
            expect(node.metadata!.class.dynamicInputs).toBe(true);
            expect(node.metadata!.class.dynamicOutputs).toBe(false);

            expect(node.metadata!.inputs).toHaveLength(2);
            expect(node.metadata!.outputs).toHaveLength(2);
            expect(node.metadata!.states).toHaveLength(1);

            const multiInput = node.metadata!.inputs.find(i => i.property === 'inputs');
            expect(multiInput?.mode).toBe(IS_MULTI);
            expect(multiInput?.required).toBe(true);

            const routerOutput = node.metadata!.outputs.find(o => o.property === 'status');
            expect(routerOutput?.isRouter).toBe(true);
        });
    });
});
