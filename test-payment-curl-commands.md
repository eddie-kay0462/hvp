# Payment & Invoice Flow - cURL Commands

Complete step-by-step cURL commands to test the payment and invoice flow.

## Prerequisites

1. Server running on `http://localhost:3000` (or update `BASE_URL`)
2. Valid user account (email and password)
3. At least one service in the database (or know a `serviceId`)
4. `jq` installed for pretty JSON output (optional): `brew install jq` or `apt-get install jq`

---

## Step 1: Health Check

```bash
curl -X GET "http://localhost:3000/health" | jq '.'
```

---

## Step 2: Login

**Replace `your-email@example.com` and `your-password` with your credentials.**

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }' | jq '.'
```

**Save the `access_token` from the response:**

```bash
# Extract token (save this)
TOKEN="your-access-token-here"
```

**Or use jq to extract it:**

```bash
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | jq -r '.data.session.access_token')
```

---

## Step 3: Get Available Services (Optional)

**If you don't have a serviceId, fetch one:**

```bash
curl -X GET "http://localhost:3000/api/services" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

**Extract the first service ID:**

```bash
SERVICE_ID=$(curl -s -X GET "http://localhost:3000/api/services" \
  -H "Authorization: Bearer ${TOKEN}" \
  | jq -r '.data.services[0].id')
```

---

## Step 4: Create a Booking

**Replace `SERVICE_ID` with an actual service ID:**

```bash
curl -X POST "http://localhost:3000/api/bookings/book-now" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "SERVICE_ID_HERE"
  }' | jq '.'
```

**Extract booking ID:**

```bash
BOOKING_ID=$(curl -s -X POST "http://localhost:3000/api/bookings/book-now" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"serviceId\": \"${SERVICE_ID}\"}" \
  | jq -r '.data.id')
```

---

## Step 5: Initiate Payment

**Replace `BOOKING_ID` with the booking ID from Step 4:**

```bash
curl -X POST "http://localhost:3000/api/payments/initiate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "BOOKING_ID_HERE"
  }' | jq '.'
```

**Response will include:**

- `authorization_url`: URL to complete payment on Paystack
- `reference`: Payment reference for verification

**Extract reference:**

```bash
REFERENCE=$(curl -s -X POST "http://localhost:3000/api/payments/initiate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\": \"${BOOKING_ID}\"}" \
  | jq -r '.data.reference')
```

**⚠️ IMPORTANT:**

- Visit the `authorization_url` in your browser to complete the payment on Paystack
- After payment is successful, Paystack will redirect to your callback URL
- Use the `reference` to verify the payment in Step 6

---

## Step 6: Verify Payment

**Replace `REFERENCE` with the payment reference from Step 5:**

```bash
curl -X GET "http://localhost:3000/api/payments/verify?reference=REFERENCE_HERE" | jq '.'
```

**Note:** This endpoint is public (no auth required) as it's called by Paystack's webhook.

**Extract invoice ID:**

```bash
INVOICE_ID=$(curl -s -X GET "http://localhost:3000/api/payments/verify?reference=${REFERENCE}" \
  | jq -r '.data.invoice_id')
```

---

## Step 7: Get Invoice

**Replace `INVOICE_ID` with the invoice ID from Step 6:**

```bash
curl -X GET "http://localhost:3000/api/invoices/INVOICE_ID_HERE" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

---

## Complete Flow (All Steps Together)

**Set your variables first:**

```bash
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"
EMAIL="your-email@example.com"
PASSWORD="your-password"
SERVICE_ID="your-service-id"  # Optional
```

**Run all steps:**

```bash
# Step 1: Health Check
curl -X GET "${BASE_URL}/health" | jq '.'

# Step 2: Login
TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  | jq -r '.data.session.access_token')

# Step 3: Get Service (if needed)
if [ -z "$SERVICE_ID" ]; then
  SERVICE_ID=$(curl -s -X GET "${API_URL}/services" \
    -H "Authorization: Bearer ${TOKEN}" \
    | jq -r '.data.services[0].id')
fi

# Step 4: Create Booking
BOOKING_ID=$(curl -s -X POST "${API_URL}/bookings/book-now" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"serviceId\":\"${SERVICE_ID}\"}" \
  | jq -r '.data.id')

# Step 5: Initiate Payment
PAYMENT_RESPONSE=$(curl -s -X POST "${API_URL}/payments/initiate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"${BOOKING_ID}\"}")

REFERENCE=$(echo "$PAYMENT_RESPONSE" | jq -r '.data.reference')
AUTH_URL=$(echo "$PAYMENT_RESPONSE" | jq -r '.data.authorization_url')

echo "Payment Reference: ${REFERENCE}"
echo "Authorization URL: ${AUTH_URL}"
echo "⚠️  Complete payment on Paystack, then verify with the reference"

# Step 6: Verify Payment (after payment is complete)
read -p "Enter payment reference: " REFERENCE
INVOICE_ID=$(curl -s -X GET "${API_URL}/payments/verify?reference=${REFERENCE}" \
  | jq -r '.data.invoice_id')

# Step 7: Get Invoice
curl -X GET "${API_URL}/invoices/${INVOICE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

---

## Testing with Paystack Test Cards

**For testing, use Paystack test cards:**

- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000` (for ATM cards)
- OTP: `123456` (for OTP verification)

**Test Success Response:**

- Use card ending in `4081` for successful transactions

**Test Failure Response:**

- Use card ending in `4082` for failed transactions

---

## Troubleshooting

### 401 Unauthorized

- Check that your token is valid and not expired
- Make sure you're including `Bearer ` prefix in Authorization header

### 404 Not Found

- Verify the booking/service/invoice ID exists
- Check that you're using the correct user account

### 403 Forbidden

- Ensure you're the owner of the booking/invoice
- Check that the resource belongs to your user account

### Payment Verification Fails

- Ensure payment was actually completed on Paystack
- Check that the reference matches the one from Paystack
- Verify Paystack webhook is configured correctly

---

## Environment Variables

Make sure these are set in your `.env` file:

- `PAYSTACK_SECRET_KEY`: Your Paystack secret key
- `PAYSTACK_BASE_URL`: Paystack API URL (default: `https://api.paystack.co`)
- `FRONTEND_URL`: Your frontend URL for callbacks
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
