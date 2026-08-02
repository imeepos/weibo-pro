import { root, Injectable } from '@sker/core';
import { EntityManager } from 'typeorm';
import { RedisClient } from '@sker/redis';

@Injectable()
class MockRedisClient implements Partial<RedisClient> {
    private cache = new Map<string, { value: string; expireAt?: number }>();

    async get<T>(key: string): Promise<T | null> {
        const item = this.cache.get(key);
        if (!item) return null;
        if (item.expireAt && item.expireAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return JSON.parse(item.value) as T;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const expireAt = ttl ? Date.now() + ttl * 1000 : undefined;
        this.cache.set(key, { value: JSON.stringify(value), expireAt });
    }

    async setex<T>(key: string, ttl: number, value: T): Promise<void> {
        await this.set(key, value, ttl);
    }

    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async keys(pattern: string): Promise<string[]> {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.cache.keys()).filter(key => regex.test(key));
    }

    clear(): void {
        this.cache.clear();
    }
}

@Injectable()
class MockEntityManager {
    private data = new Map<string, Map<string, any>>();

    constructor() {
        this.data.set('default', new Map());
    }

    getRepository(entity: any) {
        const entityName = entity.name || 'default';
        if (!this.data.has(entityName)) {
            this.data.set(entityName, new Map());
        }
        return this.data.get(entityName);
    }

    create(entityLike: any) {
        return { ...entityLike, id: entityLike.id || `mock-${Date.now()}` };
    }

    async save(entity: any) {
        const repo = this.getRepository(entity.constructor.name)!;
        const id = entity.id || `mock-${Date.now()}`;
        repo.set(id, { ...entity, id });
        return entity;
    }

    async find(options?: any) {
        // Get entity name from first argument if it's a class
        let entityName = 'default';
        if (arguments.length > 0 && typeof arguments[0] === 'function') {
            entityName = arguments[0].name || 'default';
        }
        const repo = this.data.get(entityName);
        const results = repo ? Array.from(repo.values()) : [];
        if (options?.order) {
            results.sort((a, b) => {
                for (const [key, direction] of Object.entries(options.order)) {
                    if (a[key] !== b[key]) {
                        // Check if values are numbers
                        const aNum = typeof a[key] === 'number';
                        const bNum = typeof b[key] === 'number';
                        if (aNum && bNum) {
                            return direction === 'desc' ? b[key] - a[key] : a[key] - b[key];
                        }
                        // For non-numbers, use comparison operators
                        return direction === 'desc'
                            ? (b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0)
                            : (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0);
                    }
                }
                return 0;
            });
        }
        return results;
    }

    async findOne(entity: any, options?: any) {
        // Get entity name from first argument
        let entityName = 'default';
        let actualOptions = options;

        if (typeof entity === 'function') {
            entityName = entity.name || 'default';
        } else if (typeof entity === 'object') {
            actualOptions = entity;
        }

        const repo = this.data.get(entityName);
        const results = repo ? Array.from(repo.values()) : [];

        if (actualOptions?.where?.id) {
            return results.find(r => r.id === actualOptions.where.id) || null;
        }
        return results[0] || null;
    }

    async findAndCount(options?: any) {
        const results = await this.find(options);
        return [results, results.length];
    }

    async update(entity: any, id: string, updates: any) {
        const repo = this.data.get(entity.name || 'default');
        if (repo && repo.has(id)) {
            const existing = repo.get(id);
            repo.set(id, { ...existing, ...updates });
        }
    }

    async delete(entity: any, ids: string | string[]) {
        const idArray = Array.isArray(ids) ? ids : [ids];
        const repo = this.data.get(entity.name || 'default');
        let count = 0;
        if (repo) {
            for (const id of idArray) {
                if (repo.has(id)) {
                    repo.delete(id);
                    count++;
                }
            }
        }
        return { affected: count };
    }

    async createQueryBuilder() {
        return this;
    }

    select() {
        return this;
    }

    where() {
        return this;
    }

    andWhere() {
        return this;
    }

    async getMany() {
        return [];
    }

    deleteQuery() {
        return this;
    }

    whereInIds() {
        return this;
    }

    async execute() {
        return { affected: 0 };
    }
}

const mockRedis = new MockRedisClient();
const mockEntityManager = new MockEntityManager();

root.set([
    { provide: EntityManager, useValue: mockEntityManager },
    { provide: RedisClient, useValue: mockRedis },
]);

export { mockRedis, mockEntityManager };
