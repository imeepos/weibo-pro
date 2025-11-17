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
echo "📝 下一步："
echo "   docker-compose up -d"
echo "   docker-compose logs -f api"