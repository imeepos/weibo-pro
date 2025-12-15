# @sker/nlp

基于 OpenAI-compatible API 的 NLP 分析服务包，提供微博舆情的一站式语义分析能力。

## 目录结构

```
packages/nlp/
├── src/
│   ├── index.ts           # 导出入口
│   ├── types.ts           # 类型定义
│   ├── openai.ts          # OpenAI 客户端配置
│   └── NLPAnalyzer.ts     # 核心分析器
├── package.json
└── tsup.config.ts
```

## 核心功能

### 一次性语义分析

通过单次 LLM 调用获取微博内容的全方位分析，包括：

- **情感分析**：整体情感倾向（positive/negative/neutral）+ 置信度 + 概率分布
- **关键词提取**：Top 30 关键词（含权重、情感、词性、频次）
- **事件分类**：从已有分类中选择或提议新分类
- **事件标题**：10-30字叙事性描述
- **事件简介**：50-200字客观全面描述
- **事件标签**：3-10个标签（keyword/topic/entity 三种类型）

### 去重机制

支持传入最近事件列表，LLM 会检测内容相似度，避免重复事件创建。

## 核心类和函数

### NLPAnalyzer (src/NLPAnalyzer.ts)

**文件路径**: `packages/nlp/src/NLPAnalyzer.ts`

核心分析器类，使用 `@Injectable()` 装饰器注册到 DI 容器。

#### analyze() - L19-L61

```typescript
async analyze(
  context: PostContext,
  availableCategories?: string[],
  availableTags?: string[],
  recentEvents?: Array<{ title: string; description?: string }>
): Promise<CompleteAnalysisResult>
```

**参数**：
- `context`: 帖子上下文（包含内容、评论、子评论、转发）
- `availableCategories`: 可选，已有事件分类列表（默认：社会热点|科技创新|政策法规|经济财经|文体娱乐）
- `availableTags`: 可选，已有标签列表
- `recentEvents`: 可选，最近事件列表（用于去重，传入前50条）

**返回值**: `CompleteAnalysisResult`

**实现细节**：
1. 调用 `buildContext()` 合并帖子+评论上下文（L26）
2. 调用 `buildPrompt()` 构建提示词（L27）
3. 使用 DeepSeek-V3.2 模型（L33）
4. 设置 `temperature: 0.2` 保证稳定性（L35）
5. 强制 JSON 输出格式（L36）

#### buildContext() - L66-L84

```typescript
private buildContext(context: PostContext): string
```

将帖子内容、评论、子评论、转发合并为结构化文本：

```
【帖子内容】
原始内容...

【评论】
评论1
评论2

【子评论】
子评论1

【转发】
转发内容1
```

#### buildPrompt() - L89-L200

```typescript
private buildPrompt(
  text: string,
  availableCategories?: string[],
  availableTags?: string[],
  recentEvents?: Array<{ title: string; description?: string }>
): string
```

构建详细的提示词，包含：

1. **角色定位**：社交媒体舆情分析专家（L117）
2. **去重指令**：检查已有事件列表（L105-L115）
   - 传入最近50个事件
   - 要求 LLM 复用相同标题避免重复
3. **分析任务**：6项任务（L121-L126）
4. **输出格式**：严格 JSON Schema（L129-L160）
5. **字段说明**：详细的字段解释（L162-L197）

**关键设计**：
- 事件标题要求是"连贯的叙事性描述"，而非关键词列表（L181）
- 事件简介要求客观、专业，避免情绪化（L183-L187）
- 标签分为 keyword/topic/entity 三种类型（L192-L196）

### OpenAI 客户端 (src/openai.ts)

**文件路径**: `packages/nlp/src/openai.ts`

#### useOpenAi() - L4-L8

```typescript
export function useOpenAi(): OpenAI
```

创建并验证 OpenAI 客户端实例。

**环境变量依赖**：
- `OPENAI_BASE_URL`: API 基础地址
- `OPENAI_API_KEY`: API 密钥

**验证逻辑** (L17-L33)：
- 检查必需的环境变量
- 抛出友好的中文错误提示
- 打印配置信息（隐藏 API Key 前部，仅显示后4位）

### 类型定义 (src/types.ts)

**文件路径**: `packages/nlp/src/types.ts`

#### CompleteAnalysisResult - L6-L44

完整分析结果的类型定义，包含所有分析维度。

**关键字段**：

```typescript
interface CompleteAnalysisResult {
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    positive_prob: number;
    negative_prob: number;
    neutral_prob: number;
  };
  keywords: Array<{
    keyword: string;
    weight: number;        // 0-1，降序排列
    sentiment: 'positive' | 'negative' | 'neutral';
    pos: string;           // noun/verb/adj
    count: number;         // 出现次数
  }>;
  event: {
    type: string;
    confidence: number;
    isNewCategory?: boolean;  // 是否为新建议分类
  };
  eventTitle: string;         // 10-30字
  eventDescription: string;   // 50-200字
  tags: Array<{
    name: string;
    type: 'keyword' | 'topic' | 'entity';
    isNew?: boolean;          // 是否为新标签
  }>;
}
```

