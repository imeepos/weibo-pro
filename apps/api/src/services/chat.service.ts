import { Injectable } from '@sker/core';

interface ChatRequest {
  databaseUrl?: string;
}

@Injectable()
export class ChatService {

  constructor() {
  }

  async chat(request: ChatRequest): Promise<string> {
    throw new Error('method chat not implements');
  }
}
