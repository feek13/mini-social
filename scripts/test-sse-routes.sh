#!/bin/bash

# 测试 SSE 实时路由
# 运行: bash scripts/test-sse-routes.sh

echo "========================================"
echo "🧪 测试 SSE 实时路由"
echo "========================================"

# 测试 1: 协议实时更新（运行 10 秒）
echo ""
echo "📋 测试 1: 协议实时更新 (10 秒)"
echo "----------------------------------------"
timeout 10s curl -N -s "http://localhost:3000/api/defi/realtime/protocols?minTvl=1000000000&limit=5" | while IFS= read -r line; do
  if [[ $line == data:* ]]; then
    # 解析 JSON 数据
    data="${line#data: }"
    # 提取 event 类型和关键信息
    event_type=$(echo "$data" | grep -o '"message":[^,}]*' | head -1)
    count=$(echo "$data" | grep -o '"count":[0-9]*' | head -1 | grep -o '[0-9]*')
    update_count=$(echo "$data" | grep -o '"updateCount":[0-9]*' | head -1 | grep -o '[0-9]*')

    if [[ -n $event_type ]]; then
      echo "✅ 连接成功: $event_type"
    elif [[ -n $count ]]; then
      echo "📦 更新 #$update_count: $count 个协议"
    fi
  fi
done

echo ""
echo "✅ 测试 1 完成"

# 测试 2: 收益率实时更新（运行 10 秒）
echo ""
echo "💰 测试 2: 收益率实时更新 (10 秒)"
echo "----------------------------------------"
timeout 10s curl -N -s "http://localhost:3000/api/defi/realtime/yields?protocol=aave-v3&limit=5" | while IFS= read -r line; do
  if [[ $line == data:* ]]; then
    data="${line#data: }"
    event_type=$(echo "$data" | grep -o '"message":[^,}]*' | head -1)
    count=$(echo "$data" | grep -o '"count":[0-9]*' | head -1 | grep -o '[0-9]*')
    update_count=$(echo "$data" | grep -o '"updateCount":[0-9]*' | head -1 | grep -o '[0-9]*')

    if [[ -n $event_type ]]; then
      echo "✅ 连接成功: $event_type"
    elif [[ -n $count ]]; then
      echo "📦 更新 #$update_count: $count 个池子"
    fi
  fi
done

echo ""
echo "✅ 测试 2 完成"

# 测试 3: DEX 实时数据（运行 5 秒）
echo ""
echo "🔄 测试 3: DEX 实时数据 (5 秒)"
echo "----------------------------------------"
timeout 5s curl -N -s "http://localhost:3000/api/defi/realtime/dex?tokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&interval=1000" | while IFS= read -r line; do
  if [[ $line == data:* ]]; then
    data="${line#data: }"
    event_type=$(echo "$data" | grep -o '"message":[^,}]*' | head -1)
    count=$(echo "$data" | grep -o '"count":[0-9]*' | head -1 | grep -o '[0-9]*')
    has_changed=$(echo "$data" | grep -o '"hasChanged":[a-z]*' | head -1 | grep -o '[a-z]*')

    if [[ -n $event_type ]]; then
      echo "✅ 连接成功: $event_type"
    elif [[ -n $count ]]; then
      if [[ $has_changed == "true" ]]; then
        echo "📦 更新: $count 个交易对 (有变化 ⚡)"
      else
        echo "📦 更新: $count 个交易对"
      fi
    fi
  fi
done

echo ""
echo "✅ 测试 3 完成"

echo ""
echo "========================================"
echo "✅ 所有 SSE 测试完成！"
echo "========================================"
