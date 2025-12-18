import { SchedulerLike, SchedulerAction, Subscription, asyncScheduler } from 'rxjs';

/**
 * 并发控制调度器 - 实现 RxJS SchedulerLike 接口
 *
 * 设计哲学：
 * - 存在即合理：通过队列控制并发度，防止过载
 * - 优雅即简约：符合 RxJS 标准 Scheduler 接口
 * - 性能即艺术：信号量机制优雅控制并发执行
 *
 * 使用方式：
 * ```ts
 * import { crawlerScheduler } from '@sker/workflow';
 *
 * workflow$.pipe(
 *   observeOn(crawlerScheduler)
 * ).subscribe(...)
 * ```
 */
export class ConcurrencyScheduler implements SchedulerLike {
    public now = Date.now;

    private runningCount = 0;
    private taskQueue: Array<() => void> = [];
    private maxConcurrency: number;

    constructor(
        private delegate: SchedulerLike = asyncScheduler,
        maxConcurrency: number = 1
    ) {
        this.maxConcurrency = Math.max(1, maxConcurrency);
    }

    schedule<T>(
        work: (this: SchedulerAction<T>, state?: T) => void,
        delay: number = 0,
        state?: T
    ): Subscription {
        const wrappedWork = (action: SchedulerAction<T>, innerState?: T) => {
            this.runningCount++;

            try {
                work.call(action, innerState);
            } finally {
                this.runningCount--;
                this.processQueue();
            }
        };

        // 如果未达到并发上限，立即执行
        if (this.runningCount < this.maxConcurrency) {
            return this.delegate.schedule(wrappedWork, delay, state);
        }

        // 否则加入队列
        return new Subscription(() => {
            const executeTask = () => {
                this.delegate.schedule(wrappedWork, delay, state);
            };

            this.taskQueue.push(executeTask);
        });
    }

    private processQueue(): void {
        while (this.runningCount < this.maxConcurrency && this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                task();
            }
        }
    }

    /**
     * 设置并发度
     */
    setConcurrency(maxConcurrency: number): void {
        this.maxConcurrency = Math.max(1, maxConcurrency);
        this.processQueue();
    }

    /**
     * 获取当前状态
     */
    getStatus(): { running: number; queued: number; max: number } {
        return {
            running: this.runningCount,
            queued: this.taskQueue.length,
            max: this.maxConcurrency
        };
    }
}

/**
 * 全局爬虫调度器实例
 *
 * 默认并发度为 1（串行执行），可通过环境变量 CRAWLER_CONCURRENCY 配置
 */
export const crawlerScheduler = new ConcurrencyScheduler(
    asyncScheduler,
    Number(process.env.CRAWLER_CONCURRENCY) || 1
);
