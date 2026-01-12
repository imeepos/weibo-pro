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
        return this;
    }

    create(entityLike: any) {
        return { ...entityLike, id: entityLike.id || `mock-${Date.now()}` };
    }

    async save(entity: any) {
        const repo = this.getRepository(entity.constructor.name);
        const id = entity.id || `mock-${Date.now()}`;
        repo.set(id, { ...entity, id });
        return entity;
    }

    async find(options?: any) {
        const repo = this.getRepository('default');
        const results = Array.from(repo.values());
        if (options?.order) {
            results.sort((a, b) => {
                for (const [key, direction] of Object.entries(options.order)) {
                    if (a[key] !== b[key]) {
                        return direction === 'desc' ? b[key] - a[key] : a[key] - b[key];
                    }
                }
                return 0;
            });
        }
        return results;
    }

    async findOne(options: any) {
        const results = await this.find();
        if (options?.where?.id) {
            return results.find(r => r.id === options.where.id) || null;
        }
        return results[0] || null;
    }

    async findAndCount(options?: any) {
        const results = await this.find(options);
        return [results, results.length];
    }

    async update(entity: any, id: string, updates: any) {
        const repo = this.getRepository(entity.name);
        const existing = repo.get(id);
        if (existing) {
            repo.set(id, { ...existing, ...updates });
        }
    }

    async delete(entity: any, ids: string | string[]) {
        const idArray = Array.isArray(ids) ? ids : [ids];
        const repo = this.getRepository(entity.name || 'default');
        let count = 0;
        for (const id of idArray) {
            if (repo.has(id)) {
                repo.delete(id);
                count++;
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

    delete() {
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
