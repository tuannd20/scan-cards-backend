#!/bin/bash

# Test script để kiểm tra AI có đọc context từ messages array hay không

echo "🔬 Testing AI Context Reading Capability..."
echo "=================================="

# Step 1: Gửi tin nhắn đầu tiên về Pikachu
echo "📤 Step 1: Gửi tin nhắn đầu tiên về Pikachu..."
RESPONSE1=$(curl -s -X POST http://localhost:3000/ai-chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi có một thẻ Pikachu Base Set First Edition. Bạn có thể cho tôi biết thông tin về nó không?"
  }')

echo "✅ Response 1:"
echo "$RESPONSE1" | jq -r '.reply' | head -5
echo ""

# Step 2: Tạo messages array từ cuộc hội thoại trước
MESSAGES_ARRAY='[
  {
    "role": "user",
    "content": "Tôi có một thẻ Pikachu Base Set First Edition. Bạn có thể cho tôi biết thông tin về nó không?",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  {
    "role": "assistant", 
    "content": "Thẻ Pikachu Base Set First Edition là một trong những thẻ Pokemon kinh điển và có giá trị cao nhất!",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }
]'

# Step 3: Gửi câu hỏi follow-up với context
echo "📤 Step 2: Gửi câu hỏi follow-up với context từ messages array..."
RESPONSE2=$(curl -s -X POST http://localhost:3000/ai-chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Giá của nó hiện tại là bao nhiều? Nó có đáng để đầu tư không?\",
    \"messages\": \"$(echo "$MESSAGES_ARRAY" | sed 's/"/\\"/g')\"
  }")

echo "✅ Response 2:"
echo "$RESPONSE2" | jq -r '.reply' | head -10
echo ""

# Step 3: Test với câu hỏi mơ hồ yêu cầu context
echo "📤 Step 3: Test với câu hỏi mơ hồ cần context..."
MESSAGES_ARRAY2='[
  {
    "role": "user",
    "content": "Tôi có một thẻ Charizard Base Set Shadowless. Nó có được grading PSA 10 không?",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  {
    "role": "assistant",
    "content": "Thẻ Charizard Base Set Shadowless là thẻ Pokemon huyền thoại! PSA 10 rất khó đạt được do yêu cầu condition hoàn hảo.",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }
]'

RESPONSE3=$(curl -s -X POST http://localhost:3000/ai-chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Tôi nên bán nó ngay hay giữ lại? Giá của nó sẽ tăng không?\",
    \"messages\": \"$(echo "$MESSAGES_ARRAY2" | sed 's/"/\\"/g')\"
  }")

echo "✅ Response 3:"
echo "$RESPONSE3" | jq -r '.reply' | head -10
echo ""

# Step 4: Test với pronoun reference
echo "📤 Step 4: Test với pronoun reference (thẻ này, nó)..."
MESSAGES_ARRAY3='[
  {
    "role": "user",
    "content": "Tôi vừa mua một thẻ Michael Jordan 1986 Fleer Rookie Card.",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  {
    "role": "assistant",
    "content": "Wow! Thẻ Michael Jordan 1986 Fleer #57 là thánh grail của sport cards! Đây là rookie card legendary.",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }
]'

RESPONSE4=$(curl -s -X POST http://localhost:3000/ai-chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Nó có phải là thẻ sport đắt nhất không? Tại sao thẻ này lại quan trọng?\",
    \"messages\": \"$(echo "$MESSAGES_ARRAY3" | sed 's/"/\\"/g')\"
  }")

echo "✅ Response 4:"
echo "$RESPONSE4" | jq -r '.reply' | head -10
echo ""

echo "🔍 Kiểm tra log server để xem messages có được truyền đúng không..."
echo "=================================="
echo "Nếu AI có sử dụng context, response sẽ:"
echo "- Tham chiếu cụ thể đến thẻ đã nói trước đó"
echo "- Trả lời dựa trên context thay vì hỏi lại thông tin"
echo "- Hiểu được pronoun như 'nó', 'thẻ này'"
