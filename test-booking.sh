#!/bin/bash

# Booking Endpoints Test Script
# This script tests the complete booking flow:
# 1. Create seller user
# 2. Login as seller
# 3. Setup seller profile
# 4. Create service
# 5. Create buyer user
# 6. Login as buyer
# 7. Book service
# 8. Get bookings
# 9. Get booking by ID

BASE_URL="http://localhost:3000"
SELLER_EMAIL="seller@test.com"
BUYER_EMAIL="buyer@test.com"
PASSWORD="password123"

echo "🚀 Starting Booking Endpoints Test..."
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${GREEN}$1${NC}"
    echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "${RED}❌ jq is not installed. Please install it to run this script.${NC}"
    echo "   macOS: brew install jq"
    echo "   Linux: sudo apt-get install jq"
    exit 1
fi

# ============================================
# STEP 1: Create Seller User
# ============================================
print_section "STEP 1: Creating Seller User"

SELLER_SIGNUP=$(curl -s -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$SELLER_EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Seller\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"233123456789\",
    \"role\": \"seller\"
  }")

echo "$SELLER_SIGNUP" | jq '.'

SELLER_USER_ID=$(echo $SELLER_SIGNUP | jq -r '.data.userId // empty')

if [ -z "$SELLER_USER_ID" ]; then
    echo "${YELLOW}⚠️  Note: You may need to verify the seller email before proceeding${NC}"
    echo "${YELLOW}   Email: $SELLER_EMAIL${NC}"
    echo ""
    read -p "Press Enter after verifying the seller email..."
fi

# ============================================
# STEP 2: Login as Seller
# ============================================
print_section "STEP 2: Logging in as Seller"

SELLER_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$SELLER_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$SELLER_LOGIN" | jq '.'

SELLER_TOKEN=$(echo $SELLER_LOGIN | jq -r '.data.session.access_token // empty')

if [ -z "$SELLER_TOKEN" ] || [ "$SELLER_TOKEN" = "null" ]; then
    echo "${RED}❌ Failed to get seller access token. Make sure email is verified.${NC}"
    exit 1
fi

echo "${GREEN}✅ Seller token obtained${NC}"
echo ""

# ============================================
# STEP 3: Setup Seller Profile
# ============================================
print_section "STEP 3: Setting up Seller Profile"

SELLER_SETUP=$(curl -s -X POST $BASE_URL/api/sellers/setup \
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
  }')

echo "$SELLER_SETUP" | jq '.'

# ============================================
# STEP 4: Create Service
# ============================================
print_section "STEP 4: Creating Service"

