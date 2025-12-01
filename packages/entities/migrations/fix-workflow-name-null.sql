-- 迁移脚本: 修复 workflows 表 name 字段 NULL 值问题
-- 问题: TypeORM 无法在包含 NULL 值的列上添加 NOT NULL 约束
-- 解决: 为所有 NULL 值填充默认值

-- 步骤 1: 为现有的 NULL name 值填充默认值
-- 使用 code 字段作为默认 name (code 有 unique 约束,不会为 NULL)
UPDATE workflows
SET name = COALESCE(name, code, '未命名工作流')
WHERE name IS NULL;

-- 步骤 2: 验证没有 NULL 值
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM workflows WHERE name IS NULL) THEN
    RAISE EXCEPTION 'workflows 表中仍存在 name 为 NULL 的记录';
  END IF;
END $$;

-- 步骤 3: 添加 NOT NULL 约束 (如果尚未添加)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workflows'
    AND column_name = 'name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE workflows ALTER COLUMN name SET NOT NULL;
  END IF;
END $$;
