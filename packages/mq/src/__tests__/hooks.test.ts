import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

// 完全 mock amqplib 连接层，不连接真实 RabbitMQ
vi.mock('amqplib', () => ({
  connect: vi.fn(),
}));

// 通过 vi.resetModules() 让每个用例拿到全新的 hooks 模块
// （全局 ConnectionPool 单例与 queueManagerCache 均为模块级状态）。
function createMockChannel() {
  const channel: any = new EventEmitter();
  channel.close = vi.fn().mockResolvedValue(undefined);
  channel.removeAllListeners = vi.fn();
  channel.ack = vi.fn();
  channel.nack = vi.fn();
  channel.consume = vi.fn().mockResolvedValue({ consumerTag: 'tag-1' });
  channel.assertQueue = vi.fn().mockResolvedValue({});
  channel.prefetch = vi.fn().mockResolvedValue(undefined);
  channel.cancel = vi.fn().mockResolvedValue(undefined);
  channel.sendToQueue = vi.fn().mockReturnValue(true);
  return channel;
}

function createMockConnection(channel = createMockChannel()) {
  const connection: any = new EventEmitter();
  connection.createConfirmChannel = vi.fn().mockResolvedValue(channel);
  connection.close = vi.fn().mockResolvedValue(undefined);
  connection.removeAllListeners = vi.fn();
  return connection;
}

describe('useQueue hooks', () => {
  let useQueue: (name: string, options?: any) => any;
  let amqpConnect: any;
  let mockChannel: any;

  beforeEach(async () => {
    vi.resetModules();
    process.env.RABBITMQ_URL = 'amqp://localhost';

    const amqp = await import('amqplib');
    amqpConnect = amqp.connect;
    amqpConnect.mockReset();

    mockChannel = createMockChannel();
    amqpConnect.mockResolvedValue(createMockConnection(mockChannel));

    const hooks = await import('../hooks.js');
    useQueue = hooks.useQueue;
  });

  afterEach(() => {
    delete process.env.RABBITMQ_URL;
  });

  it('未配置 RABBITMQ_URL 时抛出错误', () => {
    delete process.env.RABBITMQ_URL;
    expect(() => useQueue('jobs')).toThrow(/RABBITMQ_URL 未配置/);
  });

  it('useQueue 返回 QueueManager（producer/consumer$/queueName/dlqName）', () => {
    const qm = useQueue('test_queue');

    expect(qm.queueName).toBe('test_queue');
    expect(qm.dlqName).toBe('test_queue.dlq');
    expect(typeof qm.producer.next).toBe('function');
    expect(typeof qm.producer.nextBatch).toBe('function');
    expect(typeof qm.consumer$.subscribe).toBe('function');
  });

  describe('sanitizeQueueName（通过 useQueue 间接验证）', () => {
    it('首尾与内部空白转为连字符并小写', () => {
      const qm = useQueue('  Hello   World  ');
      expect(qm.queueName).toBe('hello-world');
    });

    it('非法字符被过滤', () => {
      const qm = useQueue('a!b@c#d');
      expect(qm.queueName).toBe('abcd');
    });

    it('统一转为小写', () => {
      const qm = useQueue('MyQueue');
      expect(qm.queueName).toBe('myqueue');
    });

    it('保留点、连字符、下划线', () => {
      const qm = useQueue('weibo.crawl-queue_v2');
      expect(qm.queueName).toBe('weibo.crawl-queue_v2');
    });

    it('空名与纯空白名抛错', () => {
      expect(() => useQueue('')).toThrow(/队列名称不能为空/);
      expect(() => useQueue('   ')).toThrow(/无效的队列名称/);
    });
  });

  describe('实例缓存', () => {
    it('相同队列名与选项返回同一个实例', () => {
      const a = useQueue('same_queue');
      const b = useQueue('same_queue');
      expect(a).toBe(b);
    });

    it('队列名大小写不同但清洗后相同则共享缓存', () => {
      const a = useQueue('Same_Queue');
      const b = useQueue('same_queue');
      expect(a).toBe(b);
    });

    it('选项不同不共享缓存', () => {
      const a = useQueue('q1', { manualAck: true });
      const b = useQueue('q1', { manualAck: false });
      expect(a).not.toBe(b);
    });
  });

  describe('注册配置', () => {
    it('注册的队列配置生效（queue/dlq）', async () => {
      const tokens = await import('../tokens.js');
      tokens.registerMqQueueConfig({
        queue: 'custom',
        dlq: 'custom.dlq',
        queueOptions: { durable: true, messageTtl: 5000 },
      });

      const qm = useQueue('custom');

      expect(qm.queueName).toBe('custom');
      expect(qm.dlqName).toBe('custom.dlq');
    });
  });

  describe('与真实 ConnectionPool 协作', () => {
    it('producer 可发布消息到 mock channel', async () => {
      const qm = useQueue('publish_test');

      qm.producer.next({ hello: 'world' });

      await vi.waitFor(() => {
        expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
      });

      const buffer = mockChannel.sendToQueue.mock.calls[0][1] as Buffer;
      expect(buffer.toString()).toBe(JSON.stringify({ hello: 'world' }));
      expect(mockChannel.assertQueue).toHaveBeenCalled();
    });

    it('consumer$ 订阅后开始消费（consume 被注册）', async () => {
      const qm = useQueue('consume_test');

      qm.consumer$.subscribe();

      await vi.waitFor(() => {
        expect(mockChannel.consume).toHaveBeenCalled();
      });
      expect(mockChannel.assertQueue).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalled();
    });
  });
});
