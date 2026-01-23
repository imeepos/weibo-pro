import { Controller, Get, Query } from '@sker/core'
import type { UserStratification } from '../types'

@Controller('user-stratification')
export class UserStratificationController {
  @Get('stratification')
  getStratification(@Query('eventId') eventId: string): Promise<UserStratification> {
    throw new Error('method getStratification not implements')
  }
}
