#!/bin/bash

# 优雅的开发启动器 - 集成端口守护者
# 存在即合理：开发前确保环境纯净

set -e

# 颜色定义
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}🚀 优雅的开发启动器开始工作...${NC}"

# 首先运行端口守护者
echo -e "${BLUE}🛡️  启动端口守护者...${NC}"
./scripts/port-guardian.sh

# 等待端口清理完成
echo -e "${BLUE}⏳ 等待端口清理完成...${NC}"
sleep 2

# 启动开发服务器
echo -e "${BLUE}🎯 启动开发服务器...${NC}"
pnpm run dev

echo -e "${GREEN}✨ 开发环境已优雅启动！${NC}"