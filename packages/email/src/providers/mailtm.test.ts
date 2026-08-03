import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MailTmProvider } from './mailtm';

const BASE_URL = 'https://api.mail.tm';

function mockResponse(body: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response;
}

const ACTIVE_DOMAIN_RESPONSE = {
  'hydra:member': [{ id: 'dom-1', domain: 'mail.tm', isActive: true }],
};

const ACCOUNT_RESPONSE = { id: 'acc-1', address: 'abcdefghij@mail.tm' };

const TOKEN_RESPONSE = { token: 'tok-abc123' };

const LIST_ITEM = {
  id: 'msg-1',
  from: { address: 'noreply@example.com', name: 'Example' },
  to: [{ address: 'abcdefghij@mail.tm', name: '' }],
  subject: '验证码',
  intro: '您的验证码是',
  createdAt: '2026-08-03T10:00:00.000Z',
  hasAttachments: false,
};

describe('MailTmProvider', () => {
  let provider: MailTmProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new MailTmProvider();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 通过 createAddress 建立 token 状态（顺序：domains → accounts → token） */
  async function setupAuthenticatedProvider() {
    fetchMock
      .mockResolvedValueOnce(mockResponse(ACTIVE_DOMAIN_RESPONSE))
      .mockResolvedValueOnce(mockResponse(ACCOUNT_RESPONSE))
      .mockResolvedValueOnce(mockResponse(TOKEN_RESPONSE));
    await provider.createAddress();
  }

  describe('createAddress', () => {
    it('获取域名 → 建号 → 换取 token，并返回账户地址', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(ACTIVE_DOMAIN_RESPONSE))
        .mockResolvedValueOnce(mockResponse(ACCOUNT_RESPONSE))
        .mockResolvedValueOnce(mockResponse(TOKEN_RESPONSE));

      const address = await provider.createAddress();

      expect(address.address).toBe(ACCOUNT_RESPONSE.address);

      // 1) GET /domains
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/domains`);
      expect(fetchMock.mock.calls[0]?.[1]).toBeUndefined();

      // 2) POST /accounts，body 为 { address, password }
      expect(fetchMock.mock.calls[1]?.[0]).toBe(`${BASE_URL}/accounts`);
      const accountRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
      expect(accountRequest.method).toBe('POST');
      expect(accountRequest.headers).toEqual({ 'Content-Type': 'application/json' });
      const accountBody = JSON.parse(accountRequest.body as string);
      expect(accountBody.address).toMatch(/^[a-z0-9]{10}@mail\.tm$/);
      expect(accountBody.password).toMatch(/^[a-z0-9]{16}$/);

      // 3) POST /token，body 同样为 { address, password }
      expect(fetchMock.mock.calls[2]?.[0]).toBe(`${BASE_URL}/token`);
      const tokenRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
      expect(tokenRequest.method).toBe('POST');
      const tokenBody = JSON.parse(tokenRequest.body as string);
      expect(tokenBody.address).toMatch(/^[a-z0-9]{10}@mail\.tm$/);
      expect(tokenBody.password).toMatch(/^[a-z0-9]{16}$/);
    });

    it('获取域名失败时抛出错误', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({}, 500, 'Server Error'));

      await expect(provider.createAddress()).rejects.toThrow('获取域名列表失败: Server Error');
    });

    it('无可用域名时抛出错误', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          'hydra:member': [{ id: 'dom-1', domain: 'mail.tm', isActive: false }],
        })
      );

      await expect(provider.createAddress()).rejects.toThrow('未找到可用域名');
    });

    it('创建账户失败时抛出错误', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(ACTIVE_DOMAIN_RESPONSE))
        .mockResolvedValueOnce(mockResponse({}, 400, 'Bad Request'));

      await expect(provider.createAddress()).rejects.toThrow('创建账户失败: Bad Request');
    });

    it('获取 token 失败时抛出错误', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(ACTIVE_DOMAIN_RESPONSE))
        .mockResolvedValueOnce(mockResponse(ACCOUNT_RESPONSE))
        .mockResolvedValueOnce(mockResponse({}, 401, 'Unauthorized'));

      await expect(provider.createAddress()).rejects.toThrow('获取token失败: Unauthorized');
    });
  });

  describe('getMessages', () => {
    it('未建号（无 token）时抛出错误', async () => {
      await expect(provider.getMessages({ address: 'a@mail.tm' })).rejects.toThrow(
        '未找到认证token，请先创建邮箱地址'
      );
    });

    it('拉取列表并获取详情，映射为 Message', async () => {
      await setupAuthenticatedProvider();

      const detail = {
        ...LIST_ITEM,
        text: '您的验证码是 123456',
        html: [],
      };
      fetchMock
        .mockResolvedValueOnce(mockResponse({ 'hydra:member': [LIST_ITEM] }))
        .mockResolvedValueOnce(mockResponse(detail));

      const messages = await provider.getMessages({ address: ACCOUNT_RESPONSE.address });

      // 列表请求携带 Bearer token
      expect(fetchMock.mock.calls[3]?.[0]).toBe(`${BASE_URL}/messages`);
      expect(fetchMock.mock.calls[3]?.[1]).toEqual({
        headers: { Authorization: 'Bearer tok-abc123' },
      });

      // 详情请求
      expect(fetchMock.mock.calls[4]?.[0]).toBe(`${BASE_URL}/messages/msg-1`);
      expect(fetchMock.mock.calls[4]?.[1]).toEqual({
        headers: { Authorization: 'Bearer tok-abc123' },
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: 'msg-1',
        from: 'noreply@example.com',
        subject: '验证码',
        content: '您的验证码是 123456',
        receivedAt: new Date('2026-08-03T10:00:00.000Z'),
      });
    });

    it('列表为空时直接返回空数组，不请求详情', async () => {
      await setupAuthenticatedProvider();
      fetchMock.mockResolvedValueOnce(mockResponse({ 'hydra:member': [] }));

      const messages = await provider.getMessages({ address: ACCOUNT_RESPONSE.address });

      expect(messages).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('text 为空时回退到 html 拼接内容', async () => {
      await setupAuthenticatedProvider();

      const detail = {
        ...LIST_ITEM,
        text: '',
        html: ['<p>hi</p>', '<p>there</p>'],
      };
      fetchMock
        .mockResolvedValueOnce(mockResponse({ 'hydra:member': [LIST_ITEM] }))
        .mockResolvedValueOnce(mockResponse(detail));

      const messages = await provider.getMessages({ address: ACCOUNT_RESPONSE.address });

      expect(messages[0]?.content).toBe('<p>hi</p>\n<p>there</p>');
    });

    it('text 与 html 均空时回退到 intro', async () => {
      await setupAuthenticatedProvider();

      const detail = {
        ...LIST_ITEM,
        text: '',
        html: [],
      };
      fetchMock
        .mockResolvedValueOnce(mockResponse({ 'hydra:member': [LIST_ITEM] }))
        .mockResolvedValueOnce(mockResponse(detail));

      const messages = await provider.getMessages({ address: ACCOUNT_RESPONSE.address });

      expect(messages[0]?.content).toBe('您的验证码是');
    });

    it('列表请求失败时抛出错误', async () => {
      await setupAuthenticatedProvider();
      fetchMock.mockResolvedValueOnce(mockResponse({}, 500, 'Server Error'));

      await expect(provider.getMessages({ address: ACCOUNT_RESPONSE.address })).rejects.toThrow(
        '获取邮件列表失败: Server Error'
      );
    });

    it('详情请求失败时抛出错误', async () => {
      await setupAuthenticatedProvider();

      fetchMock
        .mockResolvedValueOnce(mockResponse({ 'hydra:member': [LIST_ITEM] }))
        .mockResolvedValueOnce(mockResponse({}, 500, 'Server Error'));

      await expect(provider.getMessages({ address: ACCOUNT_RESPONSE.address })).rejects.toThrow(
        '获取邮件详情失败: Server Error'
      );
    });
  });
});
