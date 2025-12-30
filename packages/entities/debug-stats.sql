-- 检查各表的数据量
SELECT 'weibo_reposts' as table_name, COUNT(*) as count FROM weibo_reposts
UNION ALL
SELECT 'weibo_comments', COUNT(*) FROM weibo_comments
UNION ALL
SELECT 'weibo_likes', COUNT(*) FROM weibo_likes
UNION ALL
SELECT 'weibo_posts', COUNT(*) FROM weibo_posts;

-- 检查 weibo_comments 的数据情况
SELECT
  COUNT(*) as total_comments,
  COUNT(CASE WHEN user IS NOT NULL THEN 1 END) as has_user,
  COUNT(CASE WHEN rootid IS NOT NULL THEN 1 END) as has_rootid,
  MIN(id) as min_id,
  MAX(id) as max_id
FROM weibo_comments;

-- 检查 weibo_comments 能否 JOIN 到 weibo_posts
SELECT
  COUNT(*) as joinable_comments
FROM weibo_comments c
JOIN weibo_posts p ON c.rootid = p.id
WHERE c.user->>'id' IS NOT NULL
  AND p.user->>'id' IS NOT NULL
  AND c.user->>'id' != p.user->>'id';

-- 检查 weibo_likes 的数据情况
SELECT
  COUNT(*) as total_likes,
  COUNT(CASE WHEN user_weibo_id IS NOT NULL THEN 1 END) as has_user_id,
  COUNT(CASE WHEN target_weibo_id IS NOT NULL THEN 1 END) as has_target_id,
  MIN(id) as min_id,
  MAX(id) as max_id
FROM weibo_likes;

-- 检查 weibo_likes 能否 JOIN 到 weibo_posts
SELECT
  COUNT(*) as joinable_likes
FROM weibo_likes l
JOIN weibo_posts p ON l.target_weibo_id = p.id
WHERE l.user_weibo_id != (p.user->>'id')::bigint
  AND p.user->>'id' IS NOT NULL;
