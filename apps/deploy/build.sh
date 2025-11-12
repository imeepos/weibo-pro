#!/bin/bash

set -e

REPO_PATH="${REPO_PATH:-/home/weibo-pro}"
BRANCH="${BRANCH:-main}"

echo "========================================"
echo "Weibo-Pro 自动化部署"
echo "========================================"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "仓库: $REPO_PATH"
echo "分支: $BRANCH"
echo ""

cd "$REPO_PATH"

echo "[1/5] 拉取最新代码..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "✓ 代码已更新至最新版本"
echo ""

echo "[2/5] 安装依赖..."
if command -v pnpm &> /dev/null; then
    pnpm install --frozen-lockfile
else
    npm install --frozen-lockfile
fi
echo "✓ 依赖安装完成"
echo ""

echo "[3/5] 执行构建..."
if command -v pnpm &> /dev/null; then
    pnpm run build
else
    npm run build
fi
echo "✓ 构建完成"
echo ""

echo "[4/5] 停止旧容器..."
docker compose down
echo "✓ 旧容器已停止"
echo ""

echo "[5/5] 启动新容器..."
docker compose up -d
echo "✓ 新容器已启动"
echo ""

echo "========================================"
echo "部署完成！"
echo "========================================"
echo "容器状态:"
docker compose ps