#### PostContext - L46-L53

输入的帖子上下文结构。

```typescript
interface PostContext {
  postId: string;
  content: string;
  comments: string[];
  subComments: string[];
  reposts: string[];
}
```

## 使用示例

### 基础使用

```typescript
import { NLPAnalyzer } from '@sker/nlp';
import { root } from '@sker/core';

// 通过 DI 容器获取实例
const analyzer = root.get(NLPAnalyzer);

// 准备上下文
const context = {
  postId: '5102768237473902',
  content: '杨幂成为享界S9T品牌大使，期待新的合作！',
  comments: [
    '恭喜杨幂！',
    '车很漂亮，代言很合适'
  ],
  subComments: [],
  reposts: ['转发微博']
};

// 执行分析
const result = await analyzer.analyze(context);

console.log('情感:', result.sentiment.overall);
console.log('事件标题:', result.eventTitle);
console.log('关键词:', result.keywords.slice(0, 5));
```

### 带去重的高级使用

```typescript
// 从数据库查询最近事件
const recentEvents = await eventRepository.find({
  where: { createdAt: MoreThan(thirtyDaysAgo) },
  select: ['title', 'description'],
  order: { createdAt: 'DESC' },
  take: 50
});

// 传入已有分类和标签
const availableCategories = [
  '社会热点',
  '科技创新',
  '政策法规',
  '经济财经',
  '文体娱乐'
];

const availableTags = await tagRepository
  .find({ select: ['name'] })
  .then(tags => tags.map(t => t.name));

// 执行分析（带去重）
const result = await analyzer.analyze(
  context,
  availableCategories,
  availableTags,
  recentEvents
);

// 检查是否为新分类/新标签
if (result.event.isNewCategory) {
  console.log('建议新分类:', result.event.type);
}

const newTags = result.tags.filter(t => t.isNew);
if (newTags.length > 0) {
  console.log('建议新标签:', newTags.map(t => t.name));
}
```

### 在工作流中使用

参见 `packages/workflow-run/src/PostNLPAnalyzerVisitor.ts`：

```typescript
@Injectable()
@Handler(PostNLPAnalyzerAst)
export class PostNLPAnalyzerVisitor implements IAstVisitor<PostNLPAnalyzerAst> {
  constructor(
    private readonly nlpAnalyzer: NLPAnalyzer,
    private readonly postNLPResultRepo: Repository<PostNLPResultEntity>
  ) {}

  async visit(
    ast: PostNLPAnalyzerAst,
    ctx: IAstContext
  ): Promise<IVisitorResult> {
    const contexts = ast.contexts; // 从上游节点获取

    for (const context of contexts) {
      // 检查缓存
      const cached = await this.postNLPResultRepo.findOne({
        where: { postId: context.postId }
      });
      if (cached) continue;

      // 执行分析
      const result = await this.nlpAnalyzer.analyze(context);

      // 保存结果
      await this.postNLPResultRepo.save({
        postId: context.postId,
        sentiment: result.sentiment.overall,
        sentimentScore: result.sentiment.confidence,
        keywords: result.keywords,
        // ...
      });
    }

    return { success: true };
  }
}
```

## 设计模式与最佳实践

### 1. 依赖注入

`NLPAnalyzer` 使用 `@Injectable()` 装饰器注册到 `@sker/core` 的全局 DI 容器，确保单例模式和统一管理。

```typescript
@Injectable()
export class NLPAnalyzer {
  // 无需手动管理实例
}
```

**获取实例**：
```typescript
import { root } from '@sker/core';
const analyzer = root.get(NLPAnalyzer);
```

### 2. 环境变量验证

`useOpenAi()` 函数在创建客户端前主动验证环境变量，失败时抛出友好错误，避免运行时模糊异常。

```typescript
function validateOpenAiConfig(config: ClientOptions): void {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY 环境变量未设置。请检查 .env 文件或环境变量配置。');
  }
  // ...
}
```

### 3. 一次性分析模式

不同于传统的分步调用（情感分析 → 关键词提取 → 分类），`NLPAnalyzer` 通过**一次 LLM 调用**获取所有分析结果，优势：

- **成本更低**：减少 API 调用次数（6合1）
- **速度更快**：单次调用延迟 << 6次调用
- **上下文一致**：所有分析基于同一理解
- **结果关联**：情感、关键词、分类相互呼应

### 4. 结构化输出

使用 `response_format: { type: 'json_object' }` 强制 LLM 输出 JSON，避免解析失败：

```typescript
const response = await client.chat.completions.create({
  model: 'deepseek-ai/DeepSeek-V3.2',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.2,
  response_format: { type: 'json_object' }, // 关键
});
```

### 5. 去重提示词工程

