/**
 * 微博帖子 JSONB 列的共享类型定义
 *
 * 这些接口描述微博 API 返回的嵌套数据结构，
 * 被 WeiboPostEntity 中对应的 jsonb 列作为类型标注使用。
 *
 * 按领域细分：
 * - ./types/basic    无依赖的基础类型（Actionlog、IconItem、StatusTotalCounter 等）
 * - ./types/display  展示层结构（ScreenNameSuffixNew、CommonStructItem、PicInfo 等）
 * - ./types/media    媒体 / 视频结构（PlayInfo、MediaInfo、PageInfo 等）
 *
 * 本文件作为 barrel 统一导出，保持既有 `./weibo-post/types` 导入路径不变。
 */

export * from './types/basic';
export * from './types/display';
export * from './types/media';
