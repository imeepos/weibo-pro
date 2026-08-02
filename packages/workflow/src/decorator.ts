import { InjectionToken, root, Type } from '@sker/core'
/**
 * 获取所有已注册的节点类型
 */
export function getAllNodeTypes(): Type<any>[] {
    const nodeMetadatas = root.get(NODE, [])
    return nodeMetadatas.map(metadata => metadata.target)
}

export function findNodeType<T = any>(name: string): Type<T> | undefined {
    return getAllNodeTypes().find((type: any) => type.name === name)
}
export function resolveConstructor(target: object | Type<any>): Type<any> {
    if (typeof target === 'function') {
        return target as Type<any>;
    }
    const typeName = Reflect.get(target, 'type')
    const type = findNodeType(typeName)
    if (type) return type;
    if (target && typeof target === 'object' && typeof (target as { constructor?: unknown }).constructor === 'function') {
        return (target as { constructor: Type<any> }).constructor;
    }
    throw new Error('Workflow decorators expect to receive a class constructor or instance.');
}

export type NodeType = `llm` | `basic` | `crawler` | `control` | `sentiment` | `analysis` | `scheduler`;

/**
 * 错误处理策略
 *
 * - retry: 自动重试（适用于网络波动、临时故障）
 * - skip: 跳过失败节点，继续执行下游（适用于可选节点）
 * - fail: 标记失败但不中断工作流（默认行为）
 * - abort: 中断整个工作流（适用于关键节点）
 */
export type ErrorStrategy = 'retry' | 'skip' | 'fail' | 'abort';

export interface NodeOptions {
    title?: string;
    type?: NodeType;
    dynamicInputs?: boolean;
    dynamicOutputs?: boolean;

    /** 错误处理策略 */
    errorStrategy?: ErrorStrategy;
    /** 最大重试次数（仅对 retry 策略有效） */
    maxRetries?: number;
    /** 重试延迟（毫秒，仅对 retry 策略有效） */
    retryDelay?: number;
    /** 重试延迟增长因子（指数退避） */
    retryBackoff?: number;

    /** 状态保留：true 时节点在工作流运行时保留数据，不重置为默认值 */
    stateful?: boolean;
}

export interface NodeMetadata extends NodeOptions {
    target: Type<any>;
}

export const NODE = new InjectionToken<NodeMetadata[]>(`NODE`)
export function Node(options: NodeOptions = {}): ClassDecorator {
    return (target) => {
        const ctor = resolveConstructor(target as object);
        root.set([{ provide: NODE, useValue: { target: ctor, ...options }, multi: true }])
    };
}
export interface EdgeOptions { }
export interface EdgeMetadata extends EdgeOptions {
    target: Type<any>;
}
export const EDGE = new InjectionToken<EdgeMetadata[]>(`EDGE`)
export const Edge = (options: EdgeOptions = {}): ClassDecorator => {
    return (target) => {
        const ctor = resolveConstructor(target as object);
        root.set([{ provide: EDGE, useValue: { target: ctor, ...options }, multi: true }])
    };
}
export const HANDLER_METHOD = new InjectionToken<{ ast: Type<any>, target: Type<any>, property: string | symbol }[]>(`HANDLER_METHOD`)
export function Handler(ast: Type<any>): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: HANDLER_METHOD,
            multi: true,
            useValue: {
                ast: ast, target: ctor, property: propertyKey
            }
        }, {
            provide: ctor,
            useClass: ctor
        }])
        return descriptor;
    };
}

export const RENDER_METHOD = new InjectionToken<{ ast: Type<any>, target: Type<any>, property: string | symbol }[]>(`RENDER_METHOD`)
export function Render(ast: Type<any>): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: RENDER_METHOD,
            multi: true,
            useValue: {
                ast: ast, target: ctor, property: propertyKey
            }
        }, {
            provide: ctor,
            useClass: ctor
        }])
        return descriptor;
    };
}

