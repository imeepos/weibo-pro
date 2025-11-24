import { root, Type } from "@sker/core";
import { Ast } from "./ast";
import { INode } from "./types";
import { NODE, INPUT, OUTPUT, STATE } from "./decorator";

export type NodeJsonPayload = Omit<Partial<INode>, 'type'> & Record<string, unknown> & {
    type: string;
};

function coerceRecord(candidate: unknown): Record<string, unknown> {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as Record<string, unknown>;
    }
    return {};
}

function applyInputData<T extends object>(instance: T, source: Record<string, unknown>): T {
    const ctor = (instance as any).constructor as Type<any>;
    const inputs = root.get(INPUT);
    const host = instance as Record<string | symbol, unknown>;

    inputs.filter(it => it.target === ctor).forEach(field => {
        const value = source[field.propertyKey as string];
        if (value !== undefined) {
            host[field.propertyKey] = value;
        }
    });

    return instance;
}

function applyOutputData<T extends object>(instance: T, source: Record<string, unknown>): T {
    const ctor = (instance as any).constructor as Type<any>;
    const outputs = root.get(OUTPUT);
    const host = instance as Record<string | symbol, unknown>;

    outputs.filter(it => it.target === ctor).forEach(field => {
        const value = source[field.propertyKey as string];
        if (value !== undefined) {
            host[field.propertyKey] = value;
        }
    });

    return instance;
}

function applyStateData<T extends object>(instance: T, source: Record<string, unknown>): T {
    const ctor = (instance as any).constructor as Type<any>;
    const outputs = root.get(STATE);
    const host = instance as Record<string | symbol, unknown>;

    outputs.filter(it => it.target === ctor).forEach(field => {
        const value = source[field.propertyKey as string];
        if (value !== undefined) {
            host[field.propertyKey] = value;
        }
    });

    return instance;
}

interface NodeSnapshot {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    states: Record<string, unknown>;
}

function snapshotNode(instance: object): NodeSnapshot {
    const ctor = (instance as any).constructor as Type<any>;
    const inputs = root.get(INPUT);
    const outputs = root.get(OUTPUT);
    const states = root.get(STATE)
    const host = instance as Record<string | symbol, unknown>;

    const inputData: Record<string, unknown> = {};
    inputs.filter(it => it.target === ctor).forEach(field => {
        const value = host[field.propertyKey];
        if (value !== undefined) {
            inputData[field.propertyKey as string] = value;
        }
    });

    const outputData: Record<string, unknown> = {};
    outputs.filter(it => it.target === ctor).forEach(field => {
        const value = host[field.propertyKey];
        if (value !== undefined) {
            outputData[field.propertyKey as string] = value;
        }
    });

    const stateData: Record<string, unknown> = {}
    states.filter(it => it.target === ctor).forEach(field => {
        const value = host[field.propertyKey];
        if (value !== undefined) {
            stateData[field.propertyKey as string] = value;
        }
    })

    return { inputs: inputData, outputs: outputData, states: stateData };
}

export function fromJson<T extends object = any>(json: any): T {
    const { type, id, state, error, position, name, description, color, collapsed, width, ...rest } = json;
    const registry = root.get(NODE);
    const nodeMetadata = registry.find(node => node.target.name === type);
    const ctor = nodeMetadata?.target;

    if (!ctor) {
        console.error(`from json error: `, { json })
        throw new Error(`Unknown workflow node type "${json.type}".`);
    }

    const instance = new ctor() as T;

    const source = coerceRecord(rest);

    applyInputData(instance, source);
    applyOutputData(instance, source);
    applyStateData(instance, source);

    if (type) Reflect.set(instance, 'type', type);
    if (id) Reflect.set(instance, 'id', id);
    if (state) Reflect.set(instance, 'state', state);
    if (error) Reflect.set(instance, 'error', error);
    if (position) Reflect.set(instance, 'position', position);
    Reflect.set(instance, 'collapsed', !!collapsed)
    if (width) Reflect.set(instance, 'width', width)

    // 恢复节点的扩展属性（用于 UI 自定义）
    if (name !== undefined) Reflect.set(instance, 'name', name);
    if (description !== undefined) Reflect.set(instance, 'description', description);
    if (color !== undefined) Reflect.set(instance, 'color', color);

    return instance;
}

export function toJson(ast: Ast): INode {
    const { inputs, outputs, states } = snapshotNode(ast);
    const node: INode = {
        ...inputs,
        ...outputs,
        ...states,
        count: ast.count,
        type: ast.type,
        id: ast.id,
        state: ast.state,
        error: ast.error,
        position: ast.position
    };

    // 保存节点的扩展属性（用于 UI 自定义）
    const extendedAst = ast as any;
    if (extendedAst.name !== undefined) node.name = extendedAst.name;
    if (extendedAst.description !== undefined) node.description = extendedAst.description;
    if (extendedAst.color !== undefined) node.color = extendedAst.color;

    return node;
}
