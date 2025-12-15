# Spec-Kit 提示词库

Spec-Driven Development 工作流的提示词集合。

## 文件结构

```
prompts/spec-kit/
├── README.md           # 本文件
├── constitution.md     # 项目原则生成器
├── specify.md          # 功能规格生成器
├── clarify.md          # 需求澄清器
├── tasks.md            # 任务分解器
└── implement.md        # 代码生成器
```

## 工作流阶段

| 阶段 | 提示词文件 | 节点类型 | 温度 |
|-----|-----------|---------|------|
| Constitution | constitution.md | LlmTextAgentAst | 0.3 |
| Specify | specify.md | LlmStructuredOutputAst | 0.2 |
| Clarify | clarify.md | LlmTextAgentAst | 0.4 |
| Plan | (使用 ResearchPlannerAst 内置) | ResearchPlannerAst | 0.3 |
| Tasks | tasks.md | LlmStructuredOutputAst | 0.2 |
| Implement | implement.md | CodeGeneratorAst | 0.2 |

## 数据流

```
[项目描述] ──> Constitution ──> Specify ──> Clarify ──> Plan ──> Tasks ──> Implement
                   │              │           │
                   └──────────────┴───────────┴──> (作为上下文传递)
```

## 使用方式

1. 在工作流编辑器中导入 `spec-kit/spec.workflow.json`
2. 各节点的 system 字段已预填充对应提示词
3. 可根据项目需求修改提示词内容

## 自定义提示词

修改对应的 `.md` 文件后，需要同步更新 `spec.workflow.json` 中对应节点的 `system` 字段。