export const SETTING_METHOD = new InjectionToken<{ ast: Type<any>, target: Type<any>, property: string | symbol }[]>(`SETTING_METHOD`)
export function Setting(ast: Type<any>): any {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: SETTING_METHOD,
            multi: true,
            useValue: {
                ast: ast, target: ctor, property: propertyKey
            }
        }, {
            provide: ctor,
            useClass: ctor
        }])
        return descriptor;
    };
}

export const PREVIEW_METHOD = new InjectionToken<{ ast: Type<any>, target: Type<any>, property: string | symbol }[]>(`PREVIEW_METHOD`)
export function Preview(ast: Type<any>): any {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: PREVIEW_METHOD,
            multi: true,
            useValue: {
                ast: ast, target: ctor, property: propertyKey
            }
        }, {
            provide: ctor,
            useClass: ctor
        }])
        return descriptor;
    };
}

/**
 * 输入聚合模式位标志
 *
 * 优雅设计：使用位标志组合不同的聚合语义
 */
export const IS_MULTI = 0x000001;   // 聚合多条边 → [edge1, edge2]
export const IS_BUFFER = 0x000010;  // 聚合单边多次发射 → [emit1, emit2, emitN]

/**
 * 位标志检查辅助函数
 */
export function hasMultiMode(mode?: number): boolean {
    return ((mode ?? 0) & IS_MULTI) === IS_MULTI;
}

export function hasBufferMode(mode?: number): boolean {
    return ((mode ?? 0) & IS_BUFFER) === IS_BUFFER;
}

/** 支持的输入字段类型 */
export type InputFieldType =
    | 'string'
    | 'text'
    | 'textarea'
    | 'richtext'
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime-local'
    | 'select'
    | 'image'
    | 'video'
    | 'audio'
    | 'object'
    | 'any';

export interface InputOptions {
    /**
     * 输入聚合模式（位标志）
     *
     * 使用位标志组合不同的聚合语义：
     * - IS_MULTI (0x000001)：聚合多条边
     * - IS_BUFFER (0x000010)：聚合单边多次发射
     * - IS_MULTI | IS_BUFFER：聚合所有边所有发射
     *
     * @example
     * @Input({ mode: IS_MULTI })           // 多条边聚合
     * @Input({ mode: IS_BUFFER })          // 单边发射聚合
     * @Input({ mode: IS_MULTI | IS_BUFFER }) // 全部聚合
     */
    mode?: number;

    required?: boolean;
    defaultValue?: any;
    title?: string;
    // 节点简介 可以给大模型用
    description?: string;
    type?: InputFieldType;
    // 下拉选择框的选项列表（当 type 为 'select' 时使用）
    options?: string[];
    // 支持UI动态添加输入节点
    dynamic?: boolean;
    isAst?: boolean;
}

export interface InputMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    mode?: number;
    /** @deprecated 使用 mode 替代 */
    isMulti?: boolean;
    required?: boolean;
    defaultValue?: any;
    title?: string;
    type?: InputFieldType;
    // 下拉选择框的选项列表（当 type 为 'select' 时使用）
    options?: string[];
}

export const INPUT = new InjectionToken<InputMetadata[]>(`INPUT`)
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);

        const mode = options?.mode;

        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                mode,
                required: options?.required,
                defaultValue: options?.defaultValue,
                title: options?.title,
                type: options?.type,
                options: options?.options
            }
        }])
    };
}

export function getInputMetadata(target: Type<any> | object, propertyKey?: string | symbol): InputMetadata | InputMetadata[] {
    const ctor = resolveConstructor(target);
    const allInputs = root.get(INPUT, []);
    const targetInputs = allInputs.filter(it => it.target === ctor);

    if (propertyKey !== undefined) {
        const metadata = targetInputs.find(it => it.propertyKey === propertyKey);
        return metadata || { target: ctor, propertyKey, mode: 0, isMulti: false };
    }

    return targetInputs;
}

export interface OutputOptions {
    title?: string;
    type?: string;
    description?: string;
    defaultValue?: any;
    // 路由节点支持
    isRouter?: boolean;      // 标识为路由输出，Scheduler 会过滤 undefined 值
    dynamic?: boolean;       // 支持 UI 动态添加输出端口
    condition?: string;      // 条件表达式字符串（如 '$input === 1'）
}

