import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

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
