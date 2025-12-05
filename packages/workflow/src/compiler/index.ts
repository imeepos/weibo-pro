import { Injectable, root } from "@sker/core";
import { Ast } from "../ast";
import { INode, INodeInputMetadata, INodeMetadata, INodeOutputMetadata, INodeStateMetadata } from "../types";
import { INPUT, InputMetadata, NODE, NodeMetadata, OUTPUT, OutputMetadata, STATE, StateMetadata } from "../decorator";

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
     * 1. 提取 AST 基础属性（id, name, state, count, position...）
     * 2. 从全局 DI 容器提取装饰器元数据
     * 3. 组装完整的 INode 结构
     */
    compile(ast: Ast): INode {
        const ctor = ast.constructor;

        // 提取 @Node 类装饰器元数据
        const classMetadata = this.extractNodeMetadata(ctor);

        // 提取 @Input 属性装饰器元数据
        const inputs = this.extractInputMetadata(ctor);

        // 提取 @Output 属性装饰器元数据
        const outputs = this.extractOutputMetadata(ctor);

        // 提取 @State 属性装饰器元数据
        const states = this.extractStateMetadata(ctor);

        // 组装 INode
        return {
            // 基础属性
            id: ast.id,
            name: ast.name,
            description: ast.description,
            state: ast.state,
            count: ast.count,
            emitCount: ast.emitCount,
            type: ast.type,
            error: ast.error,
            position: ast.position,

            // 元数据
            metadata: {
                class: classMetadata,
                inputs,
                outputs,
                states
            },

            // 其他属性（如 color, collapsed, width, dynamicOutputs, portLabels）
            ...(ast.color && { color: ast.color }),
            ...(ast.collapsed !== undefined && { collapsed: ast.collapsed }),
            ...(ast.width && { width: ast.width }),
            ...(ast.dynamicOutputs && { dynamicOutputs: ast.dynamicOutputs }),
            ...(ast.portLabels && { portLabels: ast.portLabels })
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
            type: metadata?.type
        };
    }

    /**
     * 提取 @Input 属性装饰器元数据
     */
    private extractInputMetadata(ctor: Function): INodeInputMetadata[] {
        const allInputMetadata = root.get(INPUT, []) as InputMetadata[];
        const targetInputs = allInputMetadata.filter(m => m.target === ctor);

        return targetInputs.map(input => ({
            propertyKey: String(input.propertyKey),
            mode: input.mode,
            required: input.required,
            defaultValue: input.defaultValue,
            title: input.title,
            type: input.type
        }));
    }

    /**
     * 提取 @Output 属性装饰器元数据
     */
    private extractOutputMetadata(ctor: Function): INodeOutputMetadata[] {
        const allOutputMetadata = root.get(OUTPUT, []) as OutputMetadata[];
        const targetOutputs = allOutputMetadata.filter(m => m.target === ctor);

        return targetOutputs.map(output => ({
            propertyKey: String(output.propertyKey),
            title: output.title,
            type: output.type,
            isRouter: output.isRouter,
            dynamic: output.dynamic,
            condition: output.condition
        }));
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
