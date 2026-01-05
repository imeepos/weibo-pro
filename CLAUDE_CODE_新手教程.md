# Claude Code 新手完全指南 🚀

> 这是一份为完全新手准备的 Claude Code 中文教程，基于官方示例项目学习整理。

## 目录

1. [什么是 Claude Code？](#什么是-claude-code)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [基础使用](#基础使用)
5. [插件系统](#插件系统)
6. [实战案例](#实战案例)
7. [常见问题](#常见问题)

---

## 什么是 Claude Code？

Claude Code 是 Anthropic 官方推出的 **AI 编程助手命令行工具**，它可以：

- ✅ **理解你的代码库** - 自动分析项目结构和代码逻辑
- ✅ **执行日常任务** - 通过自然语言命令完成编程工作
- ✅ **处理 Git 工作流** - 自动提交、推送、创建 PR
- ✅ **智能代码审查** - 多维度分析代码质量和潜在问题
- ✅ **可扩展插件** - 通过插件系统自定义功能

### 为什么选择 Claude Code？

传统编程方式：
```
你 → 写代码 → 调试 → 提交 → 审查 → 部署
```

使用 Claude Code：
```
你 → 用自然语言描述需求 → Claude 自动完成所有步骤
```

---

## 快速开始

### 1. 安装 Claude Code

根据你的操作系统选择安装方式：

**Windows（推荐）：**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**MacOS/Linux：**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**使用 Homebrew（MacOS）：**
```bash
brew install --cask claude-code
```

**使用 NPM（需要 Node.js 18+）：**
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. 验证安装

打开终端，输入：
```bash
claude --version
```

如果显示版本号，说明安装成功！

### 3. 第一次使用

进入你的项目目录：
```bash
cd your-project-folder
claude
```

Claude Code 会启动交互式会话，你可以开始用自然语言与它对话了！

---

## 核心概念

### 1. 命令（Commands）

命令是以 `/` 开头的快捷指令，用于执行特定任务。

**常用命令：**
- `/commit` - 自动生成提交信息并提交代码
- `/commit-push-pr` - 提交、推送并创建 PR（一条龙服务）
- `/help` - 查看帮助文档
- `/bug` - 报告问题

**示例：**
```bash
# 在 Claude Code 会话中输入
/commit
```

### 2. 智能体（Agents）

智能体是专门执行特定任务的 AI 助手，每个智能体都有自己的专长。

**官方提供的智能体类型：**
- `code-explorer` - 深度分析代码库，追踪执行路径
- `code-architect` - 设计架构方案，提供多种实现选择
- `code-reviewer` - 代码审查，检查 bug 和质量问题
- `agent-sdk-verifier` - 验证 Agent SDK 应用的最佳实践

### 3. 技能（Skills）

技能是可以被自动调用的专业能力模块，当你的请求匹配特定场景时会自动触发。

**示例技能：**
- `frontend-design` - 前端设计指导
- `claude-opus-4-5-migration` - 模型迁移
- `writing-rules` - Hookify 规则编写指导

### 4. 钩子（Hooks）

钩子是在特定事件发生时自动执行的脚本，用于自定义 Claude Code 的行为。

**钩子类型：**
- `SessionStart` - 会话开始时触发
- `PreToolUse` - 工具使用前触发
- `Stop` - 停止操作时触发

### 5. 插件（Plugins）

插件是打包好的功能扩展，可以包含命令、智能体、技能和钩子的组合。

---

## 基础使用

### 场景 1：自动提交代码

**传统方式：**
```bash
git status
git add .
git commit -m "feat: add user authentication"
git push
```

**使用 Claude Code：**
```bash
# 在 Claude Code 会话中
/commit
```

Claude 会：
1. 分析你的代码变更
2. 查看最近的提交记录，学习你的提交风格
3. 自动生成符合规范的提交信息
4. 暂存文件并提交

### 场景 2：创建 Pull Request

**传统方式：**
```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# 然后去 GitHub 网页创建 PR，填写描述...
```

**使用 Claude Code：**
```bash
/commit-push-pr
```

Claude 会：
1. 创建新分支（如果需要）
2. 提交所有变更
3. 推送到远程仓库
4. 自动创建 PR，包含：
   - 变更摘要（1-3 个要点）
   - 测试计划清单
   - 完整的 PR 描述
5. 返回 PR 链接

### 场景 3：用自然语言编程

你可以直接用中文或英文描述需求：

```
你：帮我写一个函数，计算两个日期之间的天数差

Claude：好的，我来为你创建这个函数...
[自动生成代码]

你：能加上参数验证吗？

Claude：当然，我来添加参数验证...
[自动修改代码]
```

### 场景 4：代码审查

```
你：帮我审查一下 src/auth/login.ts 这个文件

Claude：我来启动代码审查智能体...
[分析代码]

发现以下问题：
1. [高优先级] 缺少错误处理（第 45 行）
2. [中优先级] 可以简化登录逻辑（第 67 行）
3. [低优先级] 建议提取配置验证

你想现在修复这些问题吗？
```

---

## 插件系统

### 什么是插件?

插件是 Claude Code 的扩展包，可以添加新的命令、智能体、技能和钩子。官方提供了 15+ 个插件示例。

### 插件结构

每个插件都遵循标准结构：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 插件元数据（名称、版本、描述）
├── commands/                # 斜杠命令（可选）
│   └── my-command.md
├── agents/                  # 专用智能体（可选）
│   └── my-agent.md
├── skills/                  # 技能模块（可选）
│   └── my-skill.md
├── hooks/                   # 事件钩子（可选）
│   └── my-hook.sh
├── .mcp.json                # 外部工具配置（可选）
└── README.md                # 插件文档
```

### 官方推荐插件

#### 1. **commit-commands** - Git 工作流自动化

**包含命令：**
- `/commit` - 自动提交
- `/commit-push-pr` - 提交+推送+创建PR
- `/clean_gone` - 清理已删除的远程分支

**适合场景：** 日常开发，频繁提交代码

#### 2. **feature-dev** - 功能开发工作流

**包含命令：**
- `/feature-dev` - 启动 7 阶段开发流程

**7 个阶段：**
1. **发现阶段** - 明确需求
2. **代码探索** - 分析现有代码
3. **提问澄清** - 解决所有歧义
4. **架构设计** - 提供多种方案选择
5. **实现阶段** - 编写代码
6. **质量审查** - 多维度代码审查
7. **总结阶段** - 文档化成果

**适合场景：** 开发复杂新功能，需要系统化规划

#### 3. **code-review** - 自动化 PR 审查

**包含命令：**
- `/code-review` - 启动多智能体并行审查

**审查维度：**
- CLAUDE.md 合规性检查
- Bug 检测
- 历史上下文分析
- PR 历史记录
- 代码注释质量

**特色：** 使用置信度评分过滤误报（只报告高置信度问题）

**适合场景：** PR 提交前的质量把关

#### 4. **pr-review-toolkit** - 专业 PR 审查工具包

**包含命令：**
- `/pr-review-toolkit:review-pr [aspects]`

**可选审查方面：**
- `comments` - 注释分析
- `tests` - 测试覆盖
- `errors` - 错误处理
- `types` - 类型设计
- `code` - 代码质量
- `simplify` - 简化建议
- `all` - 全面审查

**适合场景：** 针对性审查特定方面

#### 5. **frontend-design** - 前端设计指导

**包含技能：**
- `frontend-design` - 自动触发的前端设计指导

**提供指导：**
- 避免通用 AI 美学
- 大胆的设计选择
- 排版和动画
- 视觉细节

**适合场景：** 前端 UI 开发，追求独特设计

#### 6. **hookify** - 自定义行为拦截

**包含命令：**
- `/hookify` - 创建自定义钩子
- `/hookify:list` - 列出所有钩子
- `/hookify:configure` - 配置钩子
- `/hookify:help` - 帮助文档

**用途：** 防止不想要的行为（如自动创建文档、过度使用 emoji 等）

**适合场景：** 定制 Claude Code 行为

#### 7. **ralph-wiggum** - 自引用迭代循环

**包含命令：**
- `/ralph-loop` - 启动自主迭代
- `/cancel-ralph` - 停止迭代

**工作原理：** Claude 反复执行同一任务直到完成

**适合场景：** 需要多次迭代优化的任务

#### 8. **plugin-dev** - 插件开发工具包

**包含命令：**
- `/plugin-dev:create-plugin` - 8 阶段插件创建向导

**包含技能：**
- Hook 开发
- MCP 集成
- 插件结构设计
- 设置配置
- 命令开发
- 智能体开发
- 技能开发

**适合场景：** 开发自己的 Claude Code 插件

---

## 实战案例

### 案例 1：开发一个用户认证功能（完整流程）

#### 第一步：启动功能开发工作流

```bash
/feature-dev 添加 OAuth 用户认证
```

#### 第二步：回答澄清问题

Claude 会问：
```
1. OAuth 提供商：使用哪些？（Google、GitHub、自定义？）
2. 用户数据：存储 OAuth tokens 还是只存用户信息？
3. 现有认证：替换现有认证还是并存？
4. 会话管理：如何集成到现有会话系统？
5. 错误处理：OAuth 失败时如何处理？
```

你回答：
```
1. 使用 Google 和 GitHub
2. 只存用户信息，不存 token
3. 与现有认证并存
4. 集成到现有 Redis 会话
5. 显示友好错误信息并回退到登录页
```

#### 第三步：选择架构方案

Claude 提供 3 种方案：
```
方案 1：最小改动（快速但耦合）
方案 2：清洁架构（解耦但改动大）
方案 3：实用平衡（推荐）✅
```

你选择：**方案 3**

#### 第四步：实现

Claude 开始实现：
```
✅ 创建 OAuthProvider.ts
✅ 修改 AuthService.ts
✅ 更新路由 auth.ts
✅ 添加中间件 oauthMiddleware.ts
```

#### 第五步：代码审查

Claude 启动 3 个审查智能体：
```
发现问题：
1. [高] OAuth 回调缺少错误处理
2. [中] 可以简化 token 刷新逻辑

是否现在修复？
```

你选择：**现在修复**

#### 第六步：完成

```
✅ 功能开发完成！

文件变更：
- src/auth/OAuthProvider.ts (新建)
- src/auth/AuthService.ts (修改)
- src/routes/auth.ts (修改)

建议下一步：
- 添加单元测试
- 更新 API 文档
```

---

### 案例 2：快速修复 Bug

**场景：** 用户报告登录页面崩溃

```bash
# 在 Claude Code 会话中

你：登录页面报错了，帮我看看 src/pages/Login.tsx

Claude：让我读取这个文件...
[分析代码]

发现问题：第 34 行，user 可能为 null 时访问了 user.name
这是一个空指针异常。

建议修复：
1. 添加可选链：user?.name
2. 添加空值检查：if (user) { ... }

你想让我修复吗？

你：修复吧

Claude：好的，我来修复...
[修改代码]

✅ 已修复！使用了可选链操作符。
是否要我提交这个修复？

你：/commit

Claude：好的，正在提交...
✅ 已提交：fix: add null check for user in Login component
```

---

### 案例 3：创建 Pull Request

**场景：** 完成功能开发，准备提交 PR

```bash
你：/commit-push-pr

Claude：好的，让我检查你的更改...

📊 检测到变更：
- 5 个文件修改
- 3 个新文件
- 总共 +234 -12 行

分析提交历史...
准备创建 PR...

✅ PR 创建成功！

标题：feat: Add OAuth authentication support

摘要：
• Implement OAuth provider abstraction for Google and GitHub
• Integrate with existing session management
• Add OAuth error handling and fallback

测试计划：
- [ ] 测试 Google OAuth 登录流程
- [ ] 测试 GitHub OAuth 登录流程
- [ ] 验证错误处理和回退
- [ ] 确认会话持久化

PR 链接：https://github.com/your-repo/pull/123

你：太棒了！
```

---

### 案例 4：定制 Claude Code 行为

**场景：** 不希望 Claude 自动创建 README 文件

```bash
你：/hookify

Claude：我来帮你创建自定义钩子。
你想防止什么行为？

你：不要自动创建 README 文件

Claude：好的，我来分析对话模式...

创建钩子规则：
- 事件：PreToolUse (Write 工具)
- 条件：文件路径包含 "README"
- 动作：阻止并提示用户

钩子已创建！路径：.claude/hooks/prevent-readme.sh

测试：我现在会在创建 README 前询问你。
```

---

## 常见问题

### Q1: Claude Code 免费吗？

**A:** Claude Code 本身免费，但需要 Anthropic API key。使用会消耗 API 额度，按实际使用的 token 数量计费。

### Q2: 如何获取 API key？

**A:**
1. 访问 https://console.anthropic.com
2. 注册/登录账号
3. 在 "API Keys" 页面创建新 key
4. 在 Claude Code 首次运行时输入 API key

### Q3: Claude Code 会读取我的所有代码吗？

**A:** Claude Code 只读取与当前任务相关的文件。你可以：
- 使用 `.gitignore` 排除敏感文件
- 在 `.claude/settings.json` 配置排除规则
- 查看每次文件读取的详细日志

### Q4: 如何安装插件？

**A:** 三种方式：

**方式 1：使用命令（推荐）**
```bash
# 在 Claude Code 会话中
/plugin install <plugin-name>
```

**方式 2：手动配置**
```json
// .claude/settings.json
{
  "plugins": [
    "commit-commands",
    "feature-dev"
  ]
}
```

**方式 3：本地插件**
```bash
# 将插件文件夹放到项目的 plugins/ 目录
plugins/
  └── my-custom-plugin/
```

### Q5: 如何查看所有可用命令？

```bash
# 在 Claude Code 会话中
/help
```

### Q6: 代码审查会自动修复问题吗？

**A:** 不会。Claude Code 会：
1. 识别问题
2. 展示问题列表
3. **询问你是否要修复**
4. 根据你的选择执行

你始终掌控决策权。

### Q7: 如何停止正在运行的任务？

按 `Ctrl+C` 可以随时中断当前任务。

### Q8: Claude Code 支持哪些语言？

支持所有主流编程语言：
- JavaScript/TypeScript
- Python
- Java/Kotlin
- Go
- Rust
- C/C++
- Ruby
- PHP
- 等等...

### Q9: 可以用中文交流吗？

**完全可以！** Claude Code 支持多语言自然对话，包括中文。

### Q10: 如何升级 Claude Code？

```bash
# NPM 安装的用户
npm update -g @anthropic-ai/claude-code

# Homebrew 用户（MacOS）
brew upgrade claude-code

# Windows 用户
# 重新运行安装脚本即可
irm https://claude.ai/install.ps1 | iex
```

---

## 进阶技巧

### 技巧 1：组合使用命令

```bash
# 场景：开发完功能，审查后提交 PR

你：/feature-dev 添加搜索功能
[完成开发]

你：/code-review
[审查通过]

你：/commit-push-pr
[创建 PR]
```

### 技巧 2：自定义项目指令

在项目根目录创建 `CLAUDE.md` 文件：

```markdown
# 项目指令

## 代码风格
- 使用 TypeScript strict 模式
- 所有函数必须有 JSDoc 注释
- 优先使用函数式编程

## API 开发规范
- 遵循 RESTful 设计
- 使用 Zod 进行参数验证
- 错误返回统一格式

## 测试要求
- 新功能必须有单元测试
- 测试覆盖率不低于 80%
```

Claude Code 会自动读取并遵守这些规范！

### 技巧 3：并行运行多个智能体

```bash
你：同时启动 code-explorer 分析认证模块，
   和 code-architect 设计缓存层

Claude：好的，我来并行启动两个智能体...
[同时运行两个任务，节省时间]
```

### 技巧 4：利用上下文记忆

Claude Code 会记住对话历史：

```bash
你：帮我写一个用户注册函数

Claude：[生成代码]

你：现在加上邮箱验证

Claude：好的，我会在刚才的函数基础上添加邮箱验证...
[自动关联上下文]
```

### 技巧 5：查看详细执行日志

```bash
# 启动时添加 verbose 标志
claude --verbose

# 或在会话中
/debug on
```

---

## 最佳实践

### ✅ 推荐做法

1. **明确描述需求** - 提供详细上下文，避免歧义
   ```
   ❌ 不好：帮我加个缓存
   ✅ 好：为用户信息 API 添加 Redis 缓存，过期时间 1 小时
   ```

2. **使用工作流命令** - 复杂功能用 `/feature-dev`，简单修改直接描述
   ```
   复杂功能 → /feature-dev
   简单修改 → 直接对话
   ```

3. **创建 CLAUDE.md** - 在项目中定义代码规范和偏好

4. **定期审查代码** - 使用 `/code-review` 或 `/pr-review-toolkit`

5. **善用插件** - 根据工作流选择合适的插件

### ❌ 避免做法

1. **过于笼统的请求** - "优化代码"、"修复问题"（没有指明具体问题）

2. **跳过审查直接提交** - 总是先审查，再提交

3. **忽略澄清问题** - Claude 提问时，认真回答

4. **一次性要求太多** - 拆分成小任务，逐步完成

---

## 总结

Claude Code 是一个强大的 AI 编程助手，它可以：

- 🚀 **提高效率** - 自动化重复性任务
- 🧠 **智能理解** - 深度分析代码库
- 🔧 **灵活扩展** - 丰富的插件生态
- 🤝 **协同工作** - 多智能体并行协作

### 学习路径建议

**新手阶段（1-2 天）：**
1. 熟悉基本命令：`/commit`、`/help`
2. 尝试自然语言对话编程
3. 了解核心概念：命令、智能体、插件

**进阶阶段（1 周）：**
1. 使用 `/feature-dev` 开发功能
2. 安装和使用官方插件
3. 配置 CLAUDE.md 项目指令

**高级阶段（1 个月+）：**
1. 创建自定义插件
2. 编写自定义钩子
3. 定制工作流和最佳实践

### 有用的资源

- 📚 [官方文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- 💬 [Discord 社区](https://anthropic.com/discord)
- 🐛 [问题反馈](https://github.com/anthropics/claude-code/issues)
- 📦 [插件市场](https://docs.claude.com/en/docs/claude-code/plugins)

---

**祝你使用 Claude Code 愉快！** 🎉

如果有任何问题，随时在 Claude Code 会话中输入 `/help` 或访问官方文档。

---

*本教程由 Claude Code 社区贡献者编写，基于官方示例项目分析整理。*
*最后更新：2026-01-05*
