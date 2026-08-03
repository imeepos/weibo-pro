# @sker/pageindex - 文档索引工具

## 核心逻辑

- `md_to_tree(mdPath, ...)` 读取 Markdown 文件 → 提取标题 → 构建文档树 →（可选）token 计数/剪枝/摘要/节点 ID
- `page_index_main(...)` 读取 PDF → 页面加载/文本抽取（pdfjs-dist）→ TOC 检测/提取/校验 → 树形解析 → 按 token 预算切分节点 →（可选）OpenAI 生成摘要
- `doc_name` 由文件路径最后一段去扩展名得到（如 `multi-level.md` → `multi-level`）

## 包简介

@sker/pageindex 是 PageIndex 文档索引工具的 TypeScript 复刻：解析 PDF / Markdown 文档并生成带层级、摘要与节点 ID 的结构化索引，同时提供 CLI（`pageindex pdf|md`）与库 API（`page_index_main` / `md_to_tree`）。

## 目录结构

```
packages/pageindex/
├── bin/
│   └── pageindex.js                   # npm bin 入口（CLI）
├── src/
│   ├── cli.ts                         # commander CLI：pdf / md 子命令及全部选项
│   ├── index.ts                       # 库导出入口
│   ├── config.yaml                    # 默认配置（模型、页数/节点 token 上限等）
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
│   │   ├── node-extractor.ts          # 标题节点提取
│   │   ├── tree-builder.ts            # 文档树构建
│   │   └── ...
│   ├── types/                         # 类型体系（camelCase 旧 / snake_case 新 双兼容）
│   └── utils/                         # json、openai、token、tree 工具
├── tests/
│   ├── unit/                          # 单元测试（项目结构/配置校验）
│   ├── integration/                   # 端到端测试（PDF / Markdown 处理）
│   └── fixtures/                      # 测试夹具（sample.md、multi-level.md、empty.md、sample.pdf）
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 边界

- ✅ 解析 PDF / Markdown 并生成结构化索引 JSON
- ✅ 支持 TOC 检测/校验、token 预算切分、OpenAI 摘要
- ❌ 不连接数据库 / Redis / 队列（纯本地文档处理）
- 对外依赖：openai、pdfjs-dist、gpt-tokenizer、commander、yaml、zod
- 被谁依赖：CLI 应用 / 文档索引相关调用方
