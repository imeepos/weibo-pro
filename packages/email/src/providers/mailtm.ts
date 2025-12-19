import { BaseProvider } from './base';
import type { EmailAddress, Message } from '../core/types';

interface MailTmDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

interface MailTmAccount {
  id: string;
  address: string;
}

interface MailTmToken {
  token: string;
}

interface MailTmMessage {
  id: string;
  from: { address: string; name: string };
  to: Array<{ address: string; name: string }>;
  subject: string;
  intro: string;
  createdAt: string;
  hasAttachments: boolean;
}

interface MailTmMessageDetail extends MailTmMessage {
  text: string;
  html: string[];
}

export class MailTmProvider extends BaseProvider {
  private readonly baseUrl = 'https://api.mail.tm';
  private token: string | null = null;
  private account: MailTmAccount | null = null;

  async createAddress(): Promise<EmailAddress> {
    const domain = await this.getAvailableDomain();
    const address = `${this.generateRandomString(10)}@${domain}`;
    const password = this.generateRandomString(16);

    const accountResponse = await fetch(`${this.baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address, password })
    });

    if (!accountResponse.ok) {
      throw new Error(`创建账户失败: ${accountResponse.statusText}`);
    }

    this.account = await accountResponse.json();

    const tokenResponse = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address, password })
    });

    if (!tokenResponse.ok) {
      throw new Error(`获取token失败: ${tokenResponse.statusText}`);
    }

    const tokenData: MailTmToken = await tokenResponse.json();
    this.token = tokenData.token;

    if (!this.account) {
      throw new Error('账户创建失败');
    }

    return {
      address: this.account.address
    };
  }

  async getMessages(address: EmailAddress): Promise<Message[]> {
    if (!this.token) {
      throw new Error('未找到认证token，请先创建邮箱地址');
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`获取邮件列表失败: ${response.statusText}`);
    }

    const data = await response.json();
    const messages: MailTmMessage[] = data['hydra:member'] || [];

    if (messages.length === 0) {
      return [];
    }

    const detailedMessages = await Promise.all(
      messages.map(msg => this.getMessageDetail(msg.id))
    );

    return detailedMessages.map(msg => ({
      id: msg.id,
      from: msg.from.address,
      subject: msg.subject,
      content: msg.text || msg.html.join('\n') || msg.intro,
      receivedAt: new Date(msg.createdAt)
    }));
  }

  private async getMessageDetail(id: string): Promise<MailTmMessageDetail> {
    if (!this.token) {
      throw new Error('未找到认证token');
    }

    const response = await fetch(`${this.baseUrl}/messages/${id}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`获取邮件详情失败: ${response.statusText}`);
    }

    return response.json();
  }

  private async getAvailableDomain(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/domains`);

    if (!response.ok) {
      throw new Error(`获取域名列表失败: ${response.statusText}`);
    }

    const data = await response.json();
    const domains: MailTmDomain[] = data['hydra:member'] || [];

    const activeDomain = domains.find(d => d.isActive);

    if (!activeDomain) {
      throw new Error('未找到可用域名');
    }

    return activeDomain.domain;
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
