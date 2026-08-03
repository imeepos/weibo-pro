import { InjectionToken, Type } from '@sker/core'
import type { InputFieldType } from './input'

/**
 * 派生节点输入端口元数据
 * 用于覆盖基类的 @Input 装饰器元数据
 */
export interface DerivedInputMetadata {
    target: Type<any>;
    inputs: Array<{
        property: string;
        mode?: number;
        required?: boolean;
        defaultValue?: any;
        title?: string;
        type?: InputFieldType;
    }>;
}

export const DERIVED_INPUT = new InjectionToken<DerivedInputMetadata[]>(`DERIVED_INPUT`);

/**
 * 派生节点输出端口元数据
 * 用于覆盖基类的 @Output 装饰器元数据
 */
export interface DerivedOutputMetadata {
    target: Type<any>;
    outputs: Array<{
        property: string;
        title?: string;
        type?: string;
        isRouter?: boolean;
        dynamic?: boolean;
        condition?: string;
    }>;
}

export const DERIVED_OUTPUT = new InjectionToken<DerivedOutputMetadata[]>(`DERIVED_OUTPUT`);
