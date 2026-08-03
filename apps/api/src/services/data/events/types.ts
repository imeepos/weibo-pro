// 事件相关类型的统一出口。
// 按领域拆分到独立模块后在此聚合，保持所有既有 `from './types'` 导入不变。
export * from './types.core';
export * from './types.sentiment';
export * from './types.engagement';
export * from './types.opinion';
export * from './types.risk';

// 从 SDK 重新导出 UserRelationNetwork
export type { UserRelationNetwork } from '@sker/sdk'

// 从 SDK 重新导出 KOLAnalysisResult
export type { KOLAnalysisResult, KOLData } from '@sker/sdk'
