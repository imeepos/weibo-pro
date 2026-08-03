import { z } from 'zod';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { Observable, from, throwError, timer } from 'rxjs';
import { concatMap, map, catchError, timeout, finalize } from 'rxjs/operators';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { PromptBuilder } from '../PromptBuilder';
import { ParsedChapter, extractContentByMarkers, sanitizeChapterData } from './chapter-content-extractor';

export type { ParsedChapter };

/**
 * 结构化提取器
 * 职责：使用 json-harmony 优雅地解析 LLM 返回的文本，带指数退避重试
 *
 * 哲学：宁可失败，不以次充好
 * - 不使用降级方案
 * - 解析失败直接抛出错误
 * - 触发重试机制
 */
export class ChapterStructuredExtractor {
  constructor(private promptBuilder: PromptBuilder) {}

  /**
   * 提取结构化内容（带重试）
   * 最多重试 maxRetries 次，每次重试间隔递增
   */
  extractWithRetry(
    baseModel: ChatOpenAI<ChatOpenAICallOptions>,
    rawText: string,
    signal: AbortSignal,
    extractionSchema: z.ZodObject<z.ZodRawShape>,
    maxRetries: number,
    currentAttempt: number = 1
  ): Observable<ParsedChapter> {
    console.log(`[extractStructuredContentWithRetry] 开始第${currentAttempt}次提取尝试`);

    return this.extract(baseModel, rawText, signal, extractionSchema).pipe(
      catchError((error) => {
        console.error(`[extractStructuredContentWithRetry] 第${currentAttempt}次提取失败:`, error.message);

        if (currentAttempt >= maxRetries) {
          console.error(`[extractStructuredContentWithRetry] 已达到最大重试次数 ${maxRetries}，放弃提取`);
          return throwError(() => new Error(`结构化提取失败，已重试 ${maxRetries} 次：${error.message}`));
        }

        // 指数退避：1秒、2秒、4秒
        const backoffDelay = 1000 * Math.pow(2, currentAttempt - 1);
        console.log(`[extractStructuredContentWithRetry] ${backoffDelay}ms 后进行第${currentAttempt + 1}次尝试...`);

        return timer(backoffDelay).pipe(
          concatMap(() =>
            this.extractWithRetry(
              baseModel,
              rawText,
              signal,
              extractionSchema,
              maxRetries,
              currentAttempt + 1
            )
          )
        );
      })
    );
  }

