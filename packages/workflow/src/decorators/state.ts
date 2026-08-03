import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

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
