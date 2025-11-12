import { Controller, Get } from '@sker/core'
import type {
  SystemStatus,
  SystemPerformance,
  SystemHealth
} from '../types'

@Controller('api/system')
export class SystemController {

  @Get('status')
  getSystemStatus(): Promise<SystemStatus> {
    throw new Error('method getSystemStatus not implements')
  }

  @Get('performance')
  getPerformance(): Promise<SystemPerformance> {
    throw new Error('method getPerformance not implements')
  }

  @Get('health')
  getHealth(): Promise<SystemHealth> {
    throw new Error('method getHealth not implements')
  }
}