import { Controller, Get } from '@nestjs/common';
import { root } from '@sker/core';
import { HelloService } from './services/hello.service';
import { } from '@sker/agent'
@Controller()
export class HelloController {
  private helloService: HelloService;

  constructor() {
    this.helloService = root.get(HelloService);
  }

  @Get()
  getHello() {
    root.get(ResearchAgent)
    return this.helloService.getHello();
  }
}
