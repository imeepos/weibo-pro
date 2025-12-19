export interface EmailAddress {
  address: string;
  token?: string;
}

export interface Message {
  id: string;
  from: string;
  subject: string;
  content: string;
  receivedAt: Date;
}

export interface EmailServiceConfig {
  provider: EmailProvider;
  pollInterval?: number;
}

export interface WaitForCodeOptions {
  timeout?: number;
  pollInterval?: number;
}

export interface EmailProvider {
  createAddress(): Promise<EmailAddress>;
  getMessages(address: EmailAddress): Promise<Message[]>;
}
