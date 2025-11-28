-- 诊断事件类型统计问题

-- 1. 查看所有事件分类
SELECT
  id,
  name,
  description,
  created_at
FROM event_categories
ORDER BY created_at DESC;

-- 2. 查看事件数量按分类统计（所有时间）
SELECT
  COALESCE(c.name, '未分类') as category,
  c.id as category_id,
  COUNT(*) as count
FROM events e
LEFT JOIN event_categories c ON c.id = e.category_id
WHERE e.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY count DESC;

-- 3. 查看最近7天的事件分类统计
SELECT
  COALESCE(c.name, '未分类') as category,
  COUNT(*) as count,
  MIN(e.created_at) as earliest_event,
  MAX(e.created_at) as latest_event
FROM events e
LEFT JOIN event_categories c ON c.id = e.category_id
WHERE e.created_at >= NOW() - INTERVAL '7 days'
  AND e.deleted_at IS NULL
GROUP BY c.name
ORDER BY count DESC;

-- 4. 查看未分类的事件数量
SELECT
  COUNT(*) as uncategorized_count
FROM events e
WHERE e.category_id IS NULL
  AND e.deleted_at IS NULL;

-- 5. 查看最近24小时的事件分类统计
SELECT
  COALESCE(c.name, '未分类') as category,
  COUNT(*) as count
FROM events e
LEFT JOIN event_categories c ON c.id = e.category_id
WHERE e.created_at >= NOW() - INTERVAL '24 hours'
  AND e.deleted_at IS NULL
GROUP BY c.name
ORDER BY count DESC;

-- 6. 检查事件表总数
SELECT
  COUNT(*) as total_events,
  COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as categorized,
  COUNT(CASE WHEN category_id IS NULL THEN 1 END) as uncategorized,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM events
WHERE deleted_at IS NULL;
