import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutService } from './layout.service';
import { CacheService } from '../cache.service';
import { mockEntityManager, mockRedis } from '../../test-setup';

// Mock 数据库连接层：useEntityManager 使用内存 mock manager
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

function createLayoutRow(overrides: any = {}) {
  const now = new Date('2024-01-01T00:00:00Z');
  return {
    id: overrides.id ?? 'layout-1',
    name: overrides.name ?? '大屏 A',
    type: overrides.type ?? 'bigscreen',
    layout: overrides.layout ?? { grid: [] },
    metadata: overrides.metadata ?? null,
    isDefault: overrides.isDefault ?? false,
    description: overrides.description ?? null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('LayoutService (integration, mock repository)', () => {
  let service: LayoutService;
  let cacheService: CacheService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    mockQueryBuilder = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue(null),
    };

    // 查询走 createQueryBuilder，写操作直接 mock manager 方法
    mockEntityManager.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);
    (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(null);
    (mockEntityManager as any).save = vi.fn().mockImplementation(async (entity: any) => entity);
    (mockEntityManager as any).softDelete = vi.fn().mockResolvedValue({ affected: 1 });
    (mockEntityManager as any).transaction = vi.fn().mockImplementation(async (fn: any) => fn(mockEntityManager));

    cacheService = new CacheService(mockRedis as any);
    vi.spyOn(cacheService, 'getOrSet').mockImplementation(async (_key, fn) => fn());
    vi.spyOn(cacheService, 'del').mockResolvedValue(undefined);

    service = new LayoutService(cacheService);
    vi.clearAllMocks();
  });

  describe('查询布局', () => {
    it('getLayoutConfigurations 按 type 查询并映射响应', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([createLayoutRow()]);

      const result = await service.getLayoutConfigurations('bigscreen');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('layout.type = :type', { type: 'bigscreen' });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'layout-1',
        name: '大屏 A',
        type: 'bigscreen',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('getDefaultLayout 查询 is_default=true 的布局', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(createLayoutRow({ isDefault: true }));

      const result = await service.getDefaultLayout('bigscreen');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('layout.type = :type', { type: 'bigscreen' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('layout.is_default = :isDefault', { isDefault: true });
      expect(result.isDefault).toBe(true);
    });

    it('getDefaultLayout 无默认布局时抛出错误', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.getDefaultLayout('bigscreen')).rejects.toThrow('暂无默认布局');
    });

    it('getLayoutById 查询指定 id', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(createLayoutRow({ id: 'layout-9' }));

      const result = await service.getLayoutById('layout-9');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('layout.id = :id', { id: 'layout-9' });
      expect(result.id).toBe('layout-9');
    });

    it('getLayoutById 不存在时抛出错误', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.getLayoutById('missing')).rejects.toThrow('布局配置不存在');
    });
  });

  describe('创建布局', () => {
    it('createLayout 创建并保存布局，清除缓存', async () => {
      (mockEntityManager as any).create = vi.fn().mockImplementation(
        (_entity: any, data: any) => createLayoutRow({ id: 'new-1', ...data, isDefault: false })
      );
      (mockEntityManager as any).save = vi.fn().mockImplementation(async (entity: any) => entity);

      const result = await service.createLayout({
        name: '新布局',
        type: 'frontend',
        layout: { rows: [] },
      });

      expect((mockEntityManager as any).create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: '新布局',
          type: 'frontend',
          isDefault: false,
        })
      );
      expect(cacheService.del).toHaveBeenCalledWith('layout:list:frontend');
      expect(result.name).toBe('新布局');
    });
  });

  describe('更新布局', () => {
    it('updateLayout 更新存在的布局', async () => {
      const existing = createLayoutRow({ id: 'layout-1', name: '旧名' });
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(existing);
      (mockEntityManager as any).save = vi.fn().mockImplementation(async (entity: any) => entity);

      const result = await service.updateLayout('layout-1', { name: '新名' });

      expect(result.name).toBe('新名');
      expect((mockEntityManager as any).save).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('layout:list:bigscreen');
      expect(cacheService.del).toHaveBeenCalledWith('layout:detail:layout-1');
    });

    it('updateLayout 布局不存在时抛出错误', async () => {
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(null);

      await expect(service.updateLayout('missing', { name: 'x' })).rejects.toThrow('布局配置不存在');
      expect((mockEntityManager as any).save).not.toHaveBeenCalled();
    });
  });

  describe('删除布局', () => {
    it('deleteLayout 删除非默认布局', async () => {
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(createLayoutRow({ isDefault: false }));

      await service.deleteLayout('layout-1');

      expect((mockEntityManager as any).softDelete).toHaveBeenCalledWith(expect.anything(), 'layout-1');
      expect(cacheService.del).toHaveBeenCalledWith('layout:detail:layout-1');
    });

    it('deleteLayout 布局不存在时抛出错误', async () => {
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(null);

      await expect(service.deleteLayout('missing')).rejects.toThrow('布局配置不存在');
    });

    it('deleteLayout 禁止删除默认布局', async () => {
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(createLayoutRow({ isDefault: true }));

      await expect(service.deleteLayout('layout-1')).rejects.toThrow('无法删除默认布局');
      expect((mockEntityManager as any).softDelete).not.toHaveBeenCalled();
    });
  });

  describe('设置默认布局', () => {
    it('setDefaultLayout 先取消其他默认再设置当前', async () => {
      const target = createLayoutRow({ id: 'layout-2', isDefault: false });
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(target);

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      };
      (mockEntityManager as any).createQueryBuilder = vi.fn().mockReturnValue(updateQuery);

      const result = await service.setDefaultLayout('layout-2', 'bigscreen');

      expect(updateQuery.update).toHaveBeenCalledWith(expect.anything());
      expect(updateQuery.set).toHaveBeenCalledWith({ isDefault: false });
      expect(updateQuery.where).toHaveBeenCalledWith('type = :type', { type: 'bigscreen' });
      expect(target.isDefault).toBe(true);
      expect(result.isDefault).toBe(true);
      expect(cacheService.del).toHaveBeenCalledWith('layout:default:bigscreen');
    });

    it('setDefaultLayout 布局不存在时抛出错误', async () => {
      (mockEntityManager as any).findOne = vi.fn().mockResolvedValue(null);

      await expect(service.setDefaultLayout('missing', 'bigscreen')).rejects.toThrow('布局配置不存在');
    });
  });
});
