import { useEntityManager, EventCategoryEntity } from '@sker/entities';
import { generateCategoryName, isValidUUID } from './utils';

/**
 * 获取可用的事件分类列表
 */
export async function fetchAvailableCategories(): Promise<EventCategoryEntity[]> {
  return await useEntityManager(async (manager) => {
    return await manager.find(EventCategoryEntity, {
      where: { status: 'active' },
      order: { sort: 'ASC', name: 'ASC' }
    });
  });
}

/**
 * 解析或创建分类，返回有效的 category_id (UUID)
 */
export async function resolveOrCreateCategory(
  categoryIdOrCode: string,
  availableCategories: EventCategoryEntity[],
  categoryName?: string
): Promise<string> {
  // 1. 尝试通过 UUID 匹配现有分类
  const categoryById = availableCategories.find(cat => cat.id === categoryIdOrCode);
  if (categoryById) {
    return categoryById.id;
  }

  // 2. 尝试通过编码（code）匹配现有分类
  const categoryByCode = availableCategories.find(cat => cat.code === categoryIdOrCode);
  if (categoryByCode) {
    console.log(`[EventAuthGenerateAstVisitor] 自动修正 category_id: "${categoryIdOrCode}" -> "${categoryByCode.id}"`);
    return categoryByCode.id;
  }

  // 3. 检查是否是 UUID 格式（UUID 不能作为分类编码）
  if (isValidUUID(categoryIdOrCode)) {
    console.warn(`[EventAuthGenerateAstVisitor] LLM 返回了无效的 UUID 作为分类: "${categoryIdOrCode}"，使用默认分类 "other"`);
    const otherCategory = await createCategory('other', '其他');
    return otherCategory.id;
  }

  // 4. 合法的分类编码，自动创建新分类
  console.log(`[EventAuthGenerateAstVisitor] 分类 "${categoryIdOrCode}" 不存在，自动创建...`);
  const newCategory = await createCategory(categoryIdOrCode, categoryName);
  return newCategory.id;
}

/**
 * 创建新分类
 */
export async function createCategory(code: string, name?: string): Promise<EventCategoryEntity> {
  return await useEntityManager(async (manager) => {
    // 先检查是否已存在（防止并发创建）
    const existing = await manager.findOne(EventCategoryEntity, { where: { code } });
    if (existing) {
      return existing;
    }

    const category = new EventCategoryEntity();
    category.code = code;
    category.name = name || generateCategoryName(code);
    category.name_en = code;
    category.status = 'active';
    category.sort = 100;

    const saved = await manager.save(EventCategoryEntity, category);
    console.log(`[EventAuthGenerateAstVisitor] 新分类已创建: ${saved.id} (${saved.code} - ${saved.name})`);
    return saved;
  });
}
