import type { LlmModelProviderWithRelations } from '@sker/sdk';

/**
 * 按梯队、提供商名称排序并分页绑定关系列表。
 */
export function paginateBindings(
  bindings: LlmModelProviderWithRelations[],
  page: number,
  pageSize: number
): LlmModelProviderWithRelations[] {
  const sorted = [...bindings].sort((a, b) => {
    if (a.tierLevel !== b.tierLevel) {
      return a.tierLevel - b.tierLevel;
    }
    const providerA = a.provider?.name || a.providerId;
    const providerB = b.provider?.name || b.providerId;
    return providerA.localeCompare(providerB);
  });
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return sorted.slice(startIndex, endIndex);
}
