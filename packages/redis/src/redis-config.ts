export const redisConfigFactory = (): string => {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        return redisUrl;
    }
    throw new Error(`REDIS_URL NOT FOUND`)
};
