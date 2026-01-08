#!/bin/bash
set -euo pipefail

# Claude Code Stop Hook - 类型检查 + 单元测试后提交代码
# 每次 Claude 响应结束时触发

echo ">>> [1/3] 运行类型检查..."
pnpm check-types

if [ $? -ne 0 ]; then
    jq -n '{
        decision: "block",
        reason: "类型检查失败，请修复后再停止",
        continue: true
    }'
    exit 2
fi

echo ">>> 类型检查通过"

echo ">>> [2/3] 运行单元测试..."
pnpm turbo run test 2>/dev/null || pnpm test 2>/dev/null || echo "无测试任务，跳过"

echo ">>> [3/3] 提交代码..."

# 检查是否有变更
if [ -z "$(git status --porcelain)" ]; then
    echo "无变更需要提交"
    exit 0
fi

# 添加所有变更并提交
git add -A
git commit -m "$(cat <<'EOF'
chore: auto commit by before-stop hook

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

exit 0
