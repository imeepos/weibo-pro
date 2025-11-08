import { Injectable, Inject } from '@sker/core';
import { useEntityManager, LayoutConfigurationEntity } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';

export interface CreateLayoutPayload {
  name: string;
  type: 'bigscreen' | 'frontend' | 'admin';
  layout: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

export interface UpdateLayoutPayload {
  name?: string;
  layout?: Record<string, any>;
  metadata?: Record<string, any>;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getLayoutConfigurations(type: 'bigscreen' | 'frontend' | 'admin') {
    const cacheKey = CacheService.buildKey('layout:list', type);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const layouts = await entityManager
            .createQueryBuilder(LayoutConfigurationEntity, 'layout')
            .where('layout.type = :type', { type })
            .orderBy('layout.is_default', 'DESC')
            .addOrderBy('layout.created_at', 'DESC')
            .getMany();

          return {
            success: true,
            data: layouts.map(this.mapLayoutToResponse),
            message: '获取布局列表成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getDefaultLayout(type: 'bigscreen' | 'frontend' | 'admin') {
    const cacheKey = CacheService.buildKey('layout:default', type);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const layout = await entityManager
            .createQueryBuilder(LayoutConfigurationEntity, 'layout')
            .where('layout.type = :type', { type })
            .andWhere('layout.is_default = :isDefault', { isDefault: true })
            .getOne();

          return {
            success: true,
            data: layout ? this.mapLayoutToResponse(layout) : null,
            message: layout ? '获取默认布局成功' : '暂无默认布局'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getLayoutById(id: string) {
    const cacheKey = CacheService.buildKey('layout:detail', id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const layout = await entityManager
            .createQueryBuilder(LayoutConfigurationEntity, 'layout')
            .where('layout.id = :id', { id })
            .getOne();

          if (!layout) {
            return {
              success: false,
              data: null,
              message: '布局配置不存在'
            };
          }

          return {
            success: true,
            data: this.mapLayoutToResponse(layout),
            message: '获取布局详情成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async createLayout(payload: CreateLayoutPayload) {
    return await useEntityManager(async entityManager => {
      const layout = entityManager.create(LayoutConfigurationEntity, {
        name: payload.name,
        type: payload.type,
        layout: payload.layout,
        metadata: payload.metadata || null,
        description: payload.description || null,
        isDefault: false,
      });

      await entityManager.save(layout);

      // 清除缓存
      await this.clearLayoutCache(payload.type);

      return {
        success: true,
        data: this.mapLayoutToResponse(layout),
        message: '创建布局成功'
      };
    });
  }

  async updateLayout(id: string, payload: UpdateLayoutPayload) {
    return await useEntityManager(async entityManager => {
      const layout = await entityManager.findOne(LayoutConfigurationEntity, {
        where: { id }
      });

      if (!layout) {
        return {
          success: false,
          data: null,
          message: '布局配置不存在'
        };
      }

      if (payload.name !== undefined) layout.name = payload.name;
      if (payload.layout !== undefined) layout.layout = payload.layout;
      if (payload.metadata !== undefined) layout.metadata = payload.metadata;
      if (payload.description !== undefined) layout.description = payload.description;

      await entityManager.save(layout);

      // 清除缓存
      await this.clearLayoutCache(layout.type, id);

      return {
        success: true,
        data: this.mapLayoutToResponse(layout),
        message: '更新布局成功'
      };
    });
  }

  async deleteLayout(id: string) {
    return await useEntityManager(async entityManager => {
      const layout = await entityManager.findOne(LayoutConfigurationEntity, {
        where: { id }
      });

      if (!layout) {
        return {
          success: false,
          data: null,
          message: '布局配置不存在'
        };
      }

      if (layout.isDefault) {
        return {
          success: false,
          data: null,
          message: '无法删除默认布局，请先设置其他布局为默认'
        };
      }

      await entityManager.softDelete(LayoutConfigurationEntity, id);

      // 清除缓存
      await this.clearLayoutCache(layout.type, id);

      return {
        success: true,
        data: null,
        message: '删除布局成功'
      };
    });
  }

  async setDefaultLayout(id: string, type: 'bigscreen' | 'frontend' | 'admin') {
    return await useEntityManager(async entityManager => {
      const layout = await entityManager.findOne(LayoutConfigurationEntity, {
        where: { id, type }
      });

      if (!layout) {
        return {
          success: false,
          data: null,
          message: '布局配置不存在'
        };
      }

      // 取消该类型下所有布局的默认状态
      await entityManager
        .createQueryBuilder()
        .update(LayoutConfigurationEntity)
        .set({ isDefault: false })
        .where('type = :type', { type })
        .execute();

      // 设置当前布局为默认
      layout.isDefault = true;
      await entityManager.save(layout);

      // 清除缓存
      await this.clearLayoutCache(type, id);

      return {
        success: true,
        data: this.mapLayoutToResponse(layout),
        message: '设置默认布局成功'
      };
    });
  }

  private mapLayoutToResponse(layout: LayoutConfigurationEntity) {
    return {
      id: layout.id,
      name: layout.name,
      type: layout.type,
      layout: layout.layout,
      metadata: layout.metadata,
      isDefault: layout.isDefault,
      description: layout.description,
      createdAt: layout.createdAt.toISOString(),
      updatedAt: layout.updatedAt.toISOString(),
    };
  }

  private async clearLayoutCache(type: string, id?: string) {
    await this.cacheService.delete(CacheService.buildKey('layout:list', type));
    await this.cacheService.delete(CacheService.buildKey('layout:default', type));
    if (id) {
      await this.cacheService.delete(CacheService.buildKey('layout:detail', id));
    }
  }
}
