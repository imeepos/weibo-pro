/**
 * MCP 协议消息类型定义
 * 基于 @modelcontextprotocol/sdk 的完整类型系统
 *
 * 本文件为 barrel 入口：按领域拆分的具体定义见 ./message-types/ 子目录。
 * 公开 API 与原单文件完全兼容，所有导出名保持不变。
 */

// JSON-RPC 基础类型
export * from './message-types/base';

// 客户端 → 服务器：请求方法与参数
export * from './message-types/client-to-server';

// 服务器 → 客户端：请求方法与参数
export * from './message-types/server-to-client';

// 通知
export * from './message-types/notifications';

// 能力定义
export * from './message-types/capabilities';

// 资源类型（工具 / 资源 / 提示词）
export * from './message-types/resources';

// 工具类型与消息守卫
export * from './message-types/guards';
