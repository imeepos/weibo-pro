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

export interface NodeOptions {
    title?: string;
    icon?: any;
    color?: string;
    outputs?: OutputOptions;
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

export interface InputOptions {
    /**
     * Marks this input property to accept multiple edge inputs and aggregate them into an array.
     * When isMulti is true, multiple incoming edges will accumulate values into an array instead of overwriting.
     * @default false
     */
    isMulti?: boolean;
    /**
     * Marks this input as required. If true, the node will not execute unless this input is connected.
     * If false or undefined, the input is optional and will use defaultValue if not connected.
     * @default undefined (auto-detect from property initializer)
     */
    required?: boolean;
    /**
     * Default value to use when this input is not connected.
     * If not specified, will attempt to read the property's initial value from the class.
     * @default undefined
     */
    defaultValue?: any;
    title?: string;
    type?: string;
}

export interface InputMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    isMulti?: boolean;
    required?: boolean;
    defaultValue?: any;
    title?: string;
    type?: string;
}

export const INPUT = new InjectionToken<InputMetadata[]>(`INPUT`)
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                isMulti: options?.isMulti ?? false,
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
        return metadata || { target: ctor, propertyKey, isMulti: false };
    }

    return targetInputs;
}
export interface OutputOptions {
    title?: string;
    type?: string;
    properties?: {
        [key: string]: OutputOptions;
    }
}

export interface OutputMetadata extends OutputOptions {
    target: Type<any>;
    propertyKey: string | symbol;
}

export const OUTPUT = new InjectionToken<OutputMetadata[]>(`OUTPUT`)
export function Output(options: OutputOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: OUTPUT, multi: true, useValue: { target: ctor, propertyKey, ...options } }])
    };
}

export interface StateOptions {
    title?: string;
    type?: string;
}

export interface StateMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    title?: string;
}

export const STATE = new InjectionToken<StateMetadata[]>(`STATE`)
export function State(options?: StateOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: STATE, multi: true, useValue: { target: ctor, propertyKey, title: options?.title } }])
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

