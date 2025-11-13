/plan 完成下面的任务


fix: @sker/api 报错：[Nest] 42256  - 2025/11/13 18:57:48   ERROR [ExceptionsHandler] operator does not exist: numeric <> text
QueryFailedError: operator does not exist: numeric <> text
    at PostgresQueryRunner.query (C:\Users\imeep\Desktop\shopify\weibo-pro\node_modules\.pnpm\typeorm@0.3.27_ioredis@5.8.2_pg@8.16.3_reflect-metadata@0.2.2_ts-node@10.9.2_@swc+core@1.15.1_een2xlursvndok6i356fq3l4ai\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async DataSource.query (C:\Users\imeep\Desktop\shopify\weibo-pro\node_modules\.pnpm\typeorm@0.3.27_ioredis@5.8.2_pg@8.16.3_reflect-metadata@0.2.2_ts-node@10.9.2_@swc+core@1.15.1_een2xlursvndok6i356fq3l4ai\node_modules\typeorm\data-source\src\data-source\DataSource.ts:541:20)
    at async C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\data\user-relation.service.js:134:31
    at async useEntityManager (C:\Users\imeep\Desktop\shopify\weibo-pro\packages\entities\src\utils.ts:66:15)
    at async CacheService.getOrSet (C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\cache.service.js:48:22)   
    at async UserRelationService.getNetwork (C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\data\user-relation.service.js:33:16)
[Nest] 42256  - 2025/11/13 18:57:48   ERROR [ExceptionsHandler] operator does not exist: numeric <> text
QueryFailedError: operator does not exist: numeric <> text
    at PostgresQueryRunner.query (C:\Users\imeep\Desktop\shopify\weibo-pro\node_modules\.pnpm\typeorm@0.3.27_ioredis@5.8.2_pg@8.16.3_reflect-metadata@0.2.2_ts-node@10.9.2_@swc+core@1.15.1_een2xlursvndok6i356fq3l4ai\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async DataSource.query (C:\Users\imeep\Desktop\shopify\weibo-pro\node_modules\.pnpm\typeorm@0.3.27_ioredis@5.8.2_pg@8.16.3_reflect-metadata@0.2.2_ts-node@10.9.2_@swc+core@1.15.1_een2xlursvndok6i356fq3l4ai\node_modules\typeorm\data-source\src\data-source\DataSource.ts:541:20)
    at async C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\data\user-relation.service.js:134:31
    at async useEntityManager (C:\Users\imeep\Desktop\shopify\weibo-pro\packages\entities\src\utils.ts:66:15)
    at async CacheService.getOrSet (C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\cache.service.js:48:22)   
    at async UserRelationService.getNetwork (C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\dist\services\data\user-relation.service.js:33:16)