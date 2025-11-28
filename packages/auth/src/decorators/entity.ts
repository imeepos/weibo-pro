import { root } from '@sker/core';
import { AUTH_ENTITY, AUTH_FIELD } from '../core/tokens';
import { resolveConstructor } from '../core/utils';
import type { FieldOptions } from '../core/types';

export interface EntityOptions {
  tableName: string;
  extendUser?: boolean;
}

/**
 * @Entity 装饰器
 * 标记数据库实体类
 */
export function Entity(options: EntityOptions): ClassDecorator {
  return (target) => {
    const ctor = resolveConstructor(target as object);

    root.set([{
      provide: AUTH_ENTITY,
      useValue: { ...options, target: ctor },
      multi: true
    }]);
  };
}

/**
 * @Field 装饰器
 * 标记实体字段
 * 参考 @sker/workflow 的 @Input/@Output 装饰器
 */
export function Field(options: FieldOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = resolveConstructor(target);

    root.set([{
      provide: AUTH_FIELD,
      multi: true,
      useValue: {
        target: ctor,
        propertyKey,
        ...options
      }
    }]);
  };
}
