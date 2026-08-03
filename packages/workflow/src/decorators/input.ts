import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

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

    required?: boolean;
    defaultValue?: any;
    title?: string;
    // 节点简介 可以给大模型用
    description?: string;
    type?: InputFieldType;
    // 下拉选择框的选项列表（当 type 为 'select' 时使用）
    options?: string[];
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
    // 下拉选择框的选项列表（当 type 为 'select' 时使用）
    options?: string[];
}

export const INPUT = new InjectionToken<InputMetadata[]>(`INPUT`)
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);

        const mode = options?.mode;

        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                mode,
                required: options?.required,
                defaultValue: options?.defaultValue,
                title: options?.title,
                type: options?.type,
                options: options?.options
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
