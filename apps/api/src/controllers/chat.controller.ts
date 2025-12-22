import { Controller, Post, Body } from '@nestjs/common';
import { root } from '@sker/core';
import { ChatService } from '../services/chat.service';
import type { ChatMessage } from '@sker/chat';

interface ChatRequestDto {
  messages: ChatMessage[];
  databaseUrl?: string;
}

@Controller('api/chat')
export class ChatController {
  private service: ChatService;

  constructor() {
    this.service = root.get(ChatService);
  }

  @Post()
  async chat(@Body() request: ChatRequestDto) {
    return this.service.chat(request);
  }
}
