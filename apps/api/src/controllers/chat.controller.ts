import { Controller, Post, Body } from '@sker/core';
import { root } from '@sker/core';
import { ChatService } from '../services/chat.service';
import * as sdk from '@sker/sdk';

interface ChatRequestDto {
  databaseUrl?: string;
}

@Controller(sdk.ChatController)
export class ChatController {
  private service: ChatService;

  constructor() {
    this.service = root.get(ChatService);
  }

  @Post()
  async chat(@Body() request: ChatRequestDto) {
    throw new Error('method chat not implements');
  }
}
