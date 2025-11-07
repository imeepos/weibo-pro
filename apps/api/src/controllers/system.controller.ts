import { Controller, Get } from '@nestjs/common';
import { root } from '@sker/core';
import { SystemService } from '../services/data/system.service';

@Controller('api/system')
export class SystemController {
  private systemService: SystemService;

  constructor() {
    this.systemService = root.get(SystemService);
  }

  @Get('status')
  async getSystemStatus() {
    return this.systemService.getSystemStatus();
  }

  @Get('performance')
  async getPerformance() {
    return this.systemService.getPerformance();
  }

  @Get('health')
  async getHealth() {
    return this.systemService.getHealth();
  }
}