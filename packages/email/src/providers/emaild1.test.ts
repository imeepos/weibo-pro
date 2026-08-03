import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailD1Provider } from './emaild1';

function mockResponse(body: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response;
}

describe('EmailD1Provider', () => {
  let provider: EmailD1Provider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new EmailD1Provider();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createAddress', () => {
    it('生成本地生成地址，不发起网络请求', async () => {
      const address = await provider.createAddress();

      expect(address.address).toMatch(/^[a-z0-9]{10}@email\.bowong\.cc$/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('连续调用生成不同地址', async () => {
      const first = await provider.createAddress();
      const second = await provider.createAddress();

      expect(first.address).not.toBe(second.address);
    });
  });

  describe('getMessages', () => {
    it('构造正确 URL 并解析响应为 Message', async () => {
      const emailData = {
        id: 42,
        address: 'abcdefghij@email.bowong.cc',
        from_address: 'noreply@example.com',
        subject: '验证码',
        content: '您的验证码是 123456',
        message_id: null,
        received_at: '2026-08-03T10:00:00.000Z',
      };
      fetchMock.mockResolvedValue(mockResponse(emailData));

      const messages = await provider.getMessages({ address: 'abcdefghij@email.bowong.cc' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://email.bowong.cc/api/latest?address=abcdefghij%40email.bowong.cc'
      );
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: '42',
        from: 'noreply@example.com',
        subject: '验证码',
        content: '您的验证码是 123456',
        receivedAt: new Date('2026-08-03T10:00:00.000Z'),
      });
    });

    it('subject 为 null 时回退为空字符串', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          id: 1,
          address: 'a@email.bowong.cc',
          from_address: 'x@y.com',
          subject: null,
          content: 'c',
          message_id: null,
          received_at: '2026-01-01T00:00:00.000Z',
        })
      );

      const messages = await provider.getMessages({ address: 'a@email.bowong.cc' });

      expect(messages[0]?.subject).toBe('');
    });

    it('响应 404 时返回空数组', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, 404, 'Not Found'));

      const messages = await provider.getMessages({ address: 'a@email.bowong.cc' });

      expect(messages).toEqual([]);
    });

    it('非 2xx 响应时抛出错误', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, 500, 'Internal Server Error'));

      await expect(provider.getMessages({ address: 'a@email.bowong.cc' })).rejects.toThrow(
        '获取邮件失败: Internal Server Error'
      );
    });

    it('JSON 解析失败时返回空数组（表示暂无邮件）', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      } as unknown as Response);

      const messages = await provider.getMessages({ address: 'a@email.bowong.cc' });

      expect(messages).toEqual([]);
    });

    it('网络异常时向上抛出 fetch 错误', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(provider.getMessages({ address: 'a@email.bowong.cc' })).rejects.toThrow(
        'Failed to fetch'
      );
    });
  });
});
