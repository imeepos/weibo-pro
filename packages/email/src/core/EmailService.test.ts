import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from './EmailService';
import type { EmailAddress, EmailProvider, Message } from './types';

const ADDRESS: EmailAddress = { address: 'mock-user@example.com' };

function createMockProvider(): EmailProvider & {
  createAddress: ReturnType<typeof vi.fn<() => Promise<EmailAddress>>>;
  getMessages: ReturnType<typeof vi.fn<(address: EmailAddress) => Promise<Message[]>>>;
} {
  return {
    createAddress: vi.fn(async (): Promise<EmailAddress> => ADDRESS),
    getMessages: vi.fn(async (_address: EmailAddress): Promise<Message[]> => []),
  };
}

function makeMessage(partial?: Partial<Message>): Message {
  return {
    id: 'm1',
    from: 'noreply@example.com',
    subject: '验证码',
    content: '123456',
    receivedAt: new Date('2026-08-03T10:00:00.000Z'),
    ...partial,
  };
}

describe('EmailService', () => {
  let provider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    provider = createMockProvider();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getAddress 初始返回 null', () => {
    const service = new EmailService({ provider });
    expect(service.getAddress()).toBeNull();
  });

  it('createAddress 委托 provider 并记录当前地址', async () => {
    const service = new EmailService({ provider });
    provider.createAddress.mockResolvedValue(ADDRESS);

    const result = await service.createAddress();

    expect(provider.createAddress).toHaveBeenCalledTimes(1);
    expect(result).toBe(ADDRESS);
    expect(service.getAddress()).toBe(ADDRESS);
  });

  it('waitForMessage 无当前地址时自动建号并返回第一条消息', async () => {
    const service = new EmailService({ provider });
    const message = makeMessage();
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([message]);

    const result = await service.waitForMessage({ timeout: 5000, pollInterval: 100 });

    expect(provider.createAddress).toHaveBeenCalledTimes(1);
    expect(service.getAddress()).toBe(ADDRESS);
    expect(result).toBe(message);
  });

  it('waitForMessage 使用已有地址，不重复建号', async () => {
    const service = new EmailService({ provider });
    const message = makeMessage();
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([message]);

    await service.createAddress();
    const result = await service.waitForMessage({ timeout: 5000, pollInterval: 100 });

    expect(provider.createAddress).toHaveBeenCalledTimes(1);
    expect(result).toBe(message);
  });

  it('waitForMessage 在超时后无消息时返回 null', async () => {
    vi.useFakeTimers();

    const service = new EmailService({ provider });
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([]);

    const pending = service.waitForMessage({ timeout: 3000, pollInterval: 1000 });
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;

    expect(result).toBeNull();
    expect(provider.getMessages).toHaveBeenCalledTimes(3);
  });

  it('waitForMessage 在后续轮询中等到消息即返回', async () => {
    vi.useFakeTimers();

    const service = new EmailService({ provider });
    const message = makeMessage();
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([message]);

    const pending = service.waitForMessage({ timeout: 10000, pollInterval: 1000 });
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;

    expect(result).toBe(message);
    expect(provider.getMessages).toHaveBeenCalledTimes(3);
  });

  it('waitForMessage 默认使用 config.pollInterval 轮询', async () => {
    vi.useFakeTimers();

    const service = new EmailService({ provider, pollInterval: 2000 });
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([]);

    const pending = service.waitForMessage({ timeout: 5000 });
    await vi.advanceTimersByTimeAsync(7000);
    await pending;

    // t=0 / 2000 / 4000 共 3 次，t=6000 时超时退出
    expect(provider.getMessages).toHaveBeenCalledTimes(3);
  });

  it('waitForMessage 的 pollInterval 选项覆盖 config 默认值', async () => {
    vi.useFakeTimers();

    const service = new EmailService({ provider, pollInterval: 2000 });
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([]);

    const pending = service.waitForMessage({ timeout: 4000, pollInterval: 1000 });
    await vi.advanceTimersByTimeAsync(4000);
    await pending;

    // t=0 / 1000 / 2000 / 3000 共 4 次
    expect(provider.getMessages).toHaveBeenCalledTimes(4);
  });

  it('getLatestMessage 在未建号时抛出错误', async () => {
    const service = new EmailService({ provider });

    await expect(service.getLatestMessage()).rejects.toThrow('请先创建邮箱地址');
  });

  it('getLatestMessage 返回最新一条消息', async () => {
    const service = new EmailService({ provider });
    const message = makeMessage();
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([message]);

    await service.createAddress();
    const result = await service.getLatestMessage();

    expect(result).toBe(message);
  });

  it('getLatestMessage 无消息时返回 null', async () => {
    const service = new EmailService({ provider });
    provider.createAddress.mockResolvedValue(ADDRESS);
    provider.getMessages.mockResolvedValue([]);

    await service.createAddress();
    const result = await service.getLatestMessage();

    expect(result).toBeNull();
  });
});
