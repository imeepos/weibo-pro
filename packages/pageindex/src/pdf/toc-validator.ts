/**
 * PDF目录验证器
 *
 * 使用AI验证和修正PDF目录的页码准确性
 */

import { ChatGPT_API_async } from '../utils/openai.js';
import type { TOCItem } from '../types/result.types.new.js';
import type { PageToken } from '../types/result.types.js';

/**
 * 验证目录页码准确性
 *
 * 并发验证所有目录项的页码是否正确
 *
 * @param tocStructure - 目录结构数组
 * @param pageList - 页面文本和token数列表
 * @param model - AI模型名称
 * @returns 准确率(0-100)
 *
 * @example
 * ```ts
 * const toc = [
 *   { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
 *   { title: 'Chapter 2', structure: '2', physical_index: 2, list_index: 1 },
 * ];
 * const pages = [{ text: 'Page 1', tokenCount: 100 }, ...];
 * const accuracy = await verifyToc(toc, pages, 'gpt-4o');
 * // returns: 100 (all correct)
 * ```
 */
export async function verifyToc(
  tocStructure: TOCItem[],
  pageList: PageToken[],
  model: string
): Promise<number> {
  // 空TOC返回100%准确率
  if (!tocStructure || tocStructure.length === 0) {
    return 100;
  }

  // 过滤出有physical_index的项
  const itemsWithPage = tocStructure.filter(
    item => item.physical_index !== undefined && item.physical_index !== null
  );

  // 如果没有可验证的项,返回100%
  if (itemsWithPage.length === 0) {
    return 100;
  }

  // 并发验证所有项
  const verificationPromises = itemsWithPage.map(async (item) => {
    const pageIndex = item.physical_index as number;
    const page = pageList[pageIndex - 1]; // 页码从1开始,数组从0开始

    if (!page) {
      return 'no';
    }

    const prompt = `Check if the title "${item.title}" appears at the beginning of this page content.

Page content:
${page.text}

Answer "yes" if the title appears at the beginning, otherwise "no".`;

    try {
      const response = await ChatGPT_API_async(model, prompt);
      return response.toLowerCase().includes('yes') ? 'yes' : 'no';
    } catch {
      return 'no';
    }
  });

  const results = await Promise.all(verificationPromises);

  // 计算准确率
  const correctCount = results.filter(r => r === 'yes').length;
  const accuracy = Math.round((correctCount / results.length) * 100);

  return accuracy;
}

/**
 * 修正错误的目录项
 *
 * 验证所有目录项,修正错误的页码,并设置appear_start字段
 *
 * @param tocStructure - 目录结构数组
 * @param pageList - 页面文本和token数列表
 * @param model - AI模型名称
 * @returns 修正后的目录结构数组
 *
 * @example
 * ```ts
 * const toc = [
 *   { title: 'Chapter 1', structure: '1', physical_index: 1, list_index: 0 },
 *   { title: 'Chapter 2', structure: '2', physical_index: 99, list_index: 1 },
 * ];
 * const pages = [{ text: 'Page 1', tokenCount: 100 }, ...];
 * const fixed = await fixIncorrectToc(toc, pages, 'gpt-4o');
 * // returns: TOC with corrected page numbers and appear_start set
 * ```
 */
export async function fixIncorrectToc(
  tocStructure: TOCItem[],
  pageList: PageToken[],
  model: string
): Promise<TOCItem[]> {
  // 空TOC返回空数组
  if (!tocStructure || tocStructure.length === 0) {
    return [];
  }

  // 创建副本以避免修改原始数据
  const result = [...tocStructure];

  // 并发验证所有有physical_index的项
  const verificationPromises = result.map(async (item, index) => {
    // 跳过没有physical_index的项
    if (item.physical_index === undefined || item.physical_index === null) {
      return { index, appear_start: undefined as 'yes' | 'no' | undefined, isCorrect: true };
    }

    const pageIndex = item.physical_index as number;
    const page = pageList[pageIndex - 1]; // 页码从1开始,数组从0开始

    if (!page) {
      return { index, appear_start: 'no' as const, isCorrect: false };
    }

    const prompt = `Check if the title "${item.title}" appears at the beginning of this page content.

Page content:
${page.text}

Answer "yes" if the title appears at the beginning, otherwise "no".`;

    try {
      const response = await ChatGPT_API_async(model, prompt);
      const appear_start = response.toLowerCase().includes('yes') ? 'yes' : 'no';
      return { index, appear_start, isCorrect: appear_start === 'yes' };
    } catch {
      return { index, appear_start: 'no' as const, isCorrect: false };
    }
  });

  const verifications = await Promise.all(verificationPromises);

  // 更新result中的appear_start字段
  verifications.forEach(({ index, appear_start }) => {
    if (appear_start) {
      const item = result[index];
      if (item) {
        item.appear_start = appear_start as 'yes' | 'no';
      }
    }
  });

  // TODO: 实现页码修正逻辑
  // 这里需要更复杂的逻辑来找到正确的页码
  // 当前版本只设置appear_start字段

  return result;
}
