#!/bin/bash

# Manual Payment & Invoice Flow Test Script
# Copy and paste these commands one by one, replacing variables as needed

# ============================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"
EMAIL="your-email@example.com"
PASSWORD="your-password"
SERVICE_ID="your-service-id"  # Optional: will fetch if not provided

# ============================================
# STEP 1: Health Check
# ============================================
echo "Step 1: Health Check"
curl -X GET "${BASE_URL}/health" | jq '.'

# ============================================
# STEP 2: Login
# ============================================
echo -e "\nStep 2: Login"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

# Extract token (save this for subsequent requests)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.session.access_token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')

echo -e "\nToken: ${TOKEN:0:50}..."
echo "User ID: ${USER_ID}"

# ============================================
# STEP 3: Get Services (if SERVICE_ID not provided)
# ============================================
if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "your-service-id" ]; then
  echo -e "\nStep 3: Get Available Services"
  SERVICES_RESPONSE=$(curl -s -X GET "${API_URL}/services" \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo "$SERVICES_RESPONSE" | jq '.'
  
  SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.data.services[0].id')
  echo -e "\nUsing Service ID: ${SERVICE_ID}"
fi

# ============================================
# STEP 4: Create Booking
# ============================================
echo -e "\nStep 4: Create Booking"
BOOKING_RESPONSE=$(curl -s -X POST "${API_URL}/bookings/book-now" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"${SERVICE_ID}\"
  }")

echo "$BOOKING_RESPONSE" | jq '.'

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.id')
echo -e "\nBooking ID: ${BOOKING_ID}"

# ============================================
# STEP 5: Initiate Payment
# ============================================
echo -e "\nStep 5: Initiate Payment"
PAYMENT_INIT_RESPONSE=$(curl -s -X POST "${API_URL}/payments/initiate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"${BOOKING_ID}\"
  }")

echo "$PAYMENT_INIT_RESPONSE" | jq '.'

AUTH_URL=$(echo "$PAYMENT_INIT_RESPONSE" | jq -r '.data.authorization_url')
REFERENCE=$(echo "$PAYMENT_INIT_RESPONSE" | jq -r '.data.reference')

echo -e "\nPayment Reference: ${REFERENCE}"
echo "Authorization URL: ${AUTH_URL}"
echo -e "\n⚠️  IMPORTANT: Complete the payment on Paystack using the authorization URL above"
echo "After payment is complete, use the reference to verify payment in Step 6"

# ============================================
# STEP 6: Verify Payment
# ============================================
echo -e "\nStep 6: Verify Payment"
echo "Enter the payment reference (or press Enter to use: ${REFERENCE}):"
read -r VERIFY_REFERENCE

if [ -z "$VERIFY_REFERENCE" ]; then
  VERIFY_REFERENCE="$REFERENCE"
fi

VERIFY_RESPONSE=$(curl -s -X GET "${API_URL}/payments/verify?reference=${VERIFY_REFERENCE}")

echo "$VERIFY_RESPONSE" | jq '.'

INVOICE_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.invoice_id')
echo -e "\nInvoice ID: ${INVOICE_ID}"

# ============================================
# STEP 7: Get Invoice
# ============================================
if [ -n "$INVOICE_ID" ] && [ "$INVOICE_ID" != "null" ]; then
  echo -e "\nStep 7: Get Invoice"
  INVOICE_RESPONSE=$(curl -s -X GET "${API_URL}/invoices/${INVOICE_ID}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo "$INVOICE_RESPONSE" | jq '.'
else
  echo -e "\nStep 7: Get Invoice"
  echo "No invoice ID from verification. Enter invoice ID manually:"
  read -r MANUAL_INVOICE_ID
  
  if [ -n "$MANUAL_INVOICE_ID" ]; then
    INVOICE_RESPONSE=$(curl -s -X GET "${API_URL}/invoices/${MANUAL_INVOICE_ID}" \
      -H "Authorization: Bearer ${TOKEN}")
    
    echo "$INVOICE_RESPONSE" | jq '.'
  fi
fi

echo -e "\n✅ Test Complete!"

