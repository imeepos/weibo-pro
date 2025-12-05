import { Ast } from "./ast";
import { INode } from "./types";

export type NodeJsonPayload = Omit<Partial<INode>, 'type'> & Record<string, unknown> & {
    type: string;
};

export function fromJson<T extends object = any>(json: any): T {
    return json as T;
}

export function toJson(ast: Ast): INode {
    return ast as INode;
}
