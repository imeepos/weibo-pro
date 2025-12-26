import { Controller, Get } from '@sker/core';
import { root } from '@sker/core';
import { SystemService, type SystemStatus, type SystemPerformance, type SystemHealth } from '../services/data/system.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.SystemController)
export class SystemController implements sdk.SystemController {
  private systemService: SystemService;

  constructor() {
    this.systemService = root.get(SystemService);
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return this.systemService.getSystemStatus();
  }

  async getPerformance(): Promise<SystemPerformance> {
    return this.systemService.getPerformance();
  }

  async getHealth(): Promise<SystemHealth> {
    return this.systemService.getHealth();
  }
}