export interface OutputMetadata extends OutputOptions {
    target: Type<any>;
    propertyKey: string | symbol;
}

export const OUTPUT = new InjectionToken<OutputMetadata[]>(`OUTPUT`)

/**
 * 输出装饰器
 */
export function Output(options: OutputOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: OUTPUT, multi: true, useValue: { target: ctor, propertyKey, ...options } }])
    };
}

export interface StateOptions {
    title?: string;
    type?: string;
    defaultValue?: any;
}

export interface StateMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    title?: string;
    type?: string;
    defaultValue?: any;
}

export const STATE = new InjectionToken<StateMetadata[]>(`STATE`)
export function State(options?: StateOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: STATE, multi: true, useValue: { target: ctor, type: options?.type, propertyKey, title: options?.title, defaultValue: options?.defaultValue } }])
    };
}

export function getStateMetadata(target: Type<any> | object, propertyKey?: string | symbol): StateMetadata | StateMetadata[] {
    const ctor = resolveConstructor(target);
    const allStates = root.get(STATE, []);
    const targetStates = allStates.filter(it => it.target === ctor);

    if (propertyKey !== undefined) {
        const metadata = targetStates.find(it => it.propertyKey === propertyKey);
        return metadata || { target: ctor, propertyKey };
    }

    return targetStates;
}

/**
 * 工具方法元数据
 * 类似 HANDLER_METHOD 的设计
 */
export interface ToolMethodMetadata {
    ast: Type<any>;              // 节点类型（如 TextAreaAst）
    target: Type<any>;           // 工具类（如 TextAreaTool）
    property: string | symbol;   // 方法名（如 'get', 'detail'）
}

/**
 * 工具方法注册 Token
 */
export const TOOL_METHOD = new InjectionToken<ToolMethodMetadata[]>(`TOOL_METHOD`);

/**
 * @Tool 方法装饰器
 * 标记某个方法为特定节点类型的工具方法
 *
 * @param ast 节点类型（如 TextAreaAst）
 *
 * @example
 * @Injectable()
 * export class TextAreaTool {
 *   @Tool(TextAreaAst)
 *   get(ast: TextAreaAst): {id: string, title: string, summary: string, content: string } {}
 * }
 */
export function Tool(ast: Type<any>): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);

        root.set([
            {
                provide: TOOL_METHOD,
                multi: true,
                useValue: {
                    ast: ast,
                    target: ctor,
                    property: propertyKey
                }
            },
            {
                provide: ctor,
                useClass: ctor
            }
        ]);

        return descriptor;
    };
}

/**
 * 获取节点类型的所有工具方法
 */
export function getToolMethods(ast: Type<any>): ToolMethodMetadata[] {
    const allTools = root.get(TOOL_METHOD, []);
    return allTools.filter(tool => tool.ast === ast);
}

/**
 * 检查节点类型是否有工具支持
 */
export function hasTool(ast: Type<any>): boolean {
    return getToolMethods(ast).length > 0;
}

/**
 * 派生节点输入端口元数据
 * 用于覆盖基类的 @Input 装饰器元数据
 */
export interface DerivedInputMetadata {
    target: Type<any>;
    inputs: Array<{
        property: string;
        mode?: number;
        required?: boolean;
        defaultValue?: any;
        title?: string;
        type?: InputFieldType;
    }>;
}

export const DERIVED_INPUT = new InjectionToken<DerivedInputMetadata[]>(`DERIVED_INPUT`);

/**
 * 派生节点输出端口元数据
 * 用于覆盖基类的 @Output 装饰器元数据
 */
export interface DerivedOutputMetadata {
    target: Type<any>;
    outputs: Array<{
        property: string;
        title?: string;
        type?: string;
        isRouter?: boolean;
        dynamic?: boolean;
        condition?: string;
    }>;
}

export const DERIVED_OUTPUT = new InjectionToken<DerivedOutputMetadata[]>(`DERIVED_OUTPUT`);

