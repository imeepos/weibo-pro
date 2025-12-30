-- Check if rootidstr matches idstr for comments
SELECT COUNT(*) as comment_matches
FROM weibo_comments c
JOIN weibo_posts p ON c.rootidstr = p.idstr
WHERE c."user"->>'id' IS NOT NULL
  AND p."user"->>'id' IS NOT NULL
  AND c."user"->>'id' != p."user"->>'id'
LIMIT 5;

-- Check target_weibo_id as string
SELECT 
  l.target_weibo_id,
  p.id,
  p.idstr,
  p.mid
FROM weibo_likes l
JOIN weibo_posts p ON l.target_weibo_id::text = p.id::text
LIMIT 5;
