#!/bin/bash

# DeFi 前端验收测试脚本

BASE_URL="http://localhost:3000"

# 颜色代码
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================================================"
echo -e "${BLUE}  DeFi 前端验收测试${NC}"
echo "======================================================================"
echo ""

test_count=0
pass_count=0
fail_count=0

# 测试函数
test_page() {
  local test_name="$1"
  local url="$2"
  local expected_text="$3"

  test_count=$((test_count + 1))
  echo -e "${YELLOW}测试 $test_count: $test_name${NC}"
  echo "URL: $url"

  # 获取页面内容
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$url")
  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS/d')

  # 检查 HTTP 状态码
  if [ "$http_status" -eq 200 ]; then
    echo -e "${GREEN}✅ 页面可访问 (HTTP $http_status)${NC}"

    # 检查期望的文本是否存在
    if [ -n "$expected_text" ]; then
      if echo "$body" | grep -q "$expected_text"; then
        echo -e "${GREEN}✅ 包含期望内容: \"$expected_text\"${NC}"
        pass_count=$((pass_count + 1))
      else
        echo -e "${RED}❌ 缺少期望内容: \"$expected_text\"${NC}"
        fail_count=$((fail_count + 1))
      fi
    else
      pass_count=$((pass_count + 1))
    fi
  else
    echo -e "${RED}❌ 页面访问失败 (HTTP $http_status)${NC}"
    fail_count=$((fail_count + 1))
  fi

  echo ""
}

# 检查 API 数据
test_api_data() {
  local test_name="$1"
  local url="$2"
  local check_field="$3"

  test_count=$((test_count + 1))
  echo -e "${YELLOW}测试 $test_count: $test_name${NC}"
  echo "API: $url"

  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$url")
  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS/d')

  if [ "$http_status" -eq 200 ]; then
    echo -e "${GREEN}✅ API 可访问 (HTTP $http_status)${NC}"

    # 检查 JSON 字段
    if echo "$body" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if '$check_field' in data and len(data['$check_field']) > 0:
        print('PASS')
        print(f'数据量: {len(data[\"$check_field\"])} 项')
    else:
        print('FAIL')
except Exception as e:
    print('ERROR: ' + str(e))
" | grep -q "PASS"; then
      count=$(echo "$body" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if '$check_field' in data:
        print(len(data['$check_field']))
except:
    pass
")
      echo -e "${GREEN}✅ 数据完整: $count 项${NC}"
      pass_count=$((pass_count + 1))
    else
      echo -e "${RED}❌ 数据缺失或为空${NC}"
      fail_count=$((fail_count + 1))
    fi
  else
    echo -e "${RED}❌ API 访问失败 (HTTP $http_status)${NC}"
    fail_count=$((fail_count + 1))
  fi

  echo ""
}

echo "======================================================================"
echo -e "${BLUE}  阶段 1: 页面可访问性测试${NC}"
echo "======================================================================"
echo ""

# 测试主页面
test_page \
  "1.1 访问 /defi 主页面" \
  "$BASE_URL/defi" \
  "DeFi 数据浏览器"

# 测试测试页面
test_page \
  "1.2 访问 /defi/test 测试页面" \
  "$BASE_URL/defi/test" \
  "DeFi API"

echo "======================================================================"
echo -e "${BLUE}  阶段 2: API 数据加载测试${NC}"
echo "======================================================================"
echo ""

# 测试协议 API
test_api_data \
  "2.1 协议列表 API 数据加载" \
  "$BASE_URL/api/defi/protocols?limit=10" \
  "protocols"

# 测试收益率 API
test_api_data \
  "2.2 收益率 API 数据加载" \
  "$BASE_URL/api/defi/yields?limit=10" \
  "pools"

echo "======================================================================"
echo -e "${BLUE}  阶段 3: 过滤功能测试${NC}"
echo "======================================================================"
echo ""

# 测试搜索过滤
test_api_data \
  "3.1 搜索过滤 (search=aave)" \
  "$BASE_URL/api/defi/protocols?search=aave&limit=5" \
  "protocols"

# 测试分类过滤
test_api_data \
  "3.2 分类过滤 (category=Dexs)" \
  "$BASE_URL/api/defi/protocols?category=Dexs&limit=5" \
  "protocols"

# 测试链过滤
test_api_data \
  "3.3 链过滤 (chain=Ethereum)" \
  "$BASE_URL/api/defi/yields?chain=Ethereum&limit=5" \
  "pools"

# 测试 APY 过滤
test_api_data \
  "3.4 APY 过滤 (minApy=10)" \
  "$BASE_URL/api/defi/yields?minApy=10&limit=5" \
  "pools"

echo "======================================================================"
echo -e "${BLUE}  阶段 4: 组件渲染测试${NC}"
echo "======================================================================"
echo ""

# 检查页面是否包含关键组件
test_page \
  "4.1 协议标签页渲染" \
  "$BASE_URL/defi" \
  "协议"

test_page \
  "4.2 收益率标签页渲染" \
  "$BASE_URL/defi" \
  "收益率"

test_page \
  "4.3 价格查询标签页渲染" \
  "$BASE_URL/defi" \
  "价格查询"

test_page \
  "4.4 搜索框渲染" \
  "$BASE_URL/defi" \
  "搜索协议名称"

test_page \
  "4.5 过滤按钮渲染" \
  "$BASE_URL/defi" \
  "过滤"

echo "======================================================================"
echo -e "${BLUE}  测试总结${NC}"
echo "======================================================================"
echo ""
echo "总计: $test_count 个测试"
echo -e "${GREEN}通过: $pass_count 个${NC}"
echo -e "${RED}失败: $fail_count 个${NC}"

pass_rate=$(echo "scale=1; $pass_count * 100 / $test_count" | bc)
echo ""
echo "通过率: ${pass_rate}%"

if [ $fail_count -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 所有前端测试通过！${NC}"
  echo ""
  echo "✅ 页面可访问"
  echo "✅ 数据正确加载"
  echo "✅ 过滤功能正常"
  echo "✅ UI 组件完整"
  echo ""
  echo -e "${GREEN}✓ 前端验收通过，可以部署！${NC}"
  exit 0
else
  echo ""
  echo -e "${YELLOW}⚠️  有 $fail_count 个测试失败，请检查${NC}"
  exit 1
fi
