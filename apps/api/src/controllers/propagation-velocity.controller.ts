import { Controller, root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { logger } from '@sker/core'
import { PropagationVelocityService } from '../services/data/propagation-velocity.service'

@Controller(sdk.PropagationVelocityController)
export class PropagationVelocityController implements sdk.PropagationVelocityController {
  private propagationService: PropagationVelocityService

  constructor() {
    this.propagationService = root.get(PropagationVelocityService)
  }

  async getVelocity(
    eventId: string,
    startTime?: string,
    endTime?: string
  ): Promise<sdk.PropagationVelocityAnalysis> {
    const startDate = startTime ? new Date(startTime) : undefined
    const endDate = endTime ? new Date(endTime) : undefined

    logger.info(`Calculating propagation velocity for event ${eventId}`)

    // 使用 apps/api 本地数据服务，返回 SDK 要求的 PropagationVelocityAnalysis
    return this.propagationService.getVelocityAnalysis(eventId, startDate, endDate)
  }
}
