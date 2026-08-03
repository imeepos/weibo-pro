/**
 * PDF目录提取器
 *
 * 使用AI从PDF文档中提取目录结构并转换为结构化数据
 */

import { ChatGPT_API_with_finish_reason } from '../utils/openai.js';
import { extractJson, getJsonContent } from '../utils/json.js';
import type { TOCItem } from '../types/result.types.js';
import type { ChatMessage } from '../types/openai.types.js';

/**
 * 将目录文本转换为结构化JSON
 *
 * 使用AI解析PDF中的目录文本，提取标题、层级和页码信息
 * 支持续写机制处理长输出
 *
 * @param tocContent - 目录文本内容
 * @param model - 使用的AI模型名称
 * @returns 结构化的目录项数组
 *
 * @example
 * ```ts
 * const toc = `Chapter 1 ............ 5
 * Chapter 2 ............ 10`;
 * const items = await tocTransformer(toc, 'gpt-4o');
 * // => [{ title: 'Chapter 1', structure: '1', physical_index: 5 }, ...]
 * ```
 */
export async function tocTransformer(
  tocContent: string,
  model: string
): Promise<TOCItem[]> {
  // 处理空内容
  if (!tocContent || tocContent.trim().length === 0) {
    return [];
  }

  const prompt = `Your job is to extract the table of contents from the given text and return a structured JSON format.

Given text:
${tocContent}

Return format (make sure physical_index is a number):
{
    "thinking": "...",
    "toc": [
        {
            "title": "Chapter title",
            "structure": "1",
            "physical_index": 5
        }
    ]
}`;

  let content = '';
  let finishReason: 'finished' | 'max_output_reached' = 'max_output_reached';
  let attempts = 0;

  // 初始生成
  try {
    const response = await ChatGPT_API_with_finish_reason(model, prompt);
    content = response[0];
    finishReason = response[1];
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    return [];
  }

  // 续写机制：如果输出被截断，继续生成
  let chatHistory: ChatMessage[] = [
    { role: 'user', content: prompt },
    { role: 'assistant', content }
  ];

  while (finishReason === 'max_output_reached' && attempts < 5) {
    try {
      const continueResponse = await ChatGPT_API_with_finish_reason(
        model,
        'Please continue generating the table of contents.',
        undefined,
        chatHistory
      );

      content += continueResponse[0];
      finishReason = continueResponse[1];

      // 更新对话历史
      chatHistory = [
        ...chatHistory,
        { role: 'assistant', content: continueResponse[0] }
      ];

      attempts++;
    } catch (error) {
      console.error('Error in continue generation:', error);
      break;
    }
  }

  // 提取JSON内容
  try {
    const jsonContent = getJsonContent(content);
    const result = extractJson(jsonContent);

    if (result && typeof result === 'object' && 'toc' in result && Array.isArray(result.toc)) {
      return result.toc.map((item: unknown) => {
        const tocItem = item as Record<string, unknown>;
        return {
          title: (tocItem.title as string) || '',
          structure: (tocItem.structure as string) || null,
          physical_index: (tocItem.physical_index as number | undefined),
          level: tocItem.structure ? (tocItem.structure as string).split('.').length : 1,
        };
      });
    }

    return [];
  } catch (error) {
    console.error('Error parsing TOC JSON:', error);
    return [];
  }
}

/**
 * 从文档内容中提取目录页码
 *
 * 提取目录内容并验证页码信息
 *
 * @param tocContent - 目录文本内容
 * @param tocIndexGiven - 目录页码信息描述
 * @param model - 使用的AI模型名称
 * @returns 结构化的目录项数组
 *
 * @example
 * ```ts
 * const toc = `Chapter 1 ............ 5`;
 * const items = await tocIndexExtractor(toc, 'yes', 'gpt-4o');
 * // => [{ title: 'Chapter 1', structure: '1', physical_index: 5 }]
 * ```
 */
export async function tocIndexExtractor(
  tocContent: string,
  tocIndexGiven: string,
  model: string
): Promise<TOCItem[]> {
  // TODO: 实现页码提取逻辑
  // 这里可以调用tocTransformer并额外处理页码信息
  return await tocTransformer(tocContent, model);
}
