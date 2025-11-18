import { root, Type } from "@sker/core";
import { Ast } from "./ast";
import { INode } from "./types";
import { NODE, INPUT, OUTPUT } from "./decorator";

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

interface NodeSnapshot {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
}

function snapshotNode(instance: object): NodeSnapshot {
    const ctor = (instance as any).constructor as Type<any>;
    const inputs = root.get(INPUT);
    const outputs = root.get(OUTPUT);
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

    return { inputs: inputData, outputs: outputData };
}

export function fromJson<T extends object = any>(json: any): T {
    const { type, id, state, error, position, ...rest } = json;
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

    if (type) Reflect.set(instance, 'type', type);
    if (id) Reflect.set(instance, 'id', id);
    if (state) Reflect.set(instance, 'state', state);
    if (error) Reflect.set(instance, 'error', error);
    if (position) Reflect.set(instance, 'position', position);

    return instance;
}

export function toJson(ast: Ast): INode {
    const { inputs, outputs } = snapshotNode(ast);
    return {
        ...inputs,
        ...outputs,
        type: ast.type,
        id: ast.id,
        state: ast.state,
        error: ast.error,
        position: ast.position
    };
}
