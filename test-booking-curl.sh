#!/bin/bash

# Booking Endpoints Test Script using curl
# Usage: Run each step manually and provide tokens when needed

BASE_URL="http://localhost:3000"
SELLER_EMAIL="hasdesallo@gmail.com"
BUYER_EMAIL="brigidiablay@gmail.com"
PASSWORD="password123"

echo "🚀 Booking Endpoints Test Script"
echo "=================================="
echo ""

# ============================================
# STEP 1: Create Seller User
# ============================================
echo "STEP 1: Creating Seller User ($SELLER_EMAIL)"
echo "--------------------------------------------"
curl -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$SELLER_EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Seller\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"233123456789\",
    \"role\": \"seller\"
  }"
echo ""
echo ""
echo "⚠️  Check your email ($SELLER_EMAIL) and verify the account"
echo "Press Enter when verified..."
read

# ============================================
# STEP 2: Login as Seller
# ============================================
echo ""
echo "STEP 2: Logging in as Seller"
echo "--------------------------------------------"
SELLER_LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$SELLER_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$SELLER_LOGIN_RESPONSE"

SELLER_TOKEN=$(echo "$SELLER_LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$SELLER_TOKEN" ] || [ "$SELLER_TOKEN" = "null" ]; then
    echo "❌ Failed to get seller token. Make sure email is verified."
    exit 1
fi

echo ""
echo "✅ Seller Token: ${SELLER_TOKEN:0:30}..."
echo ""

# ============================================
# STEP 3: Setup Seller Profile
# ============================================
echo "STEP 3: Setting up Seller Profile"
echo "--------------------------------------------"
curl -X POST $BASE_URL/api/sellers/setup \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Professional Design Services",
    "description": "I provide professional design services",
    "category": "design",
    "default_price": 100.00,
    "default_delivery_time": 5,
    "express_price": 150.00,
    "express_delivery_time": 2,
    "portfolio": "https://example.com/portfolio"
  }' | jq '.'
echo ""

# ============================================
# STEP 4: Create Service
# ============================================
echo "STEP 4: Creating Service"
echo "--------------------------------------------"
CREATE_SERVICE_RESPONSE=$(curl -s -X POST $BASE_URL/api/sellers/create-service \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Logo Design Service",
    "description": "Professional logo design for your business",
    "category": "design",
    "default_price": 75.00,
    "default_delivery_time": 3,
    "express_price": 120.00,
    "express_delivery_time": 1,
    "portfolio": "https://example.com/logo-portfolio"
  }')

echo "$CREATE_SERVICE_RESPONSE"

SERVICE_ID=$(echo "$CREATE_SERVICE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
    echo "❌ Failed to create service"
    exit 1
fi

echo ""
echo "✅ Service ID: $SERVICE_ID"
echo ""
echo "⚠️  IMPORTANT: Go to Supabase and set is_verified = true for this service"
echo "   Service ID: $SERVICE_ID"
echo "Press Enter after verifying the service..."
read

# ============================================
# STEP 5: Create Buyer User
# ============================================
echo ""
echo "STEP 5: Creating Buyer User ($BUYER_EMAIL)"
echo "--------------------------------------------"
curl -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BUYER_EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Buyer\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"233987654321\",
    \"role\": \"customer\"
  }" | jq '.'
echo ""
echo ""
echo "⚠️  Check your email ($BUYER_EMAIL) and verify the account"
echo "Press Enter when verified..."
read

# ============================================
# STEP 6: Login as Buyer
# ============================================
echo ""
echo "STEP 6: Logging in as Buyer"
echo "--------------------------------------------"
BUYER_LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BUYER_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$BUYER_LOGIN_RESPONSE" | jq '.'

BUYER_TOKEN=$(echo "$BUYER_LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$BUYER_TOKEN" ] || [ "$BUYER_TOKEN" = "null" ]; then
    echo "❌ Failed to get buyer token. Make sure email is verified."
    exit 1
fi

echo ""
echo "✅ Buyer Token: ${BUYER_TOKEN:0:30}..."
echo ""

# ============================================
# STEP 7: Book Service
# ============================================
echo "STEP 7: Booking Service"
echo "--------------------------------------------"

# Get future date (7 days from now)
if [[ "$OSTYPE" == "darwin"* ]]; then
    FUTURE_DATE=$(date -v+7d +%Y-%m-%d)
else
    FUTURE_DATE=$(date -d "+7 days" +%Y-%m-%d)
fi

BOOK_NOW_RESPONSE=$(curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"$FUTURE_DATE\",
    \"time\": \"14:00\",
    \"status\": \"pending\"
  }")

echo "$BOOK_NOW_RESPONSE" | jq '.'

BOOKING_ID=$(echo "$BOOK_NOW_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
    echo ""
    echo "❌ Failed to create booking"
    echo "   Make sure:"
    echo "   1. Service is verified (is_verified = true)"
    echo "   2. Service is active (is_active = true)"
    exit 1
fi

echo ""
echo "✅ Booking ID: $BOOKING_ID"
echo ""

# ============================================
# STEP 8: Get Buyer Bookings
# ============================================
echo "STEP 8: Getting Buyer Bookings"
echo "--------------------------------------------"
curl -s -X GET "$BASE_URL/api/bookings?role=buyer" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq '.'
echo ""

# ============================================
# STEP 9: Get Seller Bookings
# ============================================
echo "STEP 9: Getting Seller Bookings"
echo "--------------------------------------------"
curl -s -X GET "$BASE_URL/api/bookings?role=seller" \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq '.'
echo ""

# ============================================
# STEP 10: Get Booking by ID (as Buyer)
# ============================================
echo "STEP 10: Getting Booking by ID (as Buyer)"
echo "--------------------------------------------"
curl -s -X GET $BASE_URL/api/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq '.'
echo ""

# ============================================
# STEP 11: Get Booking by ID (as Seller)
# ============================================
echo "STEP 11: Getting Booking by ID (as Seller)"
echo "--------------------------------------------"
curl -s -X GET $BASE_URL/api/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $SELLER_TOKEN" | jq '.'
echo ""

# ============================================
# STEP 12: Test Error Cases
# ============================================
echo "STEP 12: Testing Error Cases"
echo "--------------------------------------------"

echo "Testing: Booking own service (should fail)"
curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"$FUTURE_DATE\",
    \"time\": \"15:00\"
  }" | jq '.'
echo ""

echo "Testing: Booking with past date (should fail)"
curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"2020-01-01\",
    \"time\": \"12:00\"
  }" | jq '.'
echo ""

# ============================================
# Summary
# ============================================
echo "=================================="
echo "TEST SUMMARY"
echo "=================================="
echo "✅ Test Flow Completed!"
echo ""
echo "Summary:"
echo "  - Seller User: $SELLER_EMAIL"
echo "  - Buyer User: $BUYER_EMAIL"
echo "  - Service ID: $SERVICE_ID"
if [ ! -z "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
    echo "  - Booking ID: $BOOKING_ID"
fi
echo ""
echo "✅ All booking endpoints have been tested!"

