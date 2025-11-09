import type { MqQueueConfig } from '@sker/mq';

export const queueConfigs: MqQueueConfig[] = [
  {
    queue: 'weibo_search_queue',
    dlq: 'weibo_search_queue.dlq',
    queueOptions: {
      durable: true,
      messageTtl: 1800000,
      deadLetterExchange: '',
      deadLetterRoutingKey: 'weibo_search_queue.dlq',
    },
  },
  {
    queue: 'weibo_detail_queue',
    dlq: 'weibo_detail_queue.dlq',
    queueOptions: {
      durable: true,
      messageTtl: 900000,
    },
  },
];
