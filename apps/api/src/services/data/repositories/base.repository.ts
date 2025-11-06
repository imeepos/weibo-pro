import { EntityManager, EntityTarget, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';

/**
 * Repository 基类
 *
 * 存在即合理:
 * - 统一数据访问层接口
 * - 消除重复的 CRUD 代码
 * - 提供类型安全的查询方法
 *
 * 优雅即简约:
 * - 泛型设计，支持任意实体类型
 * - 链式查询，流畅的 API
 * - 封装 TypeORM 复杂性
 */
export abstract class BaseRepository<T> {
    constructor(
        protected readonly entityManager: EntityManager,
        protected readonly entityClass: EntityTarget<T>
    ) {}

    /**
     * 查找所有符合条件的记录
     */
    async findAll(options?: FindManyOptions<T>): Promise<T[]> {
        return await this.entityManager.find(this.entityClass, options);
    }

    /**
     * 根据 ID 查找单条记录
     */
    async findById(id: string | number): Promise<T | null> {
        return await this.entityManager.findOne(this.entityClass, {
            where: { id } as FindOptionsWhere<T>
        });
    }

    /**
     * 查找单条记录
     */
    async findOne(options: FindOneOptions<T>): Promise<T | null> {
        return await this.entityManager.findOne(this.entityClass, options);
    }

    /**
     * 统计记录数
     */
    async count(options?: FindManyOptions<T>): Promise<number> {
        return await this.entityManager.count(this.entityClass, options);
    }

    /**
     * 创建查询构造器
     */
    createQueryBuilder(alias: string) {
        return this.entityManager.createQueryBuilder(this.entityClass, alias);
    }

    /**
     * 保存实体
     */
    async save(entity: T): Promise<T> {
        return await this.entityManager.save(this.entityClass, entity);
    }

    /**
     * 批量保存
     */
    async saveMany(entities: T[]): Promise<T[]> {
        return await this.entityManager.save(this.entityClass, entities);
    }

    /**
     * 删除实体
     */
    async remove(entity: T): Promise<T> {
        return await this.entityManager.remove(entity);
    }

    /**
     * 批量删除
     */
    async removeMany(entities: T[]): Promise<T[]> {
        return await this.entityManager.remove(entities);
    }
}
