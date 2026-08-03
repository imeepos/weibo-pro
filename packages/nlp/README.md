# @sker/nlp

社交媒体舆情 NLP 分析引擎：单次 LLM 调用同时输出情感、关键词、事件分类、标题与标签。

## 核心职责

- 一次性完整分析：一次 LLM 请求返回情感分析（正/负/中立 + 置信度 + 概率）、关键词（权重 + 情感 + 词性）、事件分类、事件标题/简介、分层标签
- 智能分类系统：预设分类 + LLM 可建议新分类（`isNewCategory`），支持传入自定义分类/标签列表
- OpenAI 兼容客户端封装：`useOpenAi` / `getOpenAiConfig`，走本地 LLM 代理服务（`API_BASE_URL`）
- 稳健的重试机制：识别 429/503/超时/网络错误等可重试异常，指数退避最多 3 次
- 上下文合并优化：自动整合帖子、评论、子评论、转发为结构化文本，降低 token 消耗

## 目录结构

```
packages/nlp/
├── src/
│   ├── index.ts                       # 导出入口（NLPAnalyzer / openai / types）
│   ├── NLPAnalyzer.ts                 # @Injectable 分析器：构建提示词、调用 LLM、JSON 解析、重试
│   ├── openai.ts                      # OpenAI 客户端工厂（useOpenAi / getOpenAiConfig）
│   └── types.ts                       # CompleteAnalysisResult / PostContext 类型定义
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：社交媒体帖子的情感/关键词/事件/标签一体化分析；OpenAI-compatible 客户端配置；分析结果类型契约
- **❌ 不负责**：分析结果的持久化存储（由调用方落库）；实时爬虫与数据采集；LLM API 密钥的服务端代理（客户端指向本地代理服务，代理由 `apps/api` 提供）
- **对外依赖**：`@sker/core`（DI 装饰器）、`@sker/ip-proxy`、`@sker/json-harmony`（JSON 解析）；外部：`openai`（^7.3.0）、`https-proxy-agent`
- **被谁依赖**：`@sker/agent`、`@sker/workflow-run`（`PostNLPAnalyzerVisitor`）、`@sker/workflow-ast`（NLP 节点类型）、`packages/crawler-core`（情感分析）

## 快速开始

```typescript
import { NLPAnalyzer, PostContext } from '@sker/nlp';
import { createRootInjector } from '@sker/core';

const injector = createRootInjector([NLPAnalyzer]);
const analyzer = injector.get(NLPAnalyzer);

const context: PostContext = {
  postId: 'weibo-123456',
  content: '今天的 AI 大会太精彩了，学到很多...',
  comments: ['确实不错', '期待下次'],
  subComments: ['我也想去'],
  reposts: ['转发微博'],
};

const result = await analyzer.analyze(context);
console.log(result.sentiment.overall);   // 'positive'
console.log(result.keywords[0].keyword); // '人工智能'
```

### OpenAI 客户端配置

```typescript
import { useOpenAi, getOpenAiConfig } from '@sker/nlp';
const client = await useOpenAi();       // 走本地 LLM 代理服务
const config = await getOpenAiConfig(); // baseURL 默认 http://localhost:8089/api/auth/llm/openai
```

| 环境变量 | 说明 |
|------|------|
| `API_BASE_URL` | LLM 代理服务地址（默认 `http://localhost:8089`） |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` | 直连模式下的端点与密钥（视部署方式） |

## 技术特点

- **默认模型**: `deepseek-ai/DeepSeek-V3.2`，温度 0.2，强制 JSON 输出
- **默认分类**: 社会热点 / 科技创新 / 政策法规 / 经济财经 / 文体娱乐 / 教育
- **性能**: 上下文合并减少 token，单次调用替代传统 5 次独立分析（API 成本与延迟约降 80%）

---

**代码即文档，一次调用，完整分析。**
