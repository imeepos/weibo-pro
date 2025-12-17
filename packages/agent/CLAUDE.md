# @sker/agent - 舆情分析智能体

基于 LangChain + LangGraph 的自主研究与舆情分析 Agent 包。

## 目录结构

```
packages/agent/
├── src/
│   ├── types.ts                           # 类型定义（任务、报告、步骤）
│   ├── ResearchAgent.ts                   # 自主研究 Agent
│   ├── OpinionAgent.ts                    # 舆情分析 Agent
│   ├── tools/                             # 工具库
│   │   ├── index.ts                       # 工具导出
│   │   ├── post-query.tool.ts             # 微博帖子查询
│   │   ├── event-query.tool.ts            # 舆情事件查询
│   │   ├── event-analysis.tool.ts         # 事件时间线与关键节点分析
│   │   ├── nlp-analysis.tool.ts           # NLP 分析（情感+关键词）
│   │   ├── influencer-analysis.tool.ts    # 影响力人物分析
│   │   ├── key-opinion.tool.ts            # 关键言论提取
│   │   ├── user-profile.tool.ts           # 用户行为分析与异常检测
│   │   └── batch-detection.tool.ts        # 批量异常账号检测
│   └── readme.md                          # LangChain 使用示例
├── package.json
└── tsconfig.json
```
