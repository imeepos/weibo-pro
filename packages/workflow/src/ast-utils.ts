// AST 工具函数统一出口（barrel）
//
// 按职责拆分为多个单文件模块：
// - error.ts      错误处理工具函数
// - nodes.ts      节点管理工具函数
// - edges.ts      边管理工具函数
// - graph.ts      图操作工具函数
// - endpoints.ts  开始/结束节点工具函数
// - defaults.ts   节点默认值重置工具函数
//
// 所有导出保持与重构前完全一致，公共 API 不变。
export * from './ast-utils/error';
export * from './ast-utils/nodes';
export * from './ast-utils/edges';
export * from './ast-utils/graph';
export * from './ast-utils/endpoints';
export * from './ast-utils/defaults';
