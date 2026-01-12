# Halo 产品需求文档 (PRD)

**版本**: 3.0
**日期**: 2025-12-25
**产品**: 基于 Workflow 的 Claude Code CLI 控制系统

---

## 1. 产品定位

利用 weibo-pro 项目的 **@sker/workflow** 工作流引擎，通过工作流节点封装 `@anthropic-ai/claude-code` CLI 工具，实现可视化编排的 AI 代码助手自动化。

**核心理念**: 将 Claude Code CLI 封装为工作流节点，通过子进程调用实现 AI 能力的可视化编排。

---

## 2. 技术方案

### 2.1 核心依赖

```json
{
  "@sker/workflow": "workspace:*",          // 工作流引擎
  "@sker/workflow-ast": "workspace:*",      // 节点定义
  "@sker/workflow-run": "workspace:*",      // 执行器
  "execa": "^8.0.0"                         // 子进程管理
}
```

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────┐
│           前端工作流编辑器 (@sker/workflow-ui)            │
│  - 拖拽 Claude Code 节点                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         工作流执行引擎 (@sker/workflow-run)               │
│  - ClaudeCodeVisitor (执行节点)                          │
│  - ClaudeCodeService (封装 CLI 调用)                     │
└─────────────────────────────────────────────────────────┘
                         ↓ 子进程调用
┌─────────────────────────────────────────────────────────┐
│              Claude Code CLI                             │
│  - 代码分析、编辑、搜索                                   │
│  - ripgrep、tree-sitter、WASM 模块                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 实现步骤

### 步骤 1: 封装 Claude Code CLI 服务

**文件**: `packages/workflow-run/src/services/claude-code.service.ts`

```typescript
import { execa } from 'execa'
import { Injectable } from '@sker/core'

@Injectable({ providedIn: 'root' })
export class ClaudeCodeService {
  /**
   * 调用 Claude Code CLI
   * @param prompt 提示词
   * @param options 选项
   */
  async execute(prompt: string, options?: {
    cwd?: string
    files?: string[]
    dangerouslySkipPermissions?: boolean
  }) {
    const args = [
      '--print',                          // 打印模式
      '--output-format', 'json',          // JSON 输出
      '-p', prompt                        // 提示词
    ]

    if (options?.cwd) {
      args.push('--cwd', options.cwd)
    }

    if (options?.files) {
      options.files.forEach(f => args.push('--file', f))
    }

    if (options?.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions')
    }

    const { stdout } = await execa('claude', args, {
      cwd: options?.cwd,
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      }
    })

    return JSON.parse(stdout)
  }

  /**
   * 代码审查
   */
  async reviewCode(code: string, language?: string) {
    const prompt = `请审查以下${language || ''}代码，指出潜在问题和改进建议：\n\n\`\`\`\n${code}\n\`\`\``
    return this.execute(prompt, { dangerouslySkipPermissions: true })
  }

  /**
   * 代码重构
   */
  async refactorCode(code: string, language?: string) {
    const prompt = `请重构以下${language || ''}代码，提高可读性和性能：\n\n\`\`\`\n${code}\n\`\`\``
    return this.execute(prompt, { dangerouslySkipPermissions: true })
  }

  /**
   * 代码解释
   */
  async explainCode(code: string, language?: string) {
    const prompt = `请解释以下${language || ''}代码的功能和实现原理：\n\n\`\`\`\n${code}\n\`\`\``
    return this.execute(prompt, { dangerouslySkipPermissions: true })
  }

  /**
   * 文件操作
   */
  async analyzeFiles(files: string[], question: string, cwd?: string) {
    return this.execute(question, { files, cwd })
  }
}
```

---

### 步骤 2: 定义 Claude Code 节点

**文件**: `packages/workflow-ast/src/nodes/claude/claude-code.ast.ts`

```typescript
import { Ast, Node, Input, Output } from '@sker/workflow'

@Node({
  title: 'Claude Code',
  type: 'claude-code',
  category: 'ai-capabilities',
  errorStrategy: 'retry'
})
export class ClaudeCodeAst extends Ast {
  @Input({ title: '提示词', mode: 'single' })
  prompt: string

  @Input({ title: '工作目录', mode: 'single', optional: true })
  cwd?: string

  @Input({ title: '文件列表', mode: 'single', optional: true })
  files?: string[]

  @Output({ title: '响应' })
  response: string
}
```

**文件**: `packages/workflow-ast/src/nodes/claude/claude-code-review.ast.ts`

```typescript
@Node({
  title: 'Claude 代码审查',
  type: 'claude-code-review',
  category: 'ai-capabilities'
})
export class ClaudeCodeReviewAst extends Ast {
  @Input({ title: '代码', mode: 'single' })
  code: string

