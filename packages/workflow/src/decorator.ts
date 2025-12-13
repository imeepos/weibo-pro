import { InjectionToken, root, Type } from '@sker/core'
import { BehaviorSubject } from 'rxjs'
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
    /**
     * @deprecated 使用 mode: IS_MULTI 替代
     * 向后兼容：isMulti: true 等价于 mode: IS_MULTI
     */
    isMulti?: boolean;

    required?: boolean;
    defaultValue?: any;
    title?: string;
    // 节点简介 可以给大模型用
    description?: string;
    type?: InputFieldType;
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
}

export const INPUT = new InjectionToken<InputMetadata[]>(`INPUT`)
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);

        // 向后兼容：isMulti: true → mode: IS_MULTI
        let mode = options?.mode;
        if (mode === undefined && options?.isMulti === true) {
            mode = IS_MULTI;
        }

        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                mode,
                isMulti: options?.isMulti ?? false,  // 保留旧字段以向后兼容
                required: options?.required,
                defaultValue: options?.defaultValue,
                title: options?.title,
                type: options?.type
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
    // 路由节点支持
    isRouter?: boolean;      // 标识为路由输出，Scheduler 会过滤 undefined 值
    dynamic?: boolean;       // 支持 UI 动态添加输出端口
    condition?: string;      // 条件表达式字符串（如 '$input === 1'）
}

export interface OutputMetadata extends OutputOptions {
    target: Type<any>;
    propertyKey: string | symbol;
    isSubject?: boolean;     // 标识为 BehaviorSubject 类型
}

export const OUTPUT = new InjectionToken<OutputMetadata[]>(`OUTPUT`)

/**
 * 输出装饰器
 *
 * 支持两种风格：
 * 1. 值类型（向后兼容）: @Output() result?: Post[]
 * 2. BehaviorSubject（推荐）: @Output() result = new BehaviorSubject<Post[]>([])
 *
 * BehaviorSubject 风格的优势：
 * - 运行时直接发射值，无需 emitting 状态
 * - 下游自动订阅，数据流更清晰
 * - 序列化时自动跳过（只保存元数据）
 */
export function Output(options: OutputOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: OUTPUT, multi: true, useValue: { target: ctor, propertyKey, ...options } }])
    };
}

/**
 * 检查节点实例的某个属性是否为 BehaviorSubject
 */
export function isOutputSubject(instance: any, propertyKey: string | symbol): boolean {
    const value = instance[propertyKey];
    return value instanceof BehaviorSubject;
}

/**
 * 获取节点的所有 Output BehaviorSubject
 */
export function getOutputSubjects(instance: any): Map<string, BehaviorSubject<any>> {
    const ctor = resolveConstructor(instance);
    const outputs = root.get(OUTPUT, []).filter(it => it.target === ctor);
    const subjects = new Map<string, BehaviorSubject<any>>();

    for (const output of outputs) {
        const key = String(output.propertyKey);
        const value = instance[key];
        if (value instanceof BehaviorSubject) {
            subjects.set(key, value);
        }
    }

    return subjects;
}

export interface StateOptions {
    title?: string;
    type?: string;
}

export interface StateMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    title?: string;
    type?: string;
}

export const STATE = new InjectionToken<StateMetadata[]>(`STATE`)
export function State(options?: StateOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: STATE, multi: true, useValue: { target: ctor, type: options?.type, propertyKey, title: options?.title } }])
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

