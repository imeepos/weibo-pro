#!/bin/bash

# 端口守护者 - 优雅的端口冲突解决方案
# 存在即合理：每个端口都应该为当前开发服务

set -e

# 颜色定义：优雅的视觉反馈
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查端口占用情况
check_port_usage() {
    local port=$1

    # 使用netstat检查端口占用
    local result=$(netstat -tulpn 2>/dev/null | grep ":$port " || true)

    if [[ -n "$result" ]]; then
        # 提取进程ID
        local pid=$(echo "$result" | awk '{print $7}' | cut -d'/' -f1)
        local process_name=$(echo "$result" | awk '{print $7}' | cut -d'/' -f2)

        echo "$pid:$process_name"
    else
        echo ""
    fi
}

# 优雅地清理端口占用
clean_port() {
    local port=$1

    log_info "检查端口 $port 占用情况..."

    local usage_result=$(check_port_usage "$port")

    if [[ -n "$usage_result" ]]; then
        local pid=$(echo "$usage_result" | cut -d':' -f1)
        local process_name=$(echo "$usage_result" | cut -d':' -f2)

        log_warning "发现端口 $port 被进程占用: PID=$pid ($process_name)"

        # 确认是否为Node.js进程（开发服务器）
        if [[ "$process_name" == "node" ]]; then
            log_info "正在清理Node.js开发进程..."

            # 强制终止进程
            if kill -9 "$pid" 2>/dev/null; then
                log_success "成功清理端口 $port 占用 (PID: $pid)"
            else
                log_error "无法终止进程 $pid"
                return 1
            fi
        else
            log_warning "端口 $port 被非Node.js进程占用，跳过清理"
            return 1
        fi
    else
        log_success "端口 $port 可用"
    fi

    return 0
}

# 主要执行逻辑
main() {
    local ports=("3000" "3001" "3002")

    log_info "🔍 端口守护者开始工作..."

    for port in "${ports[@]}"; do
        if ! clean_port "$port"; then
            log_warning "端口 $port 清理失败，可能影响开发体验"
        fi
    done

    log_success "🎉 端口检查完成，可以开始开发了！"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi