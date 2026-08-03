import { LlmChatLog, useEntityManager } from '@sker/entities';
import type { PromptAnalysisResult } from '@sker/sdk';
import { Between } from 'typeorm';
import { createHash } from 'crypto';

/**
 * 分析提示词使用情况
 */
export async function analyzePrompts(
  startDate?: string,
  endDate?: string,
  modelName?: string,
  providerId?: string
): Promise<PromptAnalysisResult> {
  return useEntityManager(async m => {
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }
    if (modelName) where.modelName = modelName;
    if (providerId) where.providerId = providerId;

    const PAGE_SIZE = 5000;
    let offset = 0;
    let hasMore = true;
    const promptMap = new Map<string, { name?: string, content: string; count: number; type: 'system' | 'user' | 'assistant' | 'tool' }>();

    while (hasMore) {
      const logs = await m.find(LlmChatLog, {
        select: { request: true },
        where,
        order: { createdAt: 'ASC' },
        skip: offset,
        take: PAGE_SIZE,
      });

      if (logs.length === 0) {
        hasMore = false;
        break;
      }

      for (const log of logs) {
        try {
          const request = typeof log.request === 'string' ? JSON.parse(log.request) : log.request;
          // 1. 提取 system 参数（Anthropic API）
          if (request.system) {
            const systemContents = extractSystemContent(request.system);
            for (const content of systemContents) {
              if (!content || content.length === 0) continue;
              const hash = hashContent(content);
              const existing = promptMap.get(hash);
              if (existing) {
                existing.count++;
              } else {
                promptMap.set(hash, { content, count: 1, type: 'system' });
              }
            }
          }

          // 2. 提取 messages 中的提示词
          if (request.messages && Array.isArray(request.messages)) {
            for (const message of request.messages) {
              if (!message || typeof message !== 'object') continue;

              const content = extractMessageContent(message);
              if (!content || content.length === 0) continue;

              // 角色识别：只使用 role 字段
              const role = message.role;
              let type: 'system' | 'user' | 'assistant' | 'tool' = 'user';

              if (role === 'system') {
                type = 'system';
              } else if (role === 'assistant') {
                type = 'assistant';
              } else if (role === 'tool') {
                type = 'tool';
              } else if (role === 'user') {
                type = 'user';
              } else {
                // 如果 role 不是标准值，默认为 user
                type = 'user';
              }

              const hash = hashContent(content);
              const existing = promptMap.get(hash);
              if (existing) {
                existing.count++;
              } else {
                promptMap.set(hash, { content, count: 1, type });
              }
            }
          }

          // 3. 提取 tools 中的描述（完整版）
          if (request.tools && Array.isArray(request.tools)) {
            for (const tool of request.tools) {
              if (!tool || typeof tool !== 'object') continue;

              // 提取工具的主描述
              if (tool.description && typeof tool.description === 'string') {
                const content = tool.description.trim();
                if (content.length > 0) {
                  const hash = hashContent(content);
                  const existing = promptMap.get(hash);
                  if (existing) {
                    existing.count++;
                  } else {
                    promptMap.set(hash, { name: tool.name, content, count: 1, type: 'tool' });
                  }
                }
              }

              // 提取 function.description
              if (tool.function?.description && typeof tool.function.description === 'string') {
                const content = tool.function.description.trim();
                if (content.length > 0) {
                  const hash = hashContent(content);
                  const existing = promptMap.get(hash);
                  if (existing) {
                    existing.count++;
                  } else {
                    promptMap.set(hash, { content, count: 1, type: 'tool' });
                  }
                }
              }

              // 提取 function.parameters.properties 中的描述
              if (tool.function?.parameters?.properties && typeof tool.function.parameters.properties === 'object') {
                for (const [_propName, prop] of Object.entries(tool.function.parameters.properties)) {
                  if (prop && typeof prop === 'object' && 'description' in prop && typeof prop.description === 'string') {
                    const content = prop.description.trim();
                    if (content.length > 0) {
                      const hash = hashContent(content);
                      const existing = promptMap.get(hash);
                      if (existing) {
                        existing.count++;
                      } else {
                        promptMap.set(hash, { content, count: 1, type: 'tool' });
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('[LlmChatLogService] Failed to parse request:', error);
        }
      }

      offset += PAGE_SIZE;
    }

    // 转换为数组并按使用次数降序排序
    const items: any[] = Array.from(promptMap.entries()).map(([hash, data]) => ({
      content: data.content,
      hash,
      count: data.count,
      type: data.type,
    }));

    items.sort((a, b) => b.count - a.count);

    // 计算总使用次数
    const totalUsage = items.reduce((sum, item) => sum + item.count, 0);

    // 按类型统计
    const typeStats = new Map<string, { count: number; usage: number }>();
    for (const item of items) {
      const stat = typeStats.get(item.type);
      if (stat) {
        stat.count++;
        stat.usage += item.count;
      } else {
        typeStats.set(item.type, { count: 1, usage: item.count });
      }
    }

    const byType = Array.from(typeStats.entries()).map(([type, stat]) => ({
      type,
      count: stat.count,
      usage: stat.usage,
    }));

    return {
      items,
      total: items.length,
      totalUsage,
      byType,
    };
  });
}

/**
 * 对内容进行 sha256 哈希（截取前16位）
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
}

/**
 * 提取消息内容（支持字符串和数组格式）
 */
export function extractMessageContent(message: any): string | null {
  if (!message.content) return null;

  if (typeof message.content === 'string') {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    const textParts = message.content
      .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
      .map((item: any) => item.text.trim());
    return textParts.length > 0 ? textParts.join('\n') : null;
  }

  return null;
}

/**
 * 提取 system 参数内容（支持字符串、数组、对象格式）
 */
export function extractSystemContent(system: any): string[] {
  const contents: string[] = [];

  if (typeof system === 'string') {
    const content = system.trim();
    if (content.length > 0) {
      contents.push(content);
    }
  } else if (Array.isArray(system)) {
    for (const item of system) {
      // 支持多种格式
      if (typeof item === 'string') {
        // 直接是字符串
        const content = item.trim();
        if (content.length > 0) {
          contents.push(content);
        }
      } else if (item && typeof item === 'object') {
        // 对象格式：{ type: 'text', text: '...' } 或 { text: '...' }
        const text = item.text || item.content;
        if (typeof text === 'string') {
          const content = text.trim();
          if (content.length > 0) {
            contents.push(content);
          }
        }
      }
    }
  } else if (system && typeof system === 'object') {
    // 对象格式（非数组）
    const text = system.text || system.content;
    if (typeof text === 'string') {
      const content = text.trim();
      if (content.length > 0) {
        contents.push(content);
      }
    }
  }

  return contents;
}