通过传入 `recentEvents` 列表，让 LLM 主动检测重复事件：

```typescript
const recentEventsHint = recentEvents?.length
  ? `\n**重要：已有事件列表（最近30天）**
请仔细检查以下已有事件，如果当前内容与某个事件描述的是同一件事，**必须使用相同或高度相似的标题**...
${recentEvents.slice(0, 50).map((e, i) => `${i + 1}. ${e.title}`).join('\n')}
**去重规则：**
- 如果当前内容与已有事件属于同一事件，请使用已有事件的标题或稍作调整
- 只有在确实是完全不同的事件时，才创建新标题
`
  : '';
```

### 6. 分层上下文构建

`buildContext()` 方法将帖子、评论、子评论、转发分层标记，帮助 LLM 理解信息层级：

```
【帖子内容】
原始内容

【评论】
评论1
评论2

【子评论】
回复内容
```

这种结构化表示比简单拼接更有利于语义理解。

### 7. 错误处理与日志

分析过程中记录关键节点日志，失败时包含上下文信息：

```typescript
console.log('开始 NLP 分析，文本长度:', mergedText.length);
// ...
console.log('NLP 分析完成，响应状态:', response.choices.length > 0 ? '成功' : '无响应');
// ...
console.error('NLP 分析失败:', {
  error: error instanceof Error ? error.message : '未知错误',
  contextLength: context.content?.length || 0
});
```

### 8. 缓存友好设计

`PostContext` 使用 `postId` 作为唯一标识，业务层可据此实现缓存：

```typescript
const cached = await postNLPResultRepo.findOne({
  where: { postId: context.postId }
});
if (cached) return cached; // 避免重复分析
```

## 集成说明

### 在 NestJS 中使用

```typescript
// apps/api/src/app.module.ts
import { NLPAnalyzer } from '@sker/nlp';
import { root } from '@sker/core';

@Module({
  providers: [
    {
      provide: NLPAnalyzer,
      useFactory: () => root.get(NLPAnalyzer)
    }
  ]
})
export class AppModule {}
```

### 在工作流中使用

参见 `@sker/workflow-ast` 的 `PostNLPAnalyzerAst` 节点，通过依赖注入自动获取实例。

## 环境变量配置

在 `.env` 文件中配置：

```bash
# OpenAI-compatible API 配置
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**支持的模型**：
- DeepSeek-V3.2（默认）
- OpenAI GPT-4/3.5
- 任何兼容 OpenAI API 的模型

## 性能建议

1. **批量分析**：单次分析延迟约 2-5秒，建议通过消息队列异步处理（参考 `@sker/mq` + `PostNLPAnalyzerVisitor`）
2. **缓存结果**：NLP 结果应持久化到 `PostNLPResultEntity`，避免重复分析
3. **限制上下文长度**：单次分析建议不超过 8000 tokens（约 4000 中文字符），评论过多时截断
4. **并发控制**：LLM API 有 QPS 限制，建议通过消息队列控制并发数（如 10/s）

## 故障排查

### 1. 环境变量未设置

```
Error: OPENAI_API_KEY 环境变量未设置。请检查 .env 文件或环境变量配置。
```

**解决方案**：检查 `.env` 文件，确保 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY` 已正确配置。

### 2. JSON 解析失败

```
Error: NLP 分析失败: Unexpected token ...
```

**原因**：LLM 未按 JSON 格式返回（模型不支持 `response_format` 或提示词问题）。

**解决方案**：
- 检查模型是否支持 `json_object` 格式
- 调整提示词，明确要求返回 JSON

### 3. 分析超时

**原因**：文本过长导致 LLM 处理时间过长。

**解决方案**：
- 截断评论数量（保留前 50 条）
- 提高 API 超时时间
- 使用更快的模型

### 4. 情感分析不准确

**原因**：上下文不足或模型能力限制。

**解决方案**：
- 确保传入完整的评论和转发数据
- 调整 `temperature` 参数（默认 0.2）
- 尝试更强大的模型（如 GPT-4）

## 依赖关系

```
@sker/nlp
├── @sker/core        # 依赖注入容器
└── openai            # OpenAI SDK
```

**被依赖**：
- `@sker/workflow-run` - 工作流执行器
- `@sker/agent` - Agent 工具（`nlp_analyze_tool`）
- `apps/api` - 后端 API 服务

## 开发命令

```bash
# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```

## 未来优化方向

1. **多模型支持**：通过策略模式支持不同模型（GPT-4、DeepSeek、文心一言）
2. **流式输出**：支持 SSE 流式返回，提升用户体验
3. **增量分析**：新增评论时仅分析增量，而非重新分析全文
4. **多语言支持**：扩展支持英文、日文等语言的舆情分析
5. **自定义提示词**：允许业务层传入自定义提示词模板

---

**核心设计理念**：一次调用，全面分析；结构化输出，统一管理；缓存优先，避免重复。
