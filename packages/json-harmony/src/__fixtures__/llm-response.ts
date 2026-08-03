/**
 * 真实 LLM 响应样本
 * 从 parser.test.ts 的「Markdown 代码块提取」describe 拆分而来。
 * 仅保存测试输入数据，不包含任何断言逻辑。
 */

/** 从真实日志中复制的 LLM 响应（复现 EventAuthGenerateAstVisitor 失败场景） */
export const LLM_RESPONSE_JSON_BLOCK = `\`\`\`json
{
  "title": "腾讯回应元宝AI辱骂用户",
  "description": "针对微博话题#腾讯回应元宝AI辱骂用户#，腾讯元宝AI因被曝辱骂用户引发舆论关注。该事件阅读量高达2308.2万，讨论量 近8000。目前腾讯已对此事做出回应，相关话题由新浪科技主持发布。",
  "category_id": "fd1d8f5f-5c5f-4be3-9864-f306147dd3f8",
  "sentiment": {
    "positive": 0.1,
    "negative": 0.7,
    "neutral": 0.2
  },
  "hotness": 85.0,
  "status": "active",
  "seed_url": null,
  "occurred_at": "2026-01-04T16:54:00.000Z",
  "peak_at": "2026-01-04T16:54:00.000Z",
  "keywords": [
    "腾讯",
    "元宝AI",
    "辱骂用户",
    "新浪科技",
    "AI安全"
  ],
  "reasoning": "检测到与现有事件高度相似。现有事件ID 262256e3-a2bf-4ea6-a6fb-fafb20b5f6c1 和 999603f1-5b70-4099-8931-4afda9cade4e 的标题均为'腾讯回应元宝AI辱骂用户'，且描述内容与用户输入的关键词及数据（阅读量2308.2万、讨论量7987）完全一致。根据去重策略，判定为重复事件 ，不生成新记录。",
  "alreadyExists": true,
  "existingEventId": "262256e3-a2bf-4ea6-a6fb-fafb20b5f6c1"
}
\`\`\``
