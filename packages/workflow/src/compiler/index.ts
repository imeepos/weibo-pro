import { Injectable, root } from "@sker/core";
import { BehaviorSubject } from "rxjs";
import { Ast } from "../ast";
import { INode, INodeInputMetadata, INodeMetadata, INodeOutputMetadata, INodeStateMetadata, isNode } from "../types";
import { findNodeType, INPUT, InputMetadata, NODE, NodeMetadata, OUTPUT, OutputMetadata, STATE, StateMetadata } from "../decorator";

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
     *
     * 流程：
     * 1. 实例化节点类（确保 BehaviorSubject 等默认值被正确初始化）
     * 2. 合并 JSON 数据（跳过 BehaviorSubject 属性）
     * 3. 从全局 DI 容器提取装饰器元数据
     * 4. 组装完整的 INode 结构
     */
    compile(ast: Ast | INode): INode {
        if (isNode(ast)) return ast;
        const ctor = findNodeType(ast.type);
        if (!ctor) {
            console.log(ast)
            throw new Error(`compiler error: ast type ${ast.type} not found`)
        }

        // 实例化节点类，确保 BehaviorSubject 等默认值被正确初始化
        const instance = new (ctor as new () => any)();

        // 合并 JSON 数据到实例，跳过 BehaviorSubject 属性
        for (const [key, value] of Object.entries(ast)) {
            if (!(instance[key] instanceof BehaviorSubject)) {
                instance[key] = value;
            }
        }

        // 提取 @Node 类装饰器元数据
        const classMetadata = this.extractNodeMetadata(ctor);

        // 提取 @Input 属性装饰器元数据
        const inputs = this.extractInputMetadata(ctor);

        // 提取 @Output 属性装饰器元数据（传递实例以检测 BehaviorSubject）
        const outputs = this.extractOutputMetadata(ctor, instance);

        // 提取 @State 属性装饰器元数据
        const states = this.extractStateMetadata(ctor);

        // 组装 INode
        return {
            // 基础属性（从实例获取，包含正确初始化的 BehaviorSubject）
            ...instance,

            // 元数据
            metadata: {
                class: classMetadata,
                inputs,
                outputs,
                states
            },
        };
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
            dynamicOutputs: metadata?.dynamicOutputs
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
            const isSubject = instance ? instance[key] instanceof BehaviorSubject : false;

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
