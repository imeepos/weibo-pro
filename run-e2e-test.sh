#!/bin/bash

# 端到端测试启动脚本

set -e

echo "🔍 检查服务状态..."
echo ""

# 检查 RabbitMQ
echo "1️⃣ 检查 RabbitMQ..."
if curl -s http://localhost:15672 > /dev/null 2>&1; then
  echo "   ✅ RabbitMQ 正在运行"
else
  echo "   ❌ RabbitMQ 未运行"
  echo "   💡 启动命令: docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management"
  echo ""
  echo "   或者使用已存在的容器:"
  echo "   docker start rabbitmq"
  echo ""
  exit 1
fi

# 检查 API 服务器
echo ""
echo "2️⃣ 检查 API 服务器..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "   ✅ API 服务器正在运行 (端口 3000)"
else
  echo "   ❌ API 服务器未运行"
  echo "   💡 在新终端运行: turbo dev --filter=@sker/api"
  echo ""
  exit 1
fi

# 检查 CLI daemon
echo ""
echo "3️⃣ 检查 CLI daemon..."
CLI_PID_FILE="$HOME/.sker/pids/daemon.pid"
if [ -f "$CLI_PID_FILE" ]; then
  CLI_PID=$(cat "$CLI_PID_FILE")
  if ps -p "$CLI_PID" > /dev/null 2>&1; then
    echo "   ✅ CLI daemon 正在运行 (PID: $CLI_PID)"
  else
    echo "   ⚠️  PID 文件存在但进程不存在"
    echo "   💡 在新终端运行: cd packages/cli && pnpm dev"
    echo ""
    exit 1
  fi
else
  echo "   ❌ CLI daemon 未运行"
  echo "   💡 在新终端运行: cd packages/cli && pnpm dev"
  echo ""
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ 所有服务已就绪！开始端到端测试..."
echo "═══════════════════════════════════════════════════════════"
echo ""

# 运行端到端测试
npx tsx test-e2e.ts
