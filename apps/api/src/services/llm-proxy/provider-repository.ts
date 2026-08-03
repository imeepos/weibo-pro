import { logger } from '@sker/core';
import { useEntityManager, LlmModelProvider, LlmProvider } from '@sker/entities';
import { selectProviderWithLoadBalancing } from './load-balancer';
import type { RateLimiter } from './rate-limiter';
import type { ProviderInfo, ProviderCandidate } from './types';

/**
 * Provider 数据访问层：查找可用 provider、更新健康分、禁用 thinking 支持
 */
export class ProviderRepository {
  constructor(private rateLimiter: RateLimiter) {}

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set(), requiresThinking: boolean = false): Promise<ProviderInfo | null> {
    if (!requestedModel) return null

    return useEntityManager(async m => {
      // 通过 llm_models.name 匹配请求的模型，mp.modelName 是调用 provider 时使用的模型名
      const modelMatchCondition = 'model.name = :requestedModel'

      // 收集被限流的 provider ID
      const rateLimitedIds = this.rateLimiter.getActiveProviderIds()

      const buildBaseConditions = (qb: { andWhere: (condition: string, params?: Record<string, unknown>) => { andWhere: (condition: string, params?: Record<string, unknown>) => any; orderBy: (column: string, direction: string) => any; getRawMany: () => Promise<{ tier: number }[]> } }) => {
        qb.andWhere('provider.score > 0')
          .andWhere('mp.enabled = true')
        if (requiresThinking) {
          qb.andWhere('mp.supportsThinking = :supportsThinking', { supportsThinking: true })
        }
        const allExcludeIds = [...excludeIds, ...rateLimitedIds]
        if (allExcludeIds.length > 0) {
          qb.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: allExcludeIds })
        }
      }

      const tierQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
        .innerJoin('mp.provider', 'provider')
        .innerJoin('mp.model', 'model')
        .select('DISTINCT mp.tierLevel', 'tier')
        .where(modelMatchCondition, { requestedModel })
      buildBaseConditions(tierQuery)

      const availableTiers = await tierQuery.orderBy('tier', 'ASC').getRawMany()

      if (availableTiers.length === 0) {
        logger.warn(`未找到可用 provider`, { model: requestedModel, protocol })
        return null
      }

      for (const { tier } of availableTiers) {
        const providerQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
          .innerJoin('mp.provider', 'provider')
          .innerJoin('mp.model', 'model')
          .select('provider.id', 'provider_id')
          .addSelect('provider.base_url', 'provider_base_url')
          .addSelect('provider.api_key', 'provider_api_key')
          .addSelect('provider.protocol', 'provider_protocol')
          .addSelect('provider.score', 'provider_score')
          .addSelect('mp.model_name', 'mp_model_name')
          .addSelect('model.name', 'standard_model_name')
          .where(modelMatchCondition, { requestedModel })
          .andWhere('mp.tierLevel = :tier', { tier })
        buildBaseConditions(providerQuery)

        const allCandidates = await providerQuery
          .addSelect(`CASE WHEN provider.protocol = :protocol THEN 0 ELSE 1 END`, 'protocol_priority')
          .setParameter('protocol', protocol)
          .orderBy('provider.score', 'DESC')
          .getRawMany()

        const result = selectProviderWithLoadBalancing(allCandidates as ProviderCandidate[])

        if (result?.provider_id) {
          const modelName = result.mp_model_name
          if (!modelName) {
            logger.warn(`provider 的 modelName 为空，跳过`, { providerId: result.provider_id })
            continue
          }

          if (!result.standard_model_name) {
            logger.warn(`modelProvider 未关联标准模型`, { providerId: result.provider_id })
          }

          return {
            providerId: result.provider_id,
            baseUrl: result.provider_base_url,
            apiKey: result.provider_api_key,
            modelName,
            standardModelName: result.standard_model_name,
            providerProtocol: result.provider_protocol
          }
        }
      }

      return null
    })
  }

  async updateScore(providerId: string, delta: number): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: () => `GREATEST(0, score + ${delta})` })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async setScoreToZero(providerId: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: 0 })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async disableThinkingSupport(providerId: string, modelName: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmModelProvider)
        .set({ supportsThinking: false })
        .where('providerId = :providerId', { providerId })
        .andWhere('modelName = :modelName', { modelName })
        .execute()
    })
    logger.warn(`已自动禁用 thinking 支持`, { providerId, modelName })
  }
}
