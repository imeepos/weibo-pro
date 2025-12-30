# Bigscreen IP 部署方案

使用自签名 SSL 证书，通过 IP 地址直接访问。

## 快速部署

```bash
# 1. 赋予执行权限
chmod +x scripts/*.sh

# 2. 执行部署（自动检测服务器 IP）
./scripts/deploy-bigscreen-ip.sh

# 或指定 IP 地址
./scripts/deploy-bigscreen-ip.sh 192.168.1.100
```

## 后续更新

```bash
./scripts/update-bigscreen.sh
```

## 证书说明

使用自签名证书，浏览器会显示安全警告，需要手动信任：

- **Chrome**: 点击 "高级" -> "继续前往 (不安全)"
- **Firefox**: 点击 "高级" -> "接受风险并继续"
- **Edge**: 点击 "高级" -> "继续前往"

## 文件说明

- `scripts/nginx/bigscreen-ip.conf` - Nginx 配置（基于 IP）
- `scripts/generate-ssl-cert.sh` - 生成自签名证书
- `scripts/deploy-bigscreen-ip.sh` - 首次部署脚本
- `scripts/update-bigscreen.sh` - 更新部署脚本

## 故障排查

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 测试配置
sudo nginx -t

# 检查端口
sudo netstat -tlnp | grep -E ':(80|443|8089)'

# 重新生成证书
./scripts/generate-ssl-cert.sh
```

## 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```
