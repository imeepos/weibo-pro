import { Injectable, root } from "@sker/core";
import { Ast } from "../ast";
import { INode, INodeInputMetadata, INodeMetadata, INodeOutputMetadata, INodeStateMetadata, isNode } from "../types";
import { findNodeType, INPUT, InputMetadata, NODE, NodeMetadata, OUTPUT, OutputMetadata, STATE, StateMetadata, hasTool } from "../decorator";

/**
 * 编译器 - 将 AST 实例编译为 INode
 *
 * 设计哲学：
 * - 存在即合理：每个字段都从装饰器元数据中精确提取
 * - 优雅即简约：利用反射机制，无需手工维护元数据映射
 * - 代码即文档：类型系统保证编译正确性
 */
@Injectable()
export class Compiler {
    /**
     * 编译 AST 为 INode
     */
    compile(ast: Ast | INode): INode {
        if (isNode(ast)) {
            return ast;
        }
        const ctor = findNodeType(ast.type);
        if (!ctor) {
            console.log(ast)
            throw new Error(`compiler error: ast type ${ast.type} not found`)
        }

        const instance = new (ctor as new () => any)();

        for (const [key, value] of Object.entries(ast)) {
            instance[key] = value;
        }

        // 提取 @Node 类装饰器元数据
        const classMetadata = this.extractNodeMetadata(ctor);

        // 提取 @Input 属性装饰器元数据
        const staticInputs = this.extractInputMetadata(ctor);

        const staticOutputs = this.extractOutputMetadata(ctor, instance);

        // 提取 @State 属性装饰器元数据
        const states = this.extractStateMetadata(ctor);

        // 保留动态添加的 inputs/outputs（isStatic: false）
        const existingMetadata = (ast as INode).metadata;
        const dynamicInputs = existingMetadata?.inputs?.filter(i => i.isStatic === false) || [];
        const dynamicOutputs = existingMetadata?.outputs?.filter(o => o.isStatic === false) || [];

        // 组装 INode：直接修改实例，保留原型链（确保 toJSON 方法生效）
        instance.metadata = {
            class: classMetadata,
            inputs: [...staticInputs, ...dynamicInputs],
            outputs: [...staticOutputs, ...dynamicOutputs],
            states
        };

        return instance;
    }

    /**
     * 提取 @Node 类装饰器元数据
     */
    private extractNodeMetadata(ctor: Function): INodeMetadata {
        const allNodeMetadata = root.get(NODE, []) as NodeMetadata[];
        const metadata = allNodeMetadata.find(m => m.target === ctor);

        return {
            title: metadata?.title,
            type: metadata?.type,
            dynamicInputs: metadata?.dynamicInputs,
            dynamicOutputs: metadata?.dynamicOutputs,
            errorStrategy: metadata?.errorStrategy,
            maxRetries: metadata?.maxRetries,
            retryDelay: metadata?.retryDelay,
            retryBackoff: metadata?.retryBackoff,
            stateful: metadata?.stateful,
            hasTool: hasTool(ctor as any)
        };
    }

    /**
     * 提取 @Input 属性装饰器元数据
     */
    private extractInputMetadata(ctor: Function): INodeInputMetadata[] {
        const allInputMetadata = root.get(INPUT, []) as InputMetadata[];
        const targetInputs = allInputMetadata.filter(m => m.target === ctor);

        return targetInputs.map(input => ({
            property: String(input.propertyKey),
            mode: input.mode,
            required: input.required,
            defaultValue: input.defaultValue,
            title: input.title,
            type: input.type,
            isStatic: true
        }));
    }

    /**
     * 提取 @Output 属性装饰器元数据
     *
     * 增强：检测 BehaviorSubject 类型的属性并标记 isSubject
     */
    private extractOutputMetadata(ctor: Function, instance?: any): INodeOutputMetadata[] {
        const allOutputMetadata = root.get(OUTPUT, []) as OutputMetadata[];
        const targetOutputs = allOutputMetadata.filter(m => m.target === ctor);

        return targetOutputs.map(output => {
            const key = String(output.propertyKey);
            // 检测是否为 BehaviorSubject（需要实例）
            const isSubject = false;

            return {
                property: key,
                title: output.title,
                type: output.type,
                isRouter: output.isRouter,
                dynamic: output.dynamic,
                condition: output.condition,
                isStatic: true,
                isSubject
            };
        });
    }

    /**
     * 提取 @State 属性装饰器元数据
     */
    private extractStateMetadata(ctor: Function): INodeStateMetadata[] {
        const allStateMetadata = root.get(STATE, []) as StateMetadata[];
        const targetStates = allStateMetadata.filter(m => m.target === ctor);

        return targetStates.map(state => ({
            propertyKey: state.propertyKey,
            title: state.title,
            type: state.type
        }));
    }
}
