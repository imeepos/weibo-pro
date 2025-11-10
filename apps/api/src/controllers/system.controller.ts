import { Controller, Get } from '@nestjs/common';
import { root } from '@sker/core';
import { SystemService, type SystemStatus, type SystemPerformance, type SystemHealth } from '../services/data/system.service';
import * as sdk from '@sker/sdk';

@Controller('api/system')
export class SystemController implements sdk.SystemController {
  private systemService: SystemService;

  constructor() {
    this.systemService = root.get(SystemService);
  }

  @Get('status')
  async getSystemStatus(): Promise<SystemStatus> {
    return this.systemService.getSystemStatus();
  }

  @Get('performance')
  async getPerformance(): Promise<SystemPerformance> {
    return this.systemService.getPerformance();
  }

  @Get('health')
  async getHealth(): Promise<SystemHealth> {
    return this.systemService.getHealth();
  }
}