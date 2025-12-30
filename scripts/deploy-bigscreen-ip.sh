#!/bin/bash
set -e

echo "=== Bigscreen IP 部署脚本 ==="

# 配置变量
SERVER_IP=${1:-$(hostname -I | awk '{print $1}')}
DEPLOY_DIR="/var/www/bigscreen"

# 检测 Nginx 配置目录
if [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/bigscreen.conf"
    NGINX_ENABLED="/etc/nginx/sites-enabled/bigscreen.conf"
elif [ -d "/etc/nginx/conf.d" ]; then
    NGINX_CONFIG="/etc/nginx/conf.d/bigscreen.conf"
    NGINX_ENABLED=""
else
    echo "错误: 找不到 Nginx 配置目录"
    exit 1
fi

echo "服务器 IP: $SERVER_IP"

# 1. 构建应用
echo "1. 构建应用..."
cd "$(dirname "$0")/.."
pnpm build:deps
pnpm turbo build --filter=@sker/bigscreen

# 2. 生成自签名证书
echo "2. 生成自签名证书..."
bash scripts/generate-ssl-cert.sh "$SERVER_IP"

# 3. 部署静态文件
echo "3. 部署静态文件..."
sudo mkdir -p $DEPLOY_DIR
sudo cp -r apps/bigscreen/dist/* $DEPLOY_DIR/
sudo chown -R www-data:www-data $DEPLOY_DIR

# 4. 配置 Nginx
echo "4. 配置 Nginx..."
sudo cp scripts/nginx/bigscreen-ip.conf $NGINX_CONFIG
if [ -n "$NGINX_ENABLED" ]; then
    sudo ln -sf $NGINX_CONFIG $NGINX_ENABLED
fi

# 5. 测试 Nginx 配置
echo "5. 测试 Nginx 配置..."
sudo nginx -t

# 6. 重启 Nginx
echo "6. 重启 Nginx..."
sudo systemctl reload nginx

echo ""
echo "=== 部署完成 ==="
echo "访问地址: https://$SERVER_IP"
echo ""
echo "⚠️  首次访问会显示证书警告，这是正常的（自签名证书）"
echo "   请在浏览器中手动信任证书："
echo "   - Chrome: 点击 '高级' -> '继续前往 $SERVER_IP (不安全)'"
echo "   - Firefox: 点击 '高级' -> '接受风险并继续'"
echo ""
echo "检查服务状态："
echo "  sudo systemctl status nginx"
echo "  sudo tail -f /var/log/nginx/error.log"
