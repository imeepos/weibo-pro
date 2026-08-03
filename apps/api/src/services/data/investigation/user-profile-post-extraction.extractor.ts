/**
 * 用户画像帖子抽取的 LLM 调用与响应解析。
 * 负责构建提示词、调用大模型（含结构化输出回退）与解析抽取结果。
 */
import { useLlmModel } from '@sker/workflow-run';
import { postExtractionSchema, type PostExtraction } from './user-profile-post-extraction.schema';
import {
  DEFAULT_EXTRACTOR_MODEL,
  resolveExtractorTimeoutMs,
} from './user-profile-post-extraction.constants';
import {
  isRecoverablePlainExtractorFailure,
  parseExtractorJsonText,
  withTimeout,
} from './user-profile-post-extraction.utils';

const EXTRACTOR_SYSTEM_PROMPT =
  '你负责逐帖抽取微博内容中的主题、事件、观点、情绪、实体、风险和时间线索，只能返回 JSON。';

export function buildExtractorMessages(input: {
  normalizedText: string;
  fingerprint: string;
  sourceSnapshot: Record<string, unknown>;
}): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: EXTRACTOR_SYSTEM_PROMPT,
    },
    {
      role: 'human',
      content: JSON.stringify({
        text: input.normalizedText,
        fingerprint: input.fingerprint,
        sourceSnapshot: input.sourceSnapshot,
      }),
    },
  ];
}

export function parseExtractorResponse(response: unknown): PostExtraction {
  if (typeof response === 'string') {
    return parseExtractorJsonText(response);
  }

  if (response && typeof response === 'object') {
    const content = (response as { content?: unknown }).content;
    if (typeof content === 'string') {
      return parseExtractorJsonText(content);
    }

    if (Array.isArray(content)) {
      const text = content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object' && 'text' in item) {
            return String((item as { text?: unknown }).text ?? '');
          }
          return '';
        })
        .join('\n')
        .trim();

      if (text) {
        return parseExtractorJsonText(text);
      }
    }

    return postExtractionSchema.parse(response);
  }

  return postExtractionSchema.parse(response);
}

export async function invokePostExtractor(input: {
  normalizedText: string;
  fingerprint: string;
  sourceSnapshot: Record<string, unknown>;
}): Promise<PostExtraction> {
  const model = useLlmModel({
    model: DEFAULT_EXTRACTOR_MODEL,
    temperature: 0.1,
  });
  const timeoutMs = resolveExtractorTimeoutMs();
  const messages = buildExtractorMessages(input);

  try {
    const response = await withTimeout(
      () => model.invoke(messages),
      timeoutMs,
      `帖子抽取超时（>${Math.ceil(timeoutMs / 1000)}s）`,
    );
    return parseExtractorResponse(response);
  } catch (error) {
    if (
      !isRecoverablePlainExtractorFailure(error) ||
      typeof (model as any).withStructuredOutput !== 'function'
    ) {
      throw error;
    }
  }

  const structuredModel = (model as any).withStructuredOutput(postExtractionSchema);
  const response = await withTimeout(
    () => structuredModel.invoke(messages),
    timeoutMs,
    `帖子结构化抽取超时（>${Math.ceil(timeoutMs / 1000)}s）`,
  );
  return postExtractionSchema.parse(response);
}
