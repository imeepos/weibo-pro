#!/bin/bash
set -e

echo "=== 更新 Bigscreen ==="

cd "$(dirname "$0")/.."

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull

# 2. 构建
echo "2. 构建应用..."
pnpm build:deps
pnpm turbo build --filter=@sker/bigscreen

# 3. 部署
echo "3. 部署静态文件..."
sudo cp -r apps/bigscreen/dist/* /var/www/bigscreen/

# 4. 重启 Nginx
echo "4. 重启 Nginx..."
sudo systemctl reload nginx

echo ""
echo "=== 更新完成 ==="
echo "访问地址: https://$(hostname -I | awk '{print $1}')"
