#!/bin/bash

# API Testing Script
# Usage: ./test-api.sh

BASE_URL="http://localhost:3000"
EMAIL="test@example.com"
PASSWORD="password123"

echo "🚀 Starting API Tests..."
echo ""

# 1. Health Check
echo "1️⃣  Testing Health Check..."
curl -s -X GET $BASE_URL/health | jq '.'
echo ""
echo "---"
echo ""

# 2. Sign Up
echo "2️⃣  Testing Sign Up..."
SIGNUP_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\",
    \"phoneNumber\": \"233123456789\",
    \"role\": \"customer\"
  }")

echo "$SIGNUP_RESPONSE" | jq '.'
echo ""
echo "---"
echo ""

# 3. Resend Verification
echo "3️⃣  Testing Resend Verification..."
curl -s -X POST $BASE_URL/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}" | jq '.'
echo ""
echo "---"
echo ""

# 4. Login
echo "4️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

# Extract access token (requires jq)
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.session.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "⚠️  No access token received. Make sure you've verified your email first."
  echo ""
  echo "---"
  echo ""
  echo "5️⃣  To test protected endpoints, you need to:"
  echo "   - Verify your email using the link sent to $EMAIL"
  echo "   - Run the login command again to get an access token"
  echo "   - Then test /api/auth/me and /api/sellers/setup with the token"
  exit 0
fi

echo ""
echo "✅ Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""
echo "---"
echo ""

# 5. Get Current User
echo "5️⃣  Testing Get Current User (Me)..."
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""
echo "---"
echo ""

# 6. Setup Seller (if user is a seller)
echo "6️⃣  Testing Setup Seller..."
curl -s -X POST $BASE_URL/api/sellers/setup \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Awesome Service",
    "description": "I provide excellent services",
    "category": "design",
    "default_price": 50.00,
    "default_delivery_time": 3,
    "express_price": 75.00,
    "express_delivery_time": 1
  }' | jq '.'
echo ""
echo "---"
echo ""

# 7. Logout
echo "7️⃣  Testing Logout..."
curl -s -X POST $BASE_URL/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""
echo "---"
echo ""

echo "✅ All tests completed!"
echo ""
echo "Note: Some endpoints may fail if:"
echo "  - Email is not verified"
echo "  - User doesn't have the required role"
echo "  - Token has expired"

