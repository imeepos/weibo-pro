# Workflow AST 文件夹重组报告

## 执行时间
2025-12-30

## 重组目标
按 `@Node` 装饰器的 `type` 字段重组 `packages/workflow-ast/src` 的文件夹结构，方便用户按节点类型查找。

## 重组前后对比

### 重组前（按应用场景分层）
```
src/
├── 01-data-sources/          # 数据源层
│   ├── weibo/
│   ├── http/
│   ├── database/
│   ├── file/
│   └── system/
├── 02-data-processing/       # 数据处理层
│   ├── analyzer/
│   ├── collector/
│   └── creator/
├── 03-ai-capabilities/       # AI 能力层
│   ├── conversation/
│   ├── understanding/
│   ├── generation/
│   ├── quality/
│   └── research/
├── 04-personas/              # 角色系统
│   ├── core/
│   └── domain-experts/
├── 05-workflow-control/      # 工作流控制
│   └── schedule/
└── 06-ui-components/         # UI 组件
```

### 重组后（按 type 分类）
```
src/
├── llm/                      # 大模型节点 (26个)
├── crawler/                  # 爬虫/数据采集节点 (16个)
├── basic/                    # 基础节点 (8个)
├── sentiment/                # 舆情分析节点 (6个)
├── control/                  # 控制流节点 (2个)
├── analysis/                 # 分析节点 (1个)
├── scheduler/                # 调度节点 (1个)
├── meta/                     # Meta 节点（保持不变）
├── types/                    # 类型定义（保持不变）
└── templates/                # 模板（保持不变）
```

## 节点分布统计

| Type | 节点数 | 占比 |
|------|--------|------|
| llm | 26 | 43.3% |
| crawler | 16 | 26.7% |
| basic | 8 | 13.3% |
| sentiment | 6 | 10.0% |
| control | 2 | 3.3% |
| analysis | 1 | 1.7% |
| scheduler | 1 | 1.7% |
| **总计** | **60** | **100%** |

## 详细迁移清单

### llm (26个)
- ErrorAnalyzerAst.ts
- ClaudeCodeAst.ts
- ClaudeCodeRefactorAst.ts
- ClaudeCodeReviewAst.ts
- GroupChatLoopAst.ts
- LlmTextAgentAst.ts
- CodeGeneratorAst.ts
- StoryWeaverAst.ts
- LlmTextImage2ToVideoAst.ts
- LlmTextImageToVideoAst.ts
- LlmTextToAudioAst.ts
- LlmTextToImageAst.ts
- LlmTextToVideoAst.ts
- WorkflowNodeGeneratorAst.ts
- PromptOptimizerAst.ts
- QualityCheckerAst.ts
- AnswerEvaluatorAst.ts
- AnswerFinalizerAst.ts
- QueryRewriterAst.ts
- ResearchPlannerAst.ts
- LlmImageToTextAst.ts
- LlmStructuredOutputAst.ts
- LlmVideoToTextAst.ts
- PersonaAst.ts
- PersonaCreatorAst.ts
- PromptRoleSkillAst.ts

### crawler (16个)
- ProxyAutoSelectAst.ts
- WeiboAccountPickAst.ts
- WeiboLoginAst.ts
- WeiboUserDetectionAst.ts
- WeiboAjaxStatusesCommentAst.ts
- WeiboAjaxStatusesLikeShowAst.ts
- WeiboAjaxStatusesMymblogAst.ts
- WeiboAjaxStatusesRepostTimelineAst.ts
- WeiboAjaxStatusesShowAst.ts
- WeiboAjaxFeedHotTimelineAst.ts
- WeiboKeywordSearchAst.ts
- WeiboAjaxFriendshipsAst.ts
- WeiboAjaxProfileInfoAst.ts
- PostNLPAnalyzerAst.ts
- PostContextCollectorAst.ts
- EventAutoCreatorAst.ts

### basic (8个)
- SqlExecuteAst.ts
- ExcelUploadAst.ts
- MarkdownUploadAst.ts
- HttpAst.ts
- EmailD1Ast.ts
- ShareAst.ts
- EventAst.ts
- PropertySelectorAst.ts

### sentiment (6个)
- InsightAgentAst.ts
- KeywordAgentAst.ts
- MediaAgentAst.ts
- QueryAgentAst.ts
- ReportAgentAst.ts
- ForumAgentAst.ts

### control (2个)
- LlmCategoryAst.ts
- StoryQualityLoopAst.ts

### analysis (1个)
- SerpClusterAst.ts

### scheduler (1个)
- ScheduledWorkflowAst.ts

## 修复的问题

1. **ForumAgentAst 缺失 type**：已补充 `type: 'sentiment'`
2. **StoryQualityLoopAst 导入路径错误**：修复了 `QualityCheckerAst` 的导入路径（从 `./` 改为 `../llm/`）

## 验证结果

✅ 所有 60 个节点文件已成功移动
✅ 旧的文件夹结构已清理
✅ `index.ts` 已更新，所有导出正常
✅ 构建成功（`pnpm build`）
✅ 类型检查通过

## 向后兼容性

- ✅ `index.ts` 保持所有导出，现有代码无需修改
- ✅ Meta 节点（`meta/`）保持原位置
- ✅ 类型定义（`types/`）保持原位置
- ✅ 模板（`templates/`）保持原位置

## 优势

1. **查找更快**：用户可以直接按 type 找到对应节点
2. **分类清晰**：7 个 type 分类比原来的 6 层嵌套更简洁
3. **扩展性好**：新增节点只需放入对应 type 文件夹
4. **与 UI 一致**：文件夹结构与 UI 中的节点分类保持一致

## 建议

1. 更新 `CLAUDE.md` 文档，反映新的文件夹结构
2. 如果有其他包依赖旧的文件路径，需要更新导入路径
3. 考虑在 UI 中按 type 分组显示节点，与文件夹结构保持一致
