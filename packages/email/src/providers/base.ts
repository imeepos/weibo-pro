import type { EmailProvider } from '../core/types';

export abstract class BaseProvider implements EmailProvider {
  abstract createAddress(): Promise<import('../core/types').EmailAddress>;
  abstract getMessages(address: import('../core/types').EmailAddress): Promise<import('../core/types').Message[]>;
}
