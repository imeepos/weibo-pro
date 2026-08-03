import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

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