CREATE_SERVICE=$(curl -s -X POST $BASE_URL/api/sellers/create-service \
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

echo "$CREATE_SERVICE" | jq '.'

SERVICE_ID=$(echo $CREATE_SERVICE | jq -r '.data.id // empty')

if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
    echo "${RED}❌ Failed to create service${NC}"
    exit 1
fi

echo "${GREEN}✅ Service created with ID: $SERVICE_ID${NC}"
echo ""
echo "${YELLOW}⚠️  IMPORTANT: You need to manually verify the service in your database${NC}"
echo "${YELLOW}   Set is_verified = true for service ID: $SERVICE_ID${NC}"
echo ""
read -p "Press Enter after verifying the service in Supabase..."

# ============================================
# STEP 5: Create Buyer User
# ============================================
print_section "STEP 5: Creating Buyer User"

BUYER_SIGNUP=$(curl -s -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BUYER_EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Buyer\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"233987654321\",
    \"role\": \"customer\"
  }")

echo "$BUYER_SIGNUP" | jq '.'

echo "${YELLOW}⚠️  Note: You may need to verify the buyer email before proceeding${NC}"
echo "${YELLOW}   Email: $BUYER_EMAIL${NC}"
echo ""
read -p "Press Enter after verifying the buyer email..."

# ============================================
# STEP 6: Login as Buyer
# ============================================
print_section "STEP 6: Logging in as Buyer"

BUYER_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BUYER_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$BUYER_LOGIN" | jq '.'

BUYER_TOKEN=$(echo $BUYER_LOGIN | jq -r '.data.session.access_token // empty')

if [ -z "$BUYER_TOKEN" ] || [ "$BUYER_TOKEN" = "null" ]; then
    echo "${RED}❌ Failed to get buyer access token. Make sure email is verified.${NC}"
    exit 1
fi

echo "${GREEN}✅ Buyer token obtained${NC}"
echo ""

# ============================================
# STEP 7: Book Service
# ============================================
print_section "STEP 7: Booking Service"

# Get future date (7 days from now)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    FUTURE_DATE=$(date -v+7d +%Y-%m-%d)
else
    # Linux
    FUTURE_DATE=$(date -d "+7 days" +%Y-%m-%d)
fi

BOOK_NOW=$(curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"$FUTURE_DATE\",
    \"time\": \"14:00\",
    \"status\": \"pending\"
  }")

echo "$BOOK_NOW" | jq '.'

BOOKING_ID=$(echo $BOOK_NOW | jq -r '.data.id // empty')

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
    echo "${RED}❌ Failed to create booking${NC}"
    echo "${YELLOW}   Make sure:${NC}"
    echo "${YELLOW}   1. Service is verified (is_verified = true)${NC}"
    echo "${YELLOW}   2. Service is active (is_active = true)${NC}"
    exit 1
fi

echo "${GREEN}✅ Booking created with ID: $BOOKING_ID${NC}"
echo ""

# ============================================
# STEP 8: Get Buyer Bookings
# ============================================
print_section "STEP 8: Getting Buyer Bookings"

GET_BUYER_BOOKINGS=$(curl -s -X GET "$BASE_URL/api/bookings?role=buyer" \
  -H "Authorization: Bearer $BUYER_TOKEN")

echo "$GET_BUYER_BOOKINGS" | jq '.'

# ============================================
# STEP 9: Get Seller Bookings
# ============================================
print_section "STEP 9: Getting Seller Bookings"

GET_SELLER_BOOKINGS=$(curl -s -X GET "$BASE_URL/api/bookings?role=seller" \
  -H "Authorization: Bearer $SELLER_TOKEN")

echo "$GET_SELLER_BOOKINGS" | jq '.'

# ============================================
# STEP 10: Get Booking by ID (as Buyer)
# ============================================
print_section "STEP 10: Getting Booking by ID (as Buyer)"

if [ ! -z "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
    GET_BOOKING=$(curl -s -X GET $BASE_URL/api/bookings/$BOOKING_ID \
      -H "Authorization: Bearer $BUYER_TOKEN")
    
    echo "$GET_BOOKING" | jq '.'
else
    echo "${YELLOW}⚠️  Skipping - No booking ID available${NC}"
fi

# ============================================
# STEP 11: Get Booking by ID (as Seller)
# ============================================
print_section "STEP 11: Getting Booking by ID (as Seller)"

if [ ! -z "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
    GET_BOOKING_SELLER=$(curl -s -X GET $BASE_URL/api/bookings/$BOOKING_ID \
      -H "Authorization: Bearer $SELLER_TOKEN")
    
    echo "$GET_BOOKING_SELLER" | jq '.'
else
    echo "${YELLOW}⚠️  Skipping - No booking ID available${NC}"
fi

# ============================================
# STEP 12: Test Error Cases
# ============================================
print_section "STEP 12: Testing Error Cases"

echo "${YELLOW}Testing: Booking own service (should fail)${NC}"
BOOK_OWN_SERVICE=$(curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"$FUTURE_DATE\",
    \"time\": \"15:00\"
  }")
echo "$BOOK_OWN_SERVICE" | jq '.'
echo ""

echo "${YELLOW}Testing: Booking with past date (should fail)${NC}"
BOOK_PAST=$(curl -s -X POST $BASE_URL/api/bookings/book-now \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"2020-01-01\",
    \"time\": \"12:00\"
  }")
echo "$BOOK_PAST" | jq '.'
echo ""

# ============================================
# Summary
# ============================================
print_section "TEST SUMMARY"

echo "${GREEN}✅ Test Flow Completed!${NC}"
echo ""
echo "Summary:"
echo "  - Seller User: $SELLER_EMAIL"
echo "  - Buyer User: $BUYER_EMAIL"
echo "  - Service ID: $SERVICE_ID"
if [ ! -z "$BOOKING_ID" ] && [ "$BOOKING_ID" != "null" ]; then
    echo "  - Booking ID: $BOOKING_ID"
fi
echo ""
echo "${GREEN}All booking endpoints have been tested!${NC}"

