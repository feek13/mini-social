#!/bin/bash

# 快速测试 DeFiLlama API 集成

BASE_URL="http://localhost:3000"

echo "======================================================================"
echo "  DeFiLlama API 快速测试"
echo "======================================================================"

# 颜色代码
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# 测试函数
run_test() {
  local test_name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="$4"

  test_count=$((test_count + 1))
  echo ""
  echo "测试 $test_count: $test_name"
  echo "----------------------------------------"

  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$url")
  fi

  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS/d')

  if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_status)"
    pass_count=$((pass_count + 1))

    # 打印部分响应（前 200 个字符）
    echo "响应预览: $(echo "$body" | head -c 200)..."
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_status)"
    fail_count=$((fail_count + 1))
    echo "响应: $body"
  fi
}

echo ""
echo "======================================================================"
echo "  阶段 1: 协议列表 API"
echo "======================================================================"

run_test "1.1 基本请求 - 无参数" \
  "$BASE_URL/api/defi/protocols?limit=10"

run_test "1.2 搜索 - search=aave" \
  "$BASE_URL/api/defi/protocols?search=aave&limit=5"

run_test "1.3 分类过滤 - category=Dexs" \
  "$BASE_URL/api/defi/protocols?category=Dexs&limit=5"

run_test "1.4 链过滤 - chain=Ethereum" \
  "$BASE_URL/api/defi/protocols?chain=Ethereum&limit=5"

echo ""
echo "======================================================================"
echo "  阶段 2: 协议详情 API"
echo "======================================================================"

run_test "2.1 有效协议 - Aave" \
  "$BASE_URL/api/defi/protocols/aave"

run_test "2.2 有效协议 - Uniswap" \
  "$BASE_URL/api/defi/protocols/uniswap"

# 测试无效协议（预期 404）
echo ""
echo "测试 $((test_count + 1)): 2.3 无效协议 - 预期 404"
echo "----------------------------------------"
test_count=$((test_count + 1))
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/defi/protocols/invalid-xyz-123")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$http_status" -eq 404 ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_status - 正确返回 404)"
  pass_count=$((pass_count + 1))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_status - 期望 404)"
  fail_count=$((fail_count + 1))
fi

echo ""
echo "======================================================================"
echo "  阶段 3: 收益率 API"
echo "======================================================================"

run_test "3.1 基本请求 - 无参数" \
  "$BASE_URL/api/defi/yields?limit=10"

run_test "3.2 链过滤 - chain=Ethereum" \
  "$BASE_URL/api/defi/yields?chain=Ethereum&limit=5"

run_test "3.3 协议过滤 - protocol=aave" \
  "$BASE_URL/api/defi/yields?protocol=aave&limit=5"

run_test "3.4 最低 APY 过滤 - minApy=10" \
  "$BASE_URL/api/defi/yields?minApy=10&limit=5"

echo ""
echo "======================================================================"
echo "  阶段 4: 代币价格 API"
echo "=====================================================================""

run_test "4.1 单个代币 - WETH" \
  "$BASE_URL/api/defi/prices" \
  "POST" \
  '{"tokens":[{"chain":"ethereum","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}]}'

run_test "4.2 多个代币 - WETH, USDC, WMATIC" \
  "$BASE_URL/api/defi/prices" \
  "POST" \
  '{"tokens":[{"chain":"ethereum","address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"},{"chain":"ethereum","address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"},{"chain":"polygon","address":"0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"}]}'

# 测试空请求（预期 400）
echo ""
echo "测试 $((test_count + 1)): 4.3 空请求 - 预期 400"
echo "----------------------------------------"
test_count=$((test_count + 1))
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/defi/prices" \
  -H "Content-Type: application/json" \
  -d '{"tokens":[]}')
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$http_status" -eq 400 ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_status - 正确返回 400)"
  pass_count=$((pass_count + 1))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_status - 期望 400)"
  fail_count=$((fail_count + 1))
fi

echo ""
echo "======================================================================"
echo "  测试总结"
echo "======================================================================"
echo ""
echo "总计: $test_count 个测试"
echo -e "${GREEN}通过: $pass_count 个${NC}"
echo -e "${RED}失败: $fail_count 个${NC}"

if [ $fail_count -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo ""
  echo -e "${YELLOW}⚠️  有 $fail_count 个测试失败${NC}"
  exit 1
fi
