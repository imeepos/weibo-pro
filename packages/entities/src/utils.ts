/**
 * 数据访问工具统一出口
 *
 * 按职责拆分后的模块：
 * - ./utils/database-config      数据库连接配置
 * - ./utils/data-source          DataSource 单例与生命周期
 * - ./utils/data-access          EntityManager / 事务 / QueryRunner 辅助
 * - ./utils/cleanup-idle-connections 空闲连接清理
 *
 * 保留本文件作为 barrel，确保 `@sker/entities` 与既有 `../utils` 导入路径不变。
 */
export * from './utils/database-config';
export * from './utils/data-source';
export * from './utils/data-access';
export * from './utils/cleanup-idle-connections';
