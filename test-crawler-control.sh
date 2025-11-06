#!/bin/bash
# 爬虫控制面板功能测试脚本

echo "=========================================="
echo "  爬虫任务控制面板功能测试"
echo "=========================================="
echo ""

API_BASE_URL="http://localhost:3000/api/workflow"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    echo -e "${YELLOW}测试: $name${NC}"
    echo "端点: $method $endpoint"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
        echo "响应: $(echo $body | jq . 2>/dev/null || echo $body)"
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "响应: $body"
    fi
    echo ""
}

# 1. 测试工作流状态查询
test_api "获取工作流状态" "GET" "/status" ""

# 2. 测试触发 NLP 分析（使用测试帖子 ID）
test_api "触发单个 NLP 分析" "POST" "/trigger-nlp" '{"postId": "test_post_12345"}'

# 3. 测试批量触发 NLP 分析
test_api "批量触发 NLP 分析" "POST" "/batch-nlp" '{"postIds": ["test_post_1", "test_post_2", "test_post_3"]}'

# 4. 测试微博搜索（使用示例日期）
test_api "微博关键词搜索" "POST" "/search-weibo" '{
  "keyword": "人工智能",
  "startDate": "2024-01-01",
  "endDate": "2024-01-02",
  "page": 1
}'

echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo -e "${YELLOW}前端访问地址:${NC}"
echo "  大屏首页: http://localhost:5173/"
echo "  爬虫控制面板: http://localhost:5173/crawler-control"
echo ""
echo -e "${YELLOW}使用说明:${NC}"
echo "  1. 在浏览器中打开 http://localhost:5173/crawler-control"
echo "  2. 在左侧侧边栏点击 '爬虫任务控制' 菜单"
echo "  3. 使用表单手动触发爬虫任务"
echo "  4. 查看执行记录和工作流状态"
echo ""
