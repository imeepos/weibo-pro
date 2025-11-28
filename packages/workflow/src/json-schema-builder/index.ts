import { Observable, Subject } from "rxjs";
import { JSONSchema6 as JsonSchema } from 'json-schema'
import { INode } from "../types";

export function buildJsonSchema(node: Subject<INode>): Observable<JsonSchema> {
    throw new Error(`method not implements`)
}
