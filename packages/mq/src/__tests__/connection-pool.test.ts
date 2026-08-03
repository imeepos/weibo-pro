import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ConnectionPool } from '../connection-pool.js';
import { ConnectionState } from '../types.js';
import { connect as amqpConnect } from 'amqplib';

// 完全 mock amqplib 连接层，不连接真实 RabbitMQ
vi.mock('amqplib', () => ({
  connect: vi.fn(),
}));

/** 创建 mock channel（支持 on/emit 事件，用于触发 close/error） */
function createMockChannel() {
  const channel: any = new EventEmitter();
  channel.close = vi.fn().mockResolvedValue(undefined);
  channel.removeAllListeners = vi.fn();
  channel.ack = vi.fn();
  channel.nack = vi.fn();
  channel.consume = vi.fn().mockResolvedValue({ consumerTag: 'tag-1' });
  channel.assertQueue = vi
    .fn()
    .mockResolvedValue({ queue: 'q', messageCount: 0, consumerCount: 0 });
  channel.prefetch = vi.fn().mockResolvedValue(undefined);
  channel.cancel = vi.fn().mockResolvedValue(undefined);
  channel.sendToQueue = vi.fn().mockReturnValue(true);
  return channel;
}

/** 创建 mock connection（支持 on/emit 事件） */
function createMockConnection(channel = createMockChannel()) {
  const connection: any = new EventEmitter();
  connection.createConfirmChannel = vi.fn().mockResolvedValue(channel);
  connection.close = vi.fn().mockResolvedValue(undefined);
  connection.removeAllListeners = vi.fn();
  return connection;
}

