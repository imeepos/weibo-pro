import { Controller, Get } from '@nestjs/common';
import { root } from '@sker/core';
import { HelloService } from './services/hello.service';
import { ResearchAgent } from '@sker/agent'
@Controller()
export class HelloController {
  private helloService: HelloService;

  constructor() {
    this.helloService = root.get(HelloService);
  }

  @Get('agent')
  async agent(){
    const agent = root.get(ResearchAgent)
    return agent.research({
      id: `${new Date().getTime()}`,
      query: ``
    })
  }

  @Get()
  getHello() {
    return this.helloService.getHello();
  }
}