  /**
   * 提取结构化内容
   * 使用 json-harmony 优雅地解析 LLM 返回的文本
   */
  private extract(
    baseModel: ChatOpenAI<ChatOpenAICallOptions>,
    rawText: string,
    signal: AbortSignal,
    extractionSchema: z.ZodObject<z.ZodRawShape>
  ): Observable<ParsedChapter> {
    const extractionPrompt = this.promptBuilder.buildExtractionPrompt(rawText);

    const startTime = Date.now();

    // 使用普通 invoke，让 LLM 返回 JSON 文本，然后用 json-harmony 解析
    return from(baseModel.invoke([
      {
        role: 'system',
        content: `你是一个文本结构化提取专家，精确提取小说章节的元数据。

**严格要求**：
1. 只返回 JSON 对象，不要有任何其他文字说明
2. JSON 必须完整且格式正确
3. 使用标准 JSON 格式（双引号、正确的逗号）
4. 不要截断 JSON，确保所有字段都完整
5. 直接输出 JSON，可以使用 \`\`\`json 代码块包裹`
      },
      { role: 'user', content: extractionPrompt }
    ], { signal })).pipe(
      timeout(60000), // 60秒超时，超时直接抛出错误
      map((aiMessage) => {
        // 获取 LLM 返回的文本
        const responseText = typeof aiMessage.content === 'string'
          ? aiMessage.content
          : JSON.stringify(aiMessage.content);

        console.log(`[extractStructuredContent] LLM 返回文本长度: ${responseText.length}`);
        console.log(`[extractStructuredContent] LLM 返回文本预览: ${responseText.slice(0, 300)}...`);

        // 使用 json-harmony 解析，它能处理：
        // - Markdown 代码块
        // - 无引号的键
        // - 尾随逗号
        // - 混合格式
        const parseResult = parseWithHarmony(responseText);

        console.log(`[extractStructuredContent] json-harmony 解析成功`);
        console.log(`[extractStructuredContent] 使用的恢复策略: ${parseResult.statistics.recoveryStrategiesUsed.join(', ')}`);
        console.log(`[extractStructuredContent] 解析耗时: ${parseResult.statistics.parseTimeMs}ms`);

        // 检查 PreserveAsString 策略：如果返回字符串，尝试手动提取 JSON
        if (typeof parseResult.data === 'string') {
          console.warn(`[extractStructuredContent] json-harmony 降级为 PreserveAsString，尝试手动提取 JSON`);
          console.log(`[extractStructuredContent] 字符串内容: ${parseResult.data.slice(0, 500)}`);

          // 尝试手动提取 JSON（去除代码块标记、前后空白等）
          let jsonText = parseResult.data.trim();

          // 移除 Markdown 代码块标记
          const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (codeBlockMatch?.[1]) {
            jsonText = codeBlockMatch[1].trim();
            console.log(`[extractStructuredContent] 提取代码块后: ${jsonText.slice(0, 300)}`);
          }

          // 再次使用 json-harmony 解析提取后的文本
          // 因为 json-harmony 比原生 JSON.parse() 更强大，能修复更多格式错误
          const retryResult = parseWithHarmony(jsonText);

          console.log(`[extractStructuredContent] 二次解析恢复策略: ${retryResult.statistics.recoveryStrategiesUsed.join(', ')}`);

          if (typeof retryResult.data !== 'string') {
            // 二次解析成功，使用解析后的数据
            console.log(`[extractStructuredContent] 二次解析成功`);
            parseResult.data = retryResult.data;
          } else {
            // 如果 json-harmony 尝试了所有策略后还是返回字符串，说明 JSON 格式严重错误
            console.error(`[extractStructuredContent] json-harmony 二次解析仍然失败`);
            console.error(`[extractStructuredContent] 无法解析的文本: ${jsonText.slice(0, 500)}`);

            throw new Error('LLM 返回的 JSON 格式无效，json-harmony 尝试所有策略后仍无法解析为结构化数据，将触发重试');
          }
        }

        // 数据清洗：修复 LLM 可能返回的格式错误
        const sanitizedData = sanitizeChapterData(parseResult.data);

        // 使用 zod schema 验证数据结构
        const validated = extractionSchema.parse(sanitizedData) as {
          title: string;
          summary: string;
          contentStartMarker?: string;
          contentEndMarker?: string;
          clues?: Array<{
            id: string;
            description: string;
            status: 'pending' | 'resolved';
          }>;
          resolvedClueIds?: string[];
        };

        // 使用标记从原始文本中提取正文内容
        const content = extractContentByMarkers(
          rawText,
          validated.contentStartMarker || '',
          validated.contentEndMarker || ''
        );

        // 组装完整的 ParsedChapter
        const parsedChapter: ParsedChapter = {
          title: validated.title,
          summary: validated.summary,
          content: content,
          clues: validated.clues,
          resolvedClueIds: validated.resolvedClueIds
        };

        return parsedChapter;
      }),
      catchError((error) => {
        // 检查是否为中止错误
        if (signal.aborted) {
          return throwError(() => new Error('任务已被用户取消'));
        }

        console.error(`[extractStructuredContent] 结构化提取失败:`, error);
        console.error(`[extractStructuredContent] 错误详情:`, {
          message: error.message,
          name: error.name,
          stack: error.stack
        });

        // 不使用降级方案，直接抛出错误，触发重试
        return throwError(() => error);
      }),
      finalize(() => {
        const elapsed = Date.now() - startTime;
        console.log(`[extractStructuredContent] 结构化提取流程结束，总耗时: ${elapsed}ms`);
      })
    );
  }
}
