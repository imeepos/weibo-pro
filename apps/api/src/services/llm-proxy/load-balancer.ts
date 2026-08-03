import type { ProviderCandidate } from './types'

/**
 * 负载均衡选择器：在同一 Tier 内按健康分数加权随机选择
 * @param candidates 已排序的候选列表（按 score DESC）
 * @returns 选中的 provider，如果无候选则返回 undefined
 */
export function selectProviderWithLoadBalancing(candidates: ProviderCandidate[]): ProviderCandidate | undefined {
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]

  const totalScore = candidates.reduce((sum, c) => sum + c.provider_score, 0)

  if (totalScore === 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length)
    return candidates[randomIndex]
  }

  let randomValue = Math.random() * totalScore
  for (const candidate of candidates) {
    randomValue -= candidate.provider_score
    if (randomValue <= 0) {
      return candidate
    }
  }

  return candidates[0]
}
