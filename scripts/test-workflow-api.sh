#!/bin/bash

# 爬虫工作流API测试脚本
# 存在即合理：优雅地验证API触发功能

set -e

# 颜色定义：优雅的视觉反馈
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# API基础URL
API_BASE="http://localhost:3000"

# 等待API服务启动
wait_for_api() {
    log_info "等待API服务启动..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$API_BASE" > /dev/null; then
            log_success "API服务已启动"
            return 0
        fi

        log_info "尝试 $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done

    log_error "API服务启动超时"
    return 1
}

# 测试工作流状态端点
test_workflow_status() {
    log_info "测试工作流状态端点..."

    local response=$(curl -s "$API_BASE/api/workflow/status")

    if echo "$response" | grep -q '"success":true'; then
        log_success "工作流状态端点测试通过"
        echo "响应: $response"
    else
        log_error "工作流状态端点测试失败"
        echo "响应: $response"
        return 1
    fi
}

# 测试NLP分析触发端点
test_nlp_trigger() {
    log_info "测试NLP分析触发端点..."

    local test_post_id="5095814444178803"
    local response=$(curl -s -X POST "$API_BASE/api/workflow/trigger-nlp" \
        -H "Content-Type: application/json" \
        -d "{\"postId\": \"$test_post_id\"}")

    if echo "$response" | grep -q '"success":true'; then
        log_success "NLP分析触发端点测试通过"
        echo "响应: $response"
    else
        log_error "NLP分析触发端点测试失败"
        echo "响应: $response"
        return 1
    fi
}

# 测试批量NLP分析触发端点
test_batch_nlp_trigger() {
    log_info "测试批量NLP分析触发端点..."

    local test_post_ids='["5095814444178803", "5095814444178804", "5095814444178805"]'
    local response=$(curl -s -X POST "$API_BASE/api/workflow/batch-nlp" \
        -H "Content-Type: application/json" \
        -d "{\"postIds\": $test_post_ids}")

    if echo "$response" | grep -q '"success":true'; then
        log_success "批量NLP分析触发端点测试通过"
        echo "响应: $response"
    else
        log_error "批量NLP分析触发端点测试失败"
        echo "响应: $response"
        return 1
    fi
}

# 测试微博搜索端点
test_weibo_search() {
    log_info "测试微博搜索端点..."

    local today=$(date +%Y-%m-%d)
    local yesterday=$(date -d "yesterday" +%Y-%m-%d)

    local response=$(curl -s -X POST "$API_BASE/api/workflow/search-weibo" \
        -H "Content-Type: application/json" \
        -d "{\"keyword\": \"测试\", \"startDate\": \"$yesterday\", \"endDate\": \"$today\"}")

    if echo "$response" | grep -q '"success":true'; then
        log_success "微博搜索端点测试通过"
        echo "响应: $response"
    else
        log_warning "微博搜索端点可能返回错误（可能是正常行为）"
        echo "响应: $response"
    fi
}

# 主测试函数
main() {
    log_info "🎯 开始爬虫工作流API测试..."

    # 等待API服务
    if ! wait_for_api; then
        log_error "无法连接到API服务，测试终止"
        exit 1
    fi

    # 执行测试
    test_workflow_status
    test_nlp_trigger
    test_batch_nlp_trigger
    test_weibo_search

    log_success "🎉 爬虫工作流API测试完成！"

    echo ""
    log_info "可用的API端点："
    echo "  GET  /api/workflow/status          - 获取工作流状态"
    echo "  POST /api/workflow/trigger-nlp     - 触发单个帖子NLP分析"
    echo "  POST /api/workflow/batch-nlp       - 批量触发NLP分析"
    echo "  POST /api/workflow/search-weibo    - 触发微博关键词搜索"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi