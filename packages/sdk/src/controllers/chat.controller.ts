import { Controller, Post, Body } from '@sker/core';
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestDto {
  messages: ChatMessage[];
  databaseUrl?: string;
}

@Controller('chat')
export class ChatController {
  @Post('chat')
  chat(@Body() request: ChatRequestDto): Promise<any> {
    throw new Error('method chat not implements');
  }
}
