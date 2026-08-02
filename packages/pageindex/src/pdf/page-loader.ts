/**
 * PDF加载和页面解析模块
 *
 * 提供PDF文档的加载、页面文本提取和token计数功能
 */

import { getDocument } from 'pdfjs-dist';
import { countTokens } from '../utils/token.js';
import type { PageToken } from '../types/result.types.js';

/**
 * PDF文本项接口
 */
interface TextItem {
  str: string;
}

/**
 * PDF文本内容接口
 */
interface TextContent {
  items: TextItem[];
}

/**
 * 获取PDF每页的文本和token数
 *
 * 解析整个PDF文档，提取每一页的文本内容并计算token数量
 *
 * @param pdfPath - PDF文件路径
 * @param model - 模型名称，用于token计数，默认 'gpt-4o-2024-11-20'
 * @returns 每页的文本和token数数组
 * @throws 如果PDF文件不存在或解析失败
 *
 * @example
 * ```ts
 * const pages = await getPageTokens('document.pdf', 'gpt-4o');
 * // returns: [
 * //   { text: 'Page 1 content', tokenCount: 100 },
 * //   { text: 'Page 2 content', tokenCount: 150 }
 * // ]
 * ```
 */
export async function getPageTokens(
  pdfPath: string,
  model: string = 'gpt-4o-2024-11-20'
): Promise<PageToken[]> {
  const loadingTask = getDocument({ url: pdfPath });
  const pdf = await loadingTask.promise;

  const pages: PageToken[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent() as TextContent;
    const text = textContent.items.map((item) => item.str).join(' ');
    const tokenCount = countTokens(text, model);

    pages.push({ text, tokenCount });
  }

  return pages;
}

/**
 * 提取指定页的文本
 *
 * 从PDF文档中提取指定页码的文本内容
 *
 * @param pdfPath - PDF文件路径
 * @param pageNum - 页码（从1开始）
 * @returns 页面文本内容
 * @throws 如果页码超出范围或PDF文件不存在
 *
 * @example
 * ```ts
 * const text = await extractPageText('document.pdf', 5);
 * // returns: 'Page 5 content'
 * ```
 */
export async function extractPageText(
  pdfPath: string,
  pageNum: number
): Promise<string> {
  const loadingTask = getDocument({ url: pdfPath });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent() as TextContent;
  return textContent.items.map((item) => item.str).join(' ');
}

/**
 * 获取PDF总页数
 *
 * 快速获取PDF文档的总页数，不加载页面内容
 *
 * @param pdfPath - PDF文件路径
 * @returns PDF总页数
 * @throws 如果PDF文件不存在
 *
 * @example
 * ```ts
 * const totalPages = await getNumberOfPages('document.pdf');
 * // returns: 42
 * ```
 */
export async function getNumberOfPages(pdfPath: string): Promise<number> {
  const loadingTask = getDocument({ url: pdfPath });
  const pdf = await loadingTask.promise;
  return pdf.numPages;
}
