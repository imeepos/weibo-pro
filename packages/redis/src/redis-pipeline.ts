import { ChainableCommander } from 'ioredis';

export class RedisPipeline {
    constructor(private pipeline: ChainableCommander) { }

    get(key: string): RedisPipeline {
        this.pipeline.get(key);
        return this;
    }

    set(key: string, value: string, ttl?: number): RedisPipeline {
        if (ttl) {
            this.pipeline.setex(key, ttl, value);
        } else {
            this.pipeline.set(key, value);
        }
        return this;
    }

    del(key: string): RedisPipeline {
        this.pipeline.del(key);
        return this;
    }

    zincrby(key: string, increment: number, member: string): RedisPipeline {
        this.pipeline.zincrby(key, increment, member);
        return this;
    }

    zadd(key: string, score: number, member: string): RedisPipeline {
        this.pipeline.zadd(key, score, member);
        return this;
    }

    expire(key: string, seconds: number): RedisPipeline {
        this.pipeline.expire(key, seconds);
        return this;
    }

    hmset(key: string, data: Record<string, any>): RedisPipeline {
        this.pipeline.hmset(key, data);
        return this;
    }

    hset(key: string, field: string, value: any): RedisPipeline {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        this.pipeline.hset(key, field, serialized);
        return this;
    }

    async exec(): Promise<[Error | null, any][] | null> {
        return await this.pipeline.exec();
    }
}
