import { BaseProvider } from './base';
import type { EmailAddress, Message } from '../core/types';

interface EmailD1Data {
  id: number;
  address: string;
  from_address: string;
  subject: string | null;
  content: string;
  message_id: string | null;
  received_at: string;
}

export class EmailD1Provider extends BaseProvider {
  private readonly apiUrl: string = `https://email.bowong.cc`;
  private readonly domain: string = `email.bowong.cc`;

  constructor() {
    super();
  }

  async createAddress(): Promise<EmailAddress> {
    const username = this.generateRandomString(10);
    const address = `${username}@${this.domain}`;

    return {
      address
    };
  }

  async getMessages(address: EmailAddress): Promise<Message[]> {
    const url = `${this.apiUrl}/api/latest?address=${encodeURIComponent(address.address)}`;

    const response = await fetch(url);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`获取邮件失败: ${response.statusText}`);
    }

    try {
      const email: EmailD1Data = await response.json();

      return [{
        id: email.id.toString(),
        from: email.from_address,
        subject: email.subject || '',
        content: email.content,
        receivedAt: new Date(email.received_at)
      }];
    } catch (error) {
      // JSON 解析失败说明暂无邮件，返回空数组
      return [];
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
