import { Injectable, Inject } from '@sker/core';
import { DataSource, Repository } from 'typeorm';
import { LlmProvider, useEntityManager } from '@sker/entities';

/**
 * LLM Provider 服务
 *
 * 存在即合理:
 * - 管理 LLM Provider 的 CRUD 操作
 * - 提供基于健康分数的 Provider 选取策略
 * - 封装数据库操作，保持业务逻辑清晰
 *
 * 优雅即简约:
 * - 方法名直白明了，表达意图
 * - 统一的错误处理策略
 * - 类型安全的参数传递
 */
@Injectable({ providedIn: 'root' })
export class LlmProviderService {

  /**
   * 查询所有 LLM Provider
   */
  async findAll(): Promise<LlmProvider[]> {
    return useEntityManager(async m => {
      return m.find(LlmProvider, { order: { score: 'desc' } })
    })
  }

  /**
   * 根据 ID 查询 LLM Provider
   */
  async findOne(id: string): Promise<LlmProvider | null> {
    return useEntityManager(async m => {
      return m.findOne(LlmProvider, { where: { id } })
    })
  }

  /**
   * 创建新的 LLM Provider
   */
  async create(createLlmProviderDto: Partial<LlmProvider>): Promise<LlmProvider> {
    return await useEntityManager(async m => {
      const provider = await m.create(LlmProvider, createLlmProviderDto)
      const { id } = await m.save(LlmProvider, provider)
      return { ...provider, id }
    })
  }

  /**
   * 更新 LLM Provider
   */
  async update(id: string, updateLlmProviderDto: Partial<LlmProvider>): Promise<LlmProvider> {
    return await useEntityManager(async m => {
      await m.update(LlmProvider, id, updateLlmProviderDto)
      const provider = await m.findOne(LlmProvider, { where: { id } })
      if (!provider) {
        throw new Error(`LLM Provider with id ${id} not found`);
      }
      return provider;
    })
  }

  /**
   * 删除 LLM Provider
   */
  async remove(id: string): Promise<void> {
    await useEntityManager(async m => {
      await m.delete(LlmProvider, id)
    })
  }

  /**
   * 获取当前最佳的 LLM Provider（基于健康分数）
   */
  async getBestProvider(): Promise<LlmProvider | null> {
    return useEntityManager(async m => {
      return m.findOne(LlmProvider, {
        where: { score: 10000 },
        order: { updated_at: 'ASC' }
      })
    })
  }

  /**
   * 更新 LLM Provider 的健康分数
   */
  async updateScore(id: string, score: number): Promise<void> {
    await useEntityManager(async m => {
      return m.update(LlmProvider, id, { score })
    })
  }
}