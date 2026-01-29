/**
 * PDF TOC（目录）检测模块
 *
 * 提供PDF文档中目录页的检测功能
 */

import { ChatGPT_API } from '../utils/openai.js';
import type { PageToken } from '../types/result.types.js';

/**
 * 检测单页是否包含目录
 *
 * 使用AI判断给定的页面文本内容是否包含目录(table of contents)
 *
 * @param content - 页面文本内容
 * @param model - 模型名称
 * @returns 'yes' 表示包含目录，'no' 表示不包含
 *
 * @example
 * ```ts
 * const result = await tocDetectorSinglePage('Table of Contents...', 'gpt-4o');
 * // returns: 'yes'
 * ```
 */
export async function tocDetectorSinglePage(
  content: string,
  model: string
): Promise<'yes' | 'no'> {
  const prompt = `Is this page a table of contents page? Answer with "yes" or "no".

Page content:
${content}

Answer:`;

  const response = await ChatGPT_API(model, prompt);

  // Extract yes/no from response (handle cases like "Answer: yes")
  const cleanedResponse = response.toLowerCase().trim();
  if (cleanedResponse.includes('yes')) {
    return 'yes';
  }
  return 'no';
}

/**
 * 查找PDF中的所有目录页
 *
 * 遍历PDF页面，检测哪些页面包含目录。
 * 连续3页非TOC则停止检测。
 *
 * @param pageList - 页面列表
 * @param tocCheckPageNum - 要检查的页数（0表示检查所有页）
 * @param model - 模型名称
 * @returns 包含目录的页码列表（从1开始）
 *
 * @example
 * ```ts
 * const tocPages = await findTocPages(pageList, 10, 'gpt-4o');
 * // returns: [1, 2]
 * ```
 */
export async function findTocPages(
  pageList: PageToken[],
  tocCheckPageNum: number,
  model: string
): Promise<number[]> {
  const tocPages: number[] = [];
  let consecutiveNonToc = 0;
  const maxConsecutiveNonToc = 3;

  // Determine how many pages to check
  const pagesToCheck = tocCheckPageNum === 0
    ? pageList.length
    : Math.min(tocCheckPageNum, pageList.length);

  for (let i = 0; i < pagesToCheck; i++) {
    const page = pageList[i];
    if (!page) continue; // Skip if page is undefined

    const pageNumber = i + 1; // Page numbers start from 1

    const isToc = await tocDetectorSinglePage(page.text, model);

    if (isToc === 'yes') {
      tocPages.push(pageNumber);
      consecutiveNonToc = 0;
    } else {
      consecutiveNonToc++;
      if (consecutiveNonToc >= maxConsecutiveNonToc) {
        // Stop after 3 consecutive non-TOC pages
        break;
      }
    }
  }

  return tocPages;
}
