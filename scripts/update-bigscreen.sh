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

# 4. 更新 Nginx 配置
echo "4. 更新 Nginx 配置..."
if [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/bigscreen.conf"
elif [ -d "/etc/nginx/conf.d" ]; then
    NGINX_CONFIG="/etc/nginx/conf.d/bigscreen.conf"
else
    echo "警告: 找不到 Nginx 配置目录，跳过配置更新"
    NGINX_CONFIG=""
fi

if [ -n "$NGINX_CONFIG" ]; then
    sudo cp scripts/nginx/bigscreen-ip.conf $NGINX_CONFIG
    echo "Nginx 配置已更新"
fi

# 5. 测试 Nginx 配置
echo "5. 测试 Nginx 配置..."
sudo nginx -t

# 6. 重启 Nginx
echo "6. 重启 Nginx..."
sudo systemctl reload nginx

echo ""
echo "=== 更新完成 ==="
echo "访问地址: https://$(hostname -I | awk '{print $1}')"