  @Input({ title: '语言', mode: 'single', optional: true })
  language?: string

  @Output({ title: '审查结果' })
  result: string
}
```

**文件**: `packages/workflow-ast/src/nodes/claude/claude-code-refactor.ast.ts`

```typescript
@Node({
  title: 'Claude 代码重构',
  type: 'claude-code-refactor',
  category: 'ai-capabilities'
})
export class ClaudeCodeRefactorAst extends Ast {
  @Input({ title: '代码', mode: 'single' })
  code: string

  @Input({ title: '语言', mode: 'single', optional: true })
  language?: string

  @Output({ title: '重构后代码' })
  refactoredCode: string
}
```

---

### 步骤 3: 实现 Visitor

**文件**: `packages/workflow-run/src/visitors/claude/claude-code.visitor.ts`

```typescript
import { Handler } from '@sker/workflow'
import { ClaudeCodeAst } from '@sker/workflow-ast'
import { ClaudeCodeService } from '../../services/claude-code.service'

@Handler(ClaudeCodeAst)
export class ClaudeCodeVisitor {
  constructor(private claudeCode: ClaudeCodeService) {}

  async handle(node: ClaudeCodeAst, inputs: any) {
    const result = await this.claudeCode.execute(inputs.prompt, {
      cwd: inputs.cwd,
      files: inputs.files,
      dangerouslySkipPermissions: true
    })

    return { response: result.content || result.text || JSON.stringify(result) }
  }
}
```

**文件**: `packages/workflow-run/src/visitors/claude/claude-code-review.visitor.ts`

```typescript
@Handler(ClaudeCodeReviewAst)
export class ClaudeCodeReviewVisitor {
  constructor(private claudeCode: ClaudeCodeService) {}

  async handle(node: ClaudeCodeReviewAst, inputs: any) {
    const result = await this.claudeCode.reviewCode(inputs.code, inputs.language)
    return { result: result.content || result.text || JSON.stringify(result) }
  }
}
```

**文件**: `packages/workflow-run/src/visitors/claude/claude-code-refactor.visitor.ts`

```typescript
@Handler(ClaudeCodeRefactorAst)
export class ClaudeCodeRefactorVisitor {
  constructor(private claudeCode: ClaudeCodeService) {}

  async handle(node: ClaudeCodeRefactorAst, inputs: any) {
    const result = await this.claudeCode.refactorCode(inputs.code, inputs.language)
    return { refactoredCode: result.content || result.text || JSON.stringify(result) }
  }
}
```

---

### 步骤 4: 注册节点

**文件**: `packages/workflow-ast/src/index.ts`

```typescript
export * from './nodes/claude/claude-code.ast'
export * from './nodes/claude/claude-code-review.ast'
export * from './nodes/claude/claude-code-refactor.ast'
```

**文件**: `packages/workflow-run/src/index.ts`

```typescript
export * from './visitors/claude/claude-code.visitor'
export * from './visitors/claude/claude-code-review.visitor'
export * from './visitors/claude/claude-code-refactor.visitor'
```

---

## 4. 使用场景

### 场景 1: 微博代码片段审查

```
[微博搜索] → [提取代码片段] → [Claude 代码审查] → [保存结果]
```

### 场景 2: 项目文件分析

```
[读取文件列表] → [Claude Code(分析文件)] → [生成报告]
```

### 场景 3: 自动重构工作流

```
[读取代码] → [Claude 代码重构] → [写入文件] → [运行测试]
```

---

## 5. 环境配置

### 5.1 安装 Claude Code CLI

```bash
# 全局安装
npm install -g @anthropic-ai/claude-code

# 或项目依赖
pnpm add @anthropic-ai/claude-code
```

### 5.2 环境变量

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 5.3 验证安装

```bash
claude --version
```

---

## 6. 优势

1. **利用 CLI 完整能力**: ripgrep 搜索、tree-sitter 解析、文件操作
2. **无需重复开发**: 直接使用 Claude Code 的内置工具
3. **可视化编排**: 通过工作流节点拖拽使用
4. **与现有功能集成**: 可与微博采集、NLP 等节点组合

---

## 7. 实施计划

### Phase 1: 基础封装（1 天）
- ✅ 封装 ClaudeCodeService
- ✅ 实现基础 CLI 调用

### Phase 2: 核心节点（1-2 天）
- ⏳ ClaudeCodeAst 节点
- ⏳ ClaudeCodeReviewAst 节点
- ⏳ ClaudeCodeRefactorAst 节点

### Phase 3: 前端集成（1 天）
- ⏳ 节点 UI 组件
- ⏳ 工作流编辑器集成

### Phase 4: 测试（1 天）
- ⏳ 单元测试
- ⏳ 集成测试

---

## 8. 关键代码位置

```
packages/
├── workflow-ast/src/nodes/claude/
│   ├── claude-code.ast.ts
│   ├── claude-code-review.ast.ts
│   └── claude-code-refactor.ast.ts
└── workflow-run/src/
    ├── services/claude-code.service.ts
    └── visitors/claude/
        ├── claude-code.visitor.ts
        ├── claude-code-review.visitor.ts
        └── claude-code-refactor.visitor.ts
