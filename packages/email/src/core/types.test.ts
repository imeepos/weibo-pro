import { describe, it, expectTypeOf } from 'vitest';
import type {
  EmailAddress,
  EmailProvider,
  EmailServiceConfig,
  Message,
  WaitForCodeOptions,
} from './types';
import { EmailService } from './EmailService';

describe('类型契约：EmailAddress', () => {
  it('address 必填，token 可选', () => {
    expectTypeOf({ address: 'a@b.c' }).toMatchTypeOf<EmailAddress>();
    expectTypeOf({ address: 'a@b.c', token: 'tok' }).toMatchTypeOf<EmailAddress>();
  });
});

describe('类型契约：Message', () => {
  it('包含 id/from/subject/content 字符串与 receivedAt 日期', () => {
    expectTypeOf<Message>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<Message>().toHaveProperty('from').toEqualTypeOf<string>();
    expectTypeOf<Message>().toHaveProperty('subject').toEqualTypeOf<string>();
    expectTypeOf<Message>().toHaveProperty('content').toEqualTypeOf<string>();
    expectTypeOf<Message>().toHaveProperty('receivedAt').toEqualTypeOf<Date>();
  });
});

describe('类型契约：EmailServiceConfig', () => {
  it('provider 必填，pollInterval 可选', () => {
    expectTypeOf<EmailServiceConfig>()
      .toHaveProperty('provider')
      .toEqualTypeOf<EmailProvider>();
    expectTypeOf<EmailServiceConfig>()
      .toHaveProperty('pollInterval')
      .toEqualTypeOf<number | undefined>();
  });
});

describe('类型契约：WaitForCodeOptions', () => {
  it('timeout 与 pollInterval 均为可选数字', () => {
    expectTypeOf<WaitForCodeOptions>()
      .toHaveProperty('timeout')
      .toEqualTypeOf<number | undefined>();
    expectTypeOf<WaitForCodeOptions>()
      .toHaveProperty('pollInterval')
      .toEqualTypeOf<number | undefined>();
  });
});

describe('类型契约：公开导出', () => {
  it('index 导出 EmailService（门面）与核心类型', () => {
    expectTypeOf(EmailService).toBeConstructibleWith({
      provider: {
        createAddress: async () => ({ address: 'a@b.c' }),
        getMessages: async () => [],
      },
    });
  });
});
