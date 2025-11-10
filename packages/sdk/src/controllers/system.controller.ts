import { Controller, Get } from '@sker/core'

@Controller('api/system')
export class SystemController {

  @Get('status')
  getSystemStatus(): Promise<any> {
    throw new Error('method getSystemStatus not implements')
  }

  @Get('performance')
  getPerformance(): Promise<any> {
    throw new Error('method getPerformance not implements')
  }

  @Get('health')
  getHealth(): Promise<any> {
    throw new Error('method getHealth not implements')
  }
}