```

---

## 9. 注意事项

1. **CLI 依赖**: 需要全局或本地安装 `@anthropic-ai/claude-code`
2. **权限管理**: 使用 `--dangerously-skip-permissions` 跳过交互式权限确认
3. **进程开销**: 子进程调用有一定性能开销，适合非高频场景
4. **错误处理**: 需要处理 CLI 调用失败、超时等异常情况

---

## 实现列表 

@sker/workflow-ast 需实现节点定义
@sker/workflow-run 需实现服务端运行
@sker/workflow-browser 需实现浏览器运行
@sker/workflow-ui 需实现 前端UI，特殊设置使用@Setting
@sker/ui 需使用的通用组件

## 最佳实践

```ts
// 类型复用
import type { PromptSkillEntity, PromptSkillType, PromptResourceScope } from '@sker/entities';
```
分页使用： @sker/ui/components/ui/simple-pagination

- 选择器-统一使用 Dialog + Command 的方式实现
```tsx
// 标准选择器封装
<div>
   <label className="text-sm text-muted-foreground mb-2 block">选择技能</label>
   <div className="relative">
      <button
      onClick={() => setSkillSearchOpen(true)}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
      >
      <span className={selectedSkill ? '' : 'text-muted-foreground'}>
         {selectedSkill ? (
            <span>
            {selectedSkill.title}
            <span className="ml-2 text-xs text-muted-foreground">
               ({SKILL_TYPES.find(t => t.value === selectedSkill.type)?.label})
            </span>
            </span>
         ) : '点击选择技能...'}
      </span>
      <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
      </button>

      {/* Command 弹窗 */}
      <Dialog open={skillSearchOpen} onOpenChange={setSkillSearchOpen}>
      <DialogContent className="max-w-md p-0">
         <Command className="rounded-lg border">
            <CommandInput placeholder="搜索技能..." />
            <CommandList className="max-h-[400px]">
            <CommandEmpty>未找到技能</CommandEmpty>
            {SKILL_TYPES.map(type => {
               const skillsOfType = groupedAvailableSkills[type.value] || [];
               if (skillsOfType.length === 0) return null;

               return (
                  <CommandGroup key={type.value} heading={type.label}>
                  {skillsOfType.map(skill => (
                     <CommandItem
                        key={skill.id}
                        value={`${skill.title} ${skill.name}`}
                        onSelect={() => {
                        setBindForm({ ...bindForm, skill_id: skill.id });
                        setSkillSearchOpen(false);
                        }}
                        className="flex items-center justify-between"
                     >
                        <div className="flex-1">
                        <div className="font-medium">{skill.title}</div>
                        <div className="text-xs text-muted-foreground">{skill.name}</div>
                        {skill.description && (
                           <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {skill.description}
                           </div>
                        )}
                        </div>
                        {bindForm.skill_id === skill.id && (
                        <CheckIcon className="size-4 ml-2 shrink-0" />
                        )}
                     </CommandItem>
                  ))}
                  </CommandGroup>
               );
            })}
            </CommandList>
         </Command>
      </DialogContent>
      </Dialog>
   </div>
</div>
```

## 说明

1. 前端项目：apps\bigscreen 使用@sker/ui + @sker/sdk 组装成页面或业务组件 @sker/bigscreen
2. 后端接口：apps\api 实现@sker/sdk定义的Controller @sker/api
3. SDK封装：packages\sdk 定义接口输入输出格式 @sker/sdk
4. 组件封装：packages\ui（纯样式+布局）@sker/ui 
   1. @sker/ui/components/blocks 组装简单的组件为复杂组件
   2. @sker/ui/components/ui 简单组件
   3. @sker/ui/components/workflow 工作流组件
   4. @sker/ui/components/weibo 微博相关组件
   5. @sker/ui/components/mobile 手机端组件
   6. @sker/ui/components/editor 富文本编辑器组件
5. 数据库表结构：packages\entities 定义数据库表结构 @sker/entities

只实现用到的，不要有多余的代码，保持简单美