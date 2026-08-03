# @sker/pageindex

TypeScript 1:1 复刻 PageIndex 的文档索引工具：解析 PDF / Markdown 文档并生成带层级、摘要与节点 ID 的结构化索引。

## 核心职责

- 提供 CLI（`pageindex pdf|md`）处理 PDF 与 Markdown 文档，输出结构索引 JSON
- PDF 侧：加载 PDF、目录（TOC）检测/提取/校验、树形解析、按 token 预算切分节点，支持调 OpenAI 生成节点摘要
- Markdown 侧：从标题层级抽取节点，构建文档树（`md_to_tree`）
- 类型体系同时支持 camelCase（旧）与 snake_case（新）两套命名，保证向后兼容
- 库 API：`page_index_main`（PDF）、`md_to_tree`（Markdown）供编程调用

## 目录结构

```
packages/pageindex/
├── bin/
│   └── pageindex.js                   # npm bin 入口（CLI）
├── src/
│   ├── cli.ts                         # commander CLI：pdf / md 子命令及全部选项
│   ├── index.ts                       # 库导出入口
│   ├── config.yaml                    # 默认配置
│   ├── pdf/
│   │   ├── page-index.ts              # page_index_main：PDF 索引主流程
│   │   ├── page-loader.ts             # PDF 页面加载与文本抽取（pdfjs-dist）
│   │   ├── toc-detector.ts            # 目录（TOC）检测
│   │   ├── toc-extractor.ts           # 目录项抽取
│   │   ├── toc-validator.ts           # 目录校验（页码/层级一致性）
│   │   ├── tree-parser.ts             # 树形结构解析
│   │   └── ...
│   ├── markdown/
│   │   ├── page-index-md.ts           # md_to_tree：Markdown 索引主流程
│   │   ├── node-extractor.ts          # 从标题层级抽取节点
│   │   └── tree-builder.ts            # Markdown 文档树构建
│   ├── types/
│   │   ├── index.ts                   # 类型中央导出（新旧两套命名）
│   │   ├── config.types[.new].ts      # 配置类型
│   │   ├── node.types[.new].ts        # 节点类型
│   │   ├── result.types[.new].ts      # 索引结果 / TOC / 校验结果类型
│   │   ├── openai.types[.new].ts      # OpenAI 调用配置类型
│   │   └── ...
│   └── utils/
│       ├── index.ts                   # 工具导出
│       ├── json.ts                    # JSON 序列化工具
│       ├── token.ts                   # gpt-tokenizer 封装，token 预算计算
│       ├── tree.ts                    # 树结构通用工具
│       └── openai.ts                  # OpenAI 客户端封装（生成摘要）
├── tests/                             # unit + integration 测试（含 fixtures）
├── package.json                       # 包配置（提供 bin）
├── tsconfig.json
└── vitest.config.ts                   # 测试配置
```

## 边界

- **✅ 负责**：PDF / Markdown 文档解析、TOC 检测与校验、树形索引生成、OpenAI 摘要生成、CLI 与库双入口
- **❌ 不负责**：Web 服务与 HTTP API；文档库的持久化存储；与舆情/爬虫数据模型的耦合（独立工具包）
- **对外依赖**：无 `@sker/*` workspace 运行时依赖；外部：`openai`、`gpt-tokenizer`、`pdfjs-dist`、`commander`、`yaml`、`dotenv`、`zod`
- **被谁依赖**：当前未被其他 `@sker/*` 包/应用引用，作为独立 CLI 工具使用
