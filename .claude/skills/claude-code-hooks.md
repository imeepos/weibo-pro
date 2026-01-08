---
name: claude-code-hooks
description: Claude Code Hooks 最佳实践和常见模式。当需要创建或修改 hooks 时使用此 skill。
---

# Claude Code Hooks 最佳实践

## 一、Hook 基础概念

### 1.1 Hook 类型
- **Command-based hooks**: 执行 bash 命令
- **Prompt-based hooks**: 使用 LLM 进行智能决策

### 1.2 Hook 事件类型
- `PreToolUse`: 工具执行前
- `PostToolUse`: 工具执行后
- `Stop`: Claude 完成响应时
- `SubagentStop`: 子代理完成时
- `SessionStart/SessionEnd`: 会话开始/结束
- `UserPromptSubmit`: 用户提交提示时
- `PreCompact`: 压缩上下文前
- `Notification`: 通知事件

### 1.3 通信机制
- 通过 **stdin** 接收 JSON 数据
- 通过 **exit code** 和 **stdout/stderr** 返回结果

## 二、标准输出格式

### 2.1 有效的 decision 值

只有以下三种有效值：

```javascript
// 1. 阻止执行（会反馈给 Claude 重新规划）
{
  "decision": "block",
  "reason": "具体原因 - 会被 Claude 看到并用于重新规划",
  "continue": false  // 必须是 false
}

// 2. 批准执行
{
  "decision": "approve",
  "reason": "批准原因 - 显示给用户"
}

// 3. 允许现有流程继续（不输出 JSON 或省略 decision）
// 直接 console.log() 输出信息，然后 process.exit(0)
```

### 2.2 退出码含义

| 退出码 | 含义 | stderr 处理 | 用途 |
|--------|------|-----------|------|
| **0** | 成功 | 忽略 | 正常完成 |
| **2** | 阻止错误 | 反馈给 Claude | 需要 Claude 重新规划 |
| **其他非零** | 非阻止错误 | 显示给用户 | Hook 失败但不影响执行 |

## 三、常见错误

### ❌ 错误 1：矛盾的输出格式
```javascript
// 错误：decision: 'block' 配合 continue: true 是矛盾的
outputJson({
  decision: 'block',
  reason: '类型检查失败',
  continue: true  // ❌ 应该是 false
});
```

### ❌ 错误 2：无效的 decision 值
```javascript
// 错误：'continue' 不是有效的 decision 值
outputJson({
  decision: 'continue',  // ❌ 无效
  reason: '继续执行'
});
```

### ✅ 正确做法
```javascript
// 如果想让 Claude 继续工作，直接输出消息
console.log('提示：检测到未提交的变更');
process.exit(0);  // 成功退出，Claude 继续
```

## 四、社区常见模式

### 4.1 质量检查门卫（Quality Gate）
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

function exec(command) {
  return execSync(command, { encoding: 'utf8', stdio: 'inherit' });
}

try {
  exec('pnpm check-types');
  exec('pnpm lint');
  process.exit(0);  // 通过
} catch (error) {
  console.error(JSON.stringify({
    decision: 'block',
    reason: '代码质量检查失败，请修复后再继续',
    continue: false
  }));
  process.exit(2);  // 阻止
}
```

### 4.2 自动修复 + 提交
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

function exec(command, options = {}) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
    ...options
  });
}

// 自动格式化
exec('pnpm format');

// 检查是否有变更
const status = exec('git status --porcelain', { silent: true });

if (status && status.trim()) {
  exec('git add .');
  exec('git commit -m "chore: auto format by hook"');
  console.log('已自动提交格式化变更');
}

process.exit(0);
```

### 4.3 条件性阻止
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) return null;
    throw error;
  }
}

// 检查是否有未解决的 TODO
const todos = exec('git grep -n "TODO\\|FIXME" 2>&1', {
  ignoreError: true,
  silent: true
});

if (todos && todos.includes('FIXME')) {
  console.error(JSON.stringify({
    decision: 'block',
    reason: '代码中存在 FIXME 标记，请先解决',
    continue: false
  }));
  process.exit(2);
}

console.log('检查通过');
process.exit(0);
```

## 五、Stop Hook 最佳实践

### 5.1 推荐的 Stop Hook 结构
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) return null;
    throw error;
  }
}

function outputJson(data) {
  console.log(JSON.stringify(data));
}

function main() {
  try {
    // 步骤 1: 运行检查
    console.log('>>> 运行代码检查...');
    try {
      exec('pnpm check-types');
      exec('pnpm lint');
    } catch (error) {
      outputJson({
        decision: 'block',
        reason: '代码检查失败，请修复后再停止',
        continue: false
      });
      process.exit(2);
    }

    // 步骤 2: 检查变更
    console.log('>>> 检查变更...');
    const gitStatus = exec('git status --porcelain', { silent: true });

    if (gitStatus && gitStatus.trim()) {
      // 检查是否刚刚自动提交过
      const lastCommit = exec('git log -1 --pretty=%B', {
        silent: true,
        ignoreError: true
      });

      if (lastCommit && lastCommit.includes('auto commit by hook')) {
        console.log('>>> 检测到刚刚已自动提交，跳过');
        process.exit(0);
      }

      // 提示有未提交的变更（不阻止）
      console.log('提示：检测到未提交的变更，建议提交代码');
      process.exit(0);
    }

    console.log('>>> 所有检查通过');
    process.exit(0);

  } catch (error) {
    console.error('Hook 执行出错:', error.message);
    process.exit(1);
  }
}

main();
```

## 六、调试技巧

### 6.1 测试 Hook
```bash
# 手动测试 hook
node .claude/hooks/before-stop.js

# 查看退出码
echo $?  # Linux/Mac
echo %ERRORLEVEL%  # Windows
```

### 6.2 Hook 日志
```javascript
// 在 hook 中添加日志
const fs = require('fs');
const logFile = '.claude/hooks/debug.log';

function log(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
}

log('Hook started');
// ... 你的代码
log('Hook finished');
```

## 七、注意事项

1. **不要过度使用 block** - 只在真正需要 Claude 重新规划时使用
2. **提供清晰的 reason** - Claude 会根据 reason 重新规划
3. **避免长时间运行** - Hook 应该快速完成
4. **处理错误** - 使用 try-catch 避免 hook 崩溃
5. **测试 hook** - 在实际使用前手动测试
6. **记录日志** - 方便调试问题

## 八、参考资源

- Claude Code 官方文档
- 社区 hooks 示例
- 本项目的 `.claude/hooks/before-stop.js`
