/**
 * 爬虫任务调度系统使用示例
 */

import {
  TaskQueue,
  TaskConsumer,
  TaskScheduler,
  type CrawlerTask,
} from '@sker/crawler-core';

async function main() {
  // 1. 创建任务队列
  const queue = new TaskQueue('weibo_crawl_queue', 10);

  // 2. 推送任务
  const task: CrawlerTask = {
    id: 'task-001',
    type: 'search',
    payload: {
      keyword: 'AI',
      page: 1,
    },
    priority: 5,
  };

  await queue.push(task);

  // 批量推送
  await queue.pushBatch([
    { id: 'task-002', type: 'search', payload: { keyword: 'ML', page: 1 } },
    { id: 'task-003', type: 'search', payload: { keyword: 'DL', page: 1 } },
  ]);

  // 3. 创建消费者并注册处理器
  const consumer = new TaskConsumer(queue, 5);

  consumer.register('search', async (task) => {
    console.log('处理搜索任务:', task.payload);
    // 执行爬虫逻辑
  });

  consumer.register('detail', async (task) => {
    console.log('处理详情任务:', task.payload);
    // 执行爬虫逻辑
  });

  // 启动消费
  consumer.start();

  // 4. 创建定时任务调度器
  const scheduler = new TaskScheduler(queue);

  // 每天凌晨 2 点执行
  scheduler.add({
    name: 'daily-crawl',
    cron: '0 2 * * *',
    taskType: 'search',
    payload: { keyword: 'AI', page: 1 },
    enabled: true,
  });

  // 每小时执行
  scheduler.add({
    name: 'hourly-crawl',
    cron: '0 * * * *',
    taskType: 'search',
    payload: { keyword: 'ML', page: 1 },
  });

  // 控制定时任务
  scheduler.disable('hourly-crawl');
  scheduler.enable('hourly-crawl');
  scheduler.remove('daily-crawl');
}

main().catch(console.error);
