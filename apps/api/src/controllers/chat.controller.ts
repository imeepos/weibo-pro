import { Controller, Post, Body } from '@sker/core'
import { root } from '@sker/core'
import { ChatService } from '../services/chat.service'
import type { ChatMessage } from '@sker/workflow-run'
import * as sdk from '@sker/sdk'

interface ChatRequestDto {
  messages: ChatMessage[]
  databaseUrl?: string
}

@Controller(sdk.ChatController)
export class ChatController implements sdk.ChatController {
  private service: ChatService

  constructor() {
    this.service = root.get(ChatService)
  }

  @Post()
  async chat(@Body() request: ChatRequestDto) {
    return this.service.chat(request)
  }
}
