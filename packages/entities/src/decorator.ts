import { EntityOptions, Entity as TypeormEntity, ViewEntityOptions, ViewEntity as TypeormViewEntity } from 'typeorm'
import { InjectionToken, root, Type } from '@sker/core'
export const ENTITY = new InjectionToken<Type<any>[]>(`ENTITY`)

export const Entity = (name?: string | EntityOptions, options?: EntityOptions): ClassDecorator => {
    return (target) => {
        root.set([{ provide: ENTITY, useValue: target, multi: true }])
        if (typeof name === 'string') {
            return TypeormEntity(name, options)(target)
        }
        return TypeormEntity(name)(target)
    }
}

export const ViewEntity = (name?: string | ViewEntityOptions, options?: ViewEntityOptions): ClassDecorator => {
    return (target) => {
        root.set([{ provide: ENTITY, useValue: target, multi: true }])
        if (typeof name === 'string') {
            return TypeormViewEntity(name, options)(target)
        }
        return TypeormViewEntity(name)(target)
    }
}