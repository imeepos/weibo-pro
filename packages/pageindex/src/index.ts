/**
 * @sker/pageindex
 * TypeScript 1:1 复刻 PageIndex 文档索引工具
 */

// 导出类型
export * from './types/index.js';

// 导出工具函数
export * from './utils/index.js';

// 导出PDF处理功能
export { page_index_main } from './pdf/page-index.js';

// 导出Markdown处理功能
export { md_to_tree } from './markdown/page-index-md.js';
