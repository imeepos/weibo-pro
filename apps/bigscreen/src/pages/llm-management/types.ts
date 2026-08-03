export type DeleteTarget = { type: 'provider' | 'model' | 'binding'; id: string; name: string } | null;

export type DeleteType = NonNullable<DeleteTarget>['type'];

export const DELETE_TYPE_LABELS: Record<DeleteType, string> = {
  provider: '提供商',
  model: '模型',
  binding: '绑定',
};
