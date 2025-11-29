#!/bin/bash

# Payment & Invoice Flow Test Script
# This script tests the complete payment flow from booking to invoice retrieval

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Payment & Invoice Flow Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Health Check
echo -e "${YELLOW}Step 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Step 2: Login (Replace with your test credentials)
echo -e "${YELLOW}Step 2: Login${NC}"
echo -e "Enter your email: "
read -r EMAIL
echo -e "Enter your password: "
read -s PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.session.access_token' 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed. Please check your credentials.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "User ID: ${USER_ID}"
echo -e "Token: ${TOKEN:0:20}...\n"

# Step 3: Get available services (to find a serviceId)
echo -e "${YELLOW}Step 3: Get Available Services${NC}"
SERVICES_RESPONSE=$(curl -s -X GET "${API_URL}/services" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$SERVICES_RESPONSE" | jq '.' 2>/dev/null || echo "$SERVICES_RESPONSE"

# Extract first service ID
SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.data.services[0].id' 2>/dev/null)

if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
  echo -e "${YELLOW}⚠️  No services found. Please provide a service ID:${NC}"
  read -r SERVICE_ID
else
  echo -e "${GREEN}✅ Found service ID: ${SERVICE_ID}${NC}\n"
fi

# Step 4: Create a Booking
echo -e "${YELLOW}Step 4: Create Booking${NC}"
BOOKING_RESPONSE=$(curl -s -X POST "${API_URL}/bookings/book-now" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"${SERVICE_ID}\"
  }")

echo "$BOOKING_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKING_RESPONSE"

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.id' 2>/dev/null)

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
  echo -e "${RED}❌ Booking creation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Booking created: ${BOOKING_ID}${NC}\n"

# Step 5: Initiate Payment
echo -e "${YELLOW}Step 5: Initiate Payment${NC}"
PAYMENT_INIT_RESPONSE=$(curl -s -X POST "${API_URL}/payments/initiate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"${BOOKING_ID}\"
  }")

echo "$PAYMENT_INIT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYMENT_INIT_RESPONSE"

AUTH_URL=$(echo "$PAYMENT_INIT_RESPONSE" | jq -r '.data.authorization_url' 2>/dev/null)
REFERENCE=$(echo "$PAYMENT_INIT_RESPONSE" | jq -r '.data.reference' 2>/dev/null)

if [ -z "$REFERENCE" ] || [ "$REFERENCE" = "null" ]; then
  echo -e "${RED}❌ Payment initiation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Payment initiated${NC}"
echo -e "Reference: ${REFERENCE}"
echo -e "Authorization URL: ${AUTH_URL}\n"

# Step 6: Verify Payment (Simulate Paystack callback)
echo -e "${YELLOW}Step 6: Verify Payment${NC}"
echo -e "${YELLOW}Note: In production, Paystack calls this endpoint.${NC}"
echo -e "${YELLOW}For testing, we'll call it directly with the reference.${NC}"
echo ""
echo -e "Press Enter to verify payment (or enter a different reference):"
read -r CUSTOM_REFERENCE

if [ -n "$CUSTOM_REFERENCE" ]; then
  REFERENCE="$CUSTOM_REFERENCE"
fi

VERIFY_RESPONSE=$(curl -s -X GET "${API_URL}/payments/verify?reference=${REFERENCE}")

echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"

INVOICE_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.invoice_id' 2>/dev/null)
VERIFY_SUCCESS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.success' 2>/dev/null)

if [ "$VERIFY_SUCCESS" = "true" ] || [ -n "$INVOICE_ID" ]; then
  echo -e "${GREEN}✅ Payment verified${NC}"
  if [ -n "$INVOICE_ID" ]; then
    echo -e "Invoice ID: ${INVOICE_ID}\n"
  fi
else
  echo -e "${YELLOW}⚠️  Payment verification may have failed or payment not completed${NC}"
  echo -e "${YELLOW}Note: This endpoint requires a successful Paystack transaction.${NC}"
  echo -e "${YELLOW}In a real scenario, you would complete payment on Paystack first.${NC}\n"
fi

# Step 7: Get Invoice (if invoice ID is available)
if [ -n "$INVOICE_ID" ] && [ "$INVOICE_ID" != "null" ]; then
  echo -e "${YELLOW}Step 7: Get Invoice by ID${NC}"
  INVOICE_RESPONSE=$(curl -s -X GET "${API_URL}/invoices/${INVOICE_ID}" \
    -H "Authorization: Bearer ${TOKEN}")

  echo "$INVOICE_RESPONSE" | jq '.' 2>/dev/null || echo "$INVOICE_RESPONSE"
  
  INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | jq -r '.data.invoice_number' 2>/dev/null)
  if [ -n "$INVOICE_NUMBER" ] && [ "$INVOICE_NUMBER" != "null" ]; then
    echo -e "${GREEN}✅ Invoice retrieved: ${INVOICE_NUMBER}${NC}\n"
  fi
else
  echo -e "${YELLOW}Step 7: Get Invoice${NC}"
  echo -e "${YELLOW}⚠️  No invoice ID available. To test invoice retrieval:${NC}"
  echo -e "Enter an invoice ID to retrieve:"
  read -r MANUAL_INVOICE_ID
  
  if [ -n "$MANUAL_INVOICE_ID" ]; then
    INVOICE_RESPONSE=$(curl -s -X GET "${API_URL}/invoices/${MANUAL_INVOICE_ID}" \
      -H "Authorization: Bearer ${TOKEN}")
    
    echo "$INVOICE_RESPONSE" | jq '.' 2>/dev/null || echo "$INVOICE_RESPONSE"
  fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete!${NC}"
echo -e "${BLUE}========================================${NC}"

