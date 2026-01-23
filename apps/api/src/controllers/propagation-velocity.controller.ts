import { Controller, Inject } from '@sker/core'
import * as sdk from '@sker/sdk'
import { PropagationVelocityService } from '@sker/entities'
import { logger } from '@sker/core'

@Controller(sdk.PropagationVelocityController)
export class PropagationVelocityController implements sdk.PropagationVelocityController {
  constructor(
    @Inject(PropagationVelocityService) private propagationService: PropagationVelocityService
  ) {}

  async getVelocity(
    eventId: string,
    startTime?: string,
    endTime?: string
  ): Promise<sdk.PropagationVelocity | null> {
    try {
      const startDate = startTime ? new Date(startTime) : undefined
      const endDate = endTime ? new Date(endTime) : undefined

      logger.info(`Calculating propagation velocity for event ${eventId}`)

      const result = await this.propagationService.getPropagationVelocity(
        eventId,
        startDate,
        endDate
      )

      if (!result) {
        return null
      }

      // 转换为 SDK 格式
      return {
        ...result,
        eventId,
        calculatedAt: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('Failed to calculate propagation velocity:', error)
      throw error
    }
  }
}
