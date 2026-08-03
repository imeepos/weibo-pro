import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

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
