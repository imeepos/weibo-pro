import type { EmailServiceConfig, EmailAddress, WaitForCodeOptions, Message } from './types';
import { sleep } from './utils';

export class EmailService {
  private readonly provider;
  private readonly defaultPollInterval;
  private currentAddress: EmailAddress | null = null;

  constructor(config: EmailServiceConfig) {
    this.provider = config.provider;
    this.defaultPollInterval = config.pollInterval || 3000;
  }

  async createAddress(): Promise<EmailAddress> {
    this.currentAddress = await this.provider.createAddress();
    return this.currentAddress;
  }

  getAddress(): EmailAddress | null {
    return this.currentAddress;
  }

  async waitForMessage(options: WaitForCodeOptions = {}): Promise<Message | null> {
    const timeout = options.timeout || 60000;
    const pollInterval = options.pollInterval || this.defaultPollInterval;
    const startTime = Date.now();

    if (!this.currentAddress) {
      this.currentAddress = await this.createAddress();
    }

    while (Date.now() - startTime < timeout) {
      const messages = await this.provider.getMessages(this.currentAddress);

      if (messages.length > 0) {
        return messages[0] ?? null;
      }

      await sleep(pollInterval);
    }

    return null;
  }


  async getLatestMessage(): Promise<Message | null> {
    if (!this.currentAddress) {
      throw new Error('请先创建邮箱地址');
    }

    const messages = await this.provider.getMessages(this.currentAddress);

    return messages.length > 0 ? messages[0] ?? null : null;
  }
}