describe('ConnectionPool', () => {
  beforeEach(() => {
    vi.mocked(amqpConnect).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('连接成功后 state=CONNECTED、isConnected=true、getChannel 返回 channel', async () => {
      const channel = createMockChannel();
      const connection = createMockConnection(channel);
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      expect(pool.getState()).toBe(ConnectionState.CONNECTED);
      expect(pool.isConnected()).toBe(true);
      expect(pool.getChannel()).toBe(channel);
      expect(connection.createConfirmChannel).toHaveBeenCalledTimes(1);
    });

    it('连接时自动附加 heartbeat=30 查询参数', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      expect(amqpConnect).toHaveBeenCalledWith('amqp://localhost?heartbeat=30');
    });

    it('URL 已含 heartbeat 参数时不再重复附加', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost?heartbeat=60' });
      await pool.connect();

      expect(amqpConnect).toHaveBeenCalledWith('amqp://localhost?heartbeat=60');
    });

    it('使用配置中的自定义 heartbeat', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost', heartbeat: 45 });
      await pool.connect();

      expect(amqpConnect).toHaveBeenCalledWith('amqp://localhost?heartbeat=45');
    });

    it('URL 已有其他查询参数时用 & 追加 heartbeat', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost?vhost=/' });
      await pool.connect();

      expect(amqpConnect).toHaveBeenCalledWith(
        'amqp://localhost?vhost=/&heartbeat=30',
      );
    });

    it('重复调用 connect 幂等，不重复建立连接', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();
      await pool.connect();
      await pool.connect();

      expect(amqpConnect).toHaveBeenCalledTimes(1);
      expect(pool.getState()).toBe(ConnectionState.CONNECTED);
    });

    it('连接失败进入 ERROR 状态并调度重连', async () => {
      vi.useFakeTimers();
      vi.mocked(amqpConnect).mockRejectedValue(new Error('connection refused'));

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await expect(pool.connect()).rejects.toThrow('connection refused');

      // 实现中 scheduleReconnect 会立即将 ERROR 覆盖为 RECONNECTING
      expect(pool.getState()).toBe(ConnectionState.RECONNECTING);

      // 第一次重连在 5000ms 后触发
      await vi.advanceTimersByTimeAsync(5000);
      expect(amqpConnect).toHaveBeenCalledTimes(2);

      // 第二次重连失败后延时增长为 10000ms
      await vi.advanceTimersByTimeAsync(10000);
      expect(amqpConnect).toHaveBeenCalledTimes(3);
      expect(pool.getState()).toBe(ConnectionState.RECONNECTING);
    });

    it('重连退避指数增长且上限为 30000ms', async () => {
      vi.useFakeTimers();
      vi.mocked(amqpConnect).mockRejectedValue(new Error('boom'));

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect().catch(() => {});

      // attempts=1 -> 5000, 2 -> 10000, 3 -> 15000, 4 -> 20000, 5 -> 25000, 6 -> 30000(cap), 7 -> 30000(cap)
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(15000);
      await vi.advanceTimersByTimeAsync(20000);
      await vi.advanceTimersByTimeAsync(25000);
      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);

      // 初始 1 次 + 7 次重连
      expect(amqpConnect).toHaveBeenCalledTimes(8);
    });
  });

  describe('连接/通道事件', () => {
    it('connection close 事件触发重连', async () => {
      vi.useFakeTimers();
      const connection = createMockConnection();
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();
      expect(amqpConnect).toHaveBeenCalledTimes(1);

      connection.emit('close');

      expect(pool.getState()).toBe(ConnectionState.RECONNECTING);
      await vi.advanceTimersByTimeAsync(5000);
      expect(amqpConnect).toHaveBeenCalledTimes(2);
      expect(pool.getState()).toBe(ConnectionState.CONNECTED);
    });

    it('connection error 事件触发重连', async () => {
      vi.useFakeTimers();
      const connection = createMockConnection();
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      connection.emit('error', new Error('conn error'));

      expect(pool.getState()).toBe(ConnectionState.RECONNECTING);
      await vi.advanceTimersByTimeAsync(5000);
      expect(amqpConnect).toHaveBeenCalledTimes(2);
    });

    it('channel close 事件清空 channel 并触发重连', async () => {
      vi.useFakeTimers();
      const channel = createMockChannel();
      const connection = createMockConnection(channel);
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      channel.emit('close');

      expect(pool.getState()).toBe(ConnectionState.RECONNECTING);
      expect(() => pool.getChannel()).toThrow(/通道不可用/);

      await vi.advanceTimersByTimeAsync(5000);
      expect(amqpConnect).toHaveBeenCalledTimes(2);
      expect(pool.isConnected()).toBe(true);
    });
  });

  describe('close', () => {
    it('close() 后 state=CLOSED，channel/connection 被关闭', async () => {
      const channel = createMockChannel();
      const connection = createMockConnection(channel);
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      await pool.close();

      expect(pool.getState()).toBe(ConnectionState.CLOSED);
      expect(channel.close).toHaveBeenCalledTimes(1);
      expect(connection.close).toHaveBeenCalledTimes(1);
      expect(() => pool.getChannel()).toThrow(/通道不可用/);
      expect(pool.isConnected()).toBe(false);
    });

    it('close() 清除待执行的重连定时器', async () => {
      vi.useFakeTimers();
      vi.mocked(amqpConnect).mockRejectedValue(new Error('fail'));

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect().catch(() => {});

      await pool.close();
      await vi.advanceTimersByTimeAsync(30000);

      expect(pool.getState()).toBe(ConnectionState.CLOSED);
      // 重连定时器已被清除，不会再次触发 connect
      expect(amqpConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitForConnection', () => {
    it('连接就绪时立即返回', async () => {
      vi.mocked(amqpConnect).mockResolvedValue(createMockConnection());

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      await expect(pool.waitForConnection(1000)).resolves.toBeUndefined();
    });

    it('连接失败时向上抛出连接错误', async () => {
      vi.useFakeTimers();
      vi.mocked(amqpConnect).mockRejectedValue(new Error('refused'));

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await expect(pool.waitForConnection(100)).rejects.toThrow('refused');
    });

    it('等待超时抛出超时错误', async () => {
      vi.useFakeTimers();
      const connection = createMockConnection();
      vi.mocked(amqpConnect).mockResolvedValue(connection);

      const pool = new ConnectionPool({ url: 'amqp://localhost' });
      await pool.connect();

      // 连接关闭后进入 RECONNECTING（无 connectionPromise、非 DISCONNECTED/ERROR），
      // waitForConnection 会在 sleep(100) 循环中走到超时分支
      connection.emit('close');

      const p = pool.waitForConnection(1000);
      // 先挂上 rejection handler，避免推进定时器时产生 unhandled rejection
      const assertion = expect(p).rejects.toThrow(/等待连接超时: 1000ms/);
      await vi.advanceTimersByTimeAsync(1100);
      await assertion;
    });
  });
});
