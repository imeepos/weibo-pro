/**
 * PDF文档索引生成主入口
 *
 * 整合所有PDF处理模块,提供完整的文档索引生成功能
 */

import { getPageTokens } from './page-loader.js';
import { findTocPages } from './toc-detector.js';
import { tocTransformer } from './toc-extractor.js';
import { verifyToc, fixIncorrectToc } from './toc-validator.js';
import { metaProcessor } from './tree-parser.js';
import type { PageIndexResult, TOCItem, PageToken } from '../types/result.types.js';
import type { PDFConfig } from '../types/config.types.js';
import type { Node } from '../types/node.types.js';

/**
 * PDF文档索引生成主函数
 *
 * 根据PDF文档的TOC情况自动选择处理模式:
 * 1. 有TOC+有页码: 提取TOC → 验证 → 修正 → 解析树
 * 2. 有TOC+无页码: 提取TOC → 解析树
 * 3. 无TOC: 直接将整个文档作为单个节点处理
 *
 * @param pdfPath - PDF文件路径
 * @param config - PDF配置
 * @returns 文档索引结果
 *
 * @example
 * ```ts
 * const result = await page_index_main('document.pdf', config);
 * // => { doc_name: 'document', structure: [...] }
 * ```
 */
export async function page_index_main(
  pdfPath: string,
  config: PDFConfig
): Promise<PageIndexResult> {
  // 1. 加载PDF页面
  const pageList = await getPageTokens(pdfPath, config.model);

  // 2. 检测TOC
  const tocPageNumbers = await findTocPages(pageList, config.tocCheckPageNum, config.model);

  // 提取文档名称
  const doc_name = extractDocName(pdfPath);

  let structure: Node[] = [];

  // 3. 根据TOC情况选择处理模式
  if (tocPageNumbers.length > 0) {
    // 有TOC - 提取TOC内容
    const tocPages = tocPageNumbers
      .map(n => pageList[n - 1])
      .filter((p): p is PageToken => p !== undefined);

    if (tocPages.length === 0) {
      throw new Error('Failed to extract TOC pages');
    }

    const tocContent = tocPages.map(p => p.text).join('\n');

    const tocStructure = await tocTransformer(tocContent, config.model);

    // TODO: 实现页码判断逻辑
    const hasPageNumbers = true; // 简化实现，假设有页码

    if (hasPageNumbers) {
      // 模式1: 有TOC+有页码
      // 3.1 验证TOC准确率
      await verifyToc(tocStructure, pageList, config.model);

      // 3.2 修正错误的TOC项
      const fixedTOC = await fixIncorrectToc(tocStructure, pageList, config.model);

      // 转换TOC为Node结构（使用修正后的TOC）
      const nodes = tocToNodes(fixedTOC);

      // 解析树结构
      structure = await metaProcessor(nodes, pageList, config);
    }
  } else {
    // 模式3: 无TOC
    // 将整个文档作为单个节点处理
    structure = await metaProcessor(
      [
        {
          title: doc_name,
          start_index: 1,
          end_index: pageList.length,
        },
      ],
      pageList,
      config
    );
  }

  return {
    doc_name,
    structure,
  };
}

/**
 * 从PDF路径提取文档名称
 */
function extractDocName(pdfPath: string): string {
  const basename = pdfPath.split('/').pop() || pdfPath.split('\\').pop() || pdfPath;
  return basename.replace(/\.pdf$/i, '');
}

/**
 * 将TOC结构转换为Node结构
 */
function tocToNodes(tocStructure: TOCItem[]): Node[] {
  return tocStructure.map((item): Node => ({
    title: item.title,
    structure: item.structure || undefined,
    physical_index: item.physical_index !== undefined ? Number(item.physical_index) : undefined,
    start_index: typeof item.physical_index === 'number' ? item.physical_index : undefined,
    end_index: undefined, // 将由treeProcessor计算
    appear_start: item.appear_start,
  }));
}
