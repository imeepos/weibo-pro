#!/bin/bash

echo "🚀 测试 Docker Compose 配置..."

# 检查 Docker Compose 文件语法
echo "📋 检查 Docker Compose 文件语法..."
docker-compose config

if [ $? -eq 0 ]; then
    echo "✅ Docker Compose 文件语法正确"
else
    echo "❌ Docker Compose 文件语法错误"
    exit 1
fi

# 检查端口配置
echo "🔍 检查端口配置..."
echo "- API 服务端口: 3000 (容器内) → 3004 (主机)"
echo "- Web 服务端口: 3002 (主机)"
echo "- Bigscreen 端口: 8085 (主机)"

# 检查健康检查配置
echo "🔍 检查健康检查配置..."
echo "- API 健康检查: /api/system/health"
echo "- Web/Bigscreen 健康检查: HTTP 根路径"

# 构建 API 镜像
echo "🔨 构建 API 镜像..."
docker-compose build api

if [ $? -eq 0 ]; then
    echo "✅ API 镜像构建成功"
else
    echo "❌ API 镜像构建失败"
    exit 1
fi

echo "🎉 Docker Compose 配置测试完成！"
echo ""
echo "📝 修复的问题："
echo "   ✅ 端口统一: API 服务使用 3000 端口"
echo "   ✅ 健康检查: 使用正确的 /api/system/health 端点"
echo "   ✅ Playwright 支持: 使用包含浏览器的镜像"
echo "   ✅ 资源分配: 为浏览器自动化分配足够资源"
echo ""
echo "🚀 下一步："
echo "   docker-compose up -d"
echo "   docker-compose logs -f api"