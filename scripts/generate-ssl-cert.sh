#!/bin/bash
set -e

echo "=== 生成自签名 SSL 证书 ==="

# 获取服务器 IP
SERVER_IP=${1:-$(hostname -I | awk '{print $1}')}
echo "服务器 IP: $SERVER_IP"

# 创建 SSL 目录
sudo mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

# 生成私钥和证书（有效期 10 年）
sudo openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout bigscreen.key \
  -out bigscreen.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Sker/OU=IT/CN=$SERVER_IP" \
  -addext "subjectAltName=IP:$SERVER_IP"

# 设置权限
sudo chmod 600 bigscreen.key
sudo chmod 644 bigscreen.crt

echo "=== 证书生成完成 ==="
echo "证书位置: /etc/nginx/ssl/bigscreen.crt"
echo "私钥位置: /etc/nginx/ssl/bigscreen.key"
echo ""
echo "⚠️  浏览器访问时会显示证书警告，需要手动信任："
echo "   Chrome: 点击 '高级' -> '继续前往'"
echo "   Firefox: 点击 '高级' -> '接受风险并继续'"
