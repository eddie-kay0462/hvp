# API Testing Commands

This file contains curl commands to test all API endpoints. Replace `YOUR_ACCESS_TOKEN` with the actual token received from login.

## Base URL
```bash
BASE_URL="http://localhost:3000"
```

## 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```

## 2. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "233123456789",
    "profilePic": "https://example.com/profile.jpg",
    "role": "customer"
  }'
```

**Expected Response:**
```json
{
  "status": 201,
  "msg": "Signup successful. Please verify your email.",
  "data": {
    "userId": "user-uuid",
    "email": "test@example.com"
  }
}
```

**Note:** After signup, check your email for verification link. The role can be: "customer", "seller", or "admin".

## 3. Resend Verification Email
```bash
curl -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Verification email sent",
  "data": null
}
```

## 4. Verify Email
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_VERIFICATION_TOKEN",
    "type": "signup"
  }'
```

**Note:** Get the token from the verification email link. The token is usually in the URL as a hash parameter.

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Email verified successfully",
  "data": {
    "user": {...},
    "session": {
      "access_token": "...",
      "refresh_token": "..."
    }
  }
}
```

## 5. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "test@example.com",
      ...
    },
    "session": {
      "access_token": "YOUR_ACCESS_TOKEN",
      "refresh_token": "YOUR_REFRESH_TOKEN",
      "expires_at": 1234567890
    }
  }
}
```

**Important:** Copy the `access_token` from the response. You'll need it for protected endpoints.

## 6. Get Current User (Me)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "User retrieved",
  "data": {
    "id": "user-uuid",
    "email": "test@example.com",
    "user_metadata": {
      "firstName": "John",
      "lastName": "Doe",
      ...
    }
  }
}
```

## 7. Setup Seller
```bash
curl -X POST http://localhost:3000/api/sellers/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Awesome Service",
    "description": "I provide excellent services",
    "category": "design",
    "default_price": 50.00,
    "default_delivery_time": 3,
    "express_price": 75.00,
    "express_delivery_time": 1
  }'
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Seller info saved successfully",
  "data": {
    "id": "seller-id",
    "user_id": "user-uuid",
    "title": "My Awesome Service",
    ...
  }
}
```

## 8. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Logout successful",
  "data": null
}
```

## 9. Get All Products
```bash
curl -X GET "http://localhost:3000/api/products?limit=10&offset=0"
```

**With Filters:**
```bash
# Filter by category
curl -X GET "http://localhost:3000/api/products?category=design&limit=10"

# Search products
curl -X GET "http://localhost:3000/api/products?search=logo&limit=10"

# Sort and paginate
curl -X GET "http://localhost:3000/api/products?sortBy=price&order=asc&limit=20&offset=0"
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "title": "Product Title",
        "description": "Product description",
        "price": 50.00,
        "category": "design",
        "seller": {
          "id": "seller-uuid",
          "title": "Seller Name",
          "description": "Seller description"
        }
      }
    ],
    "count": 10,
    "limit": 10,
    "offset": 0
  }
}
```

## 10. Get Product by ID
```bash
curl -X GET http://localhost:3000/api/products/PRODUCT_ID
```

**Expected Response:**
```json
{
  "status": 200,
  "msg": "Product retrieved successfully",
  "data": {
    "id": "product-uuid",
    "title": "Product Title",
    "description": "Product description",
    "price": 50.00,
    "category": "design",
    "is_active": true,
    "seller": {
      "id": "seller-uuid",
      "title": "Seller Name",
      "description": "Seller description",
      "portfolio": "portfolio-url"
    }
  }
}
```

**Error Response (Product Not Found):**
```json
{
  "status": 404,
  "msg": "Product not found",
  "data": null
}
```

---

## Complete Test Flow

Here's a complete test flow you can run:

```bash
# 1. Sign up
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "233123456789",
    "role": "customer"
  }')

echo "Signup Response: $SIGNUP_RESPONSE"

# 2. Resend verification (if needed)
curl -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. After verifying email, login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "Login Response: $LOGIN_RESPONSE"

# Extract access token (requires jq or manual extraction)
# ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.session.access_token')

# 4. Get current user
# curl -X GET http://localhost:3000/api/auth/me \
#   -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Setup seller (if role is seller)
# curl -X POST http://localhost:3000/api/sellers/setup \
#   -H "Authorization: Bearer $ACCESS_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "title": "My Service",
#     "description": "Service description",
#     "category": "design",
#     "default_price": 50.00,
#     "default_delivery_time": 3
#   }'
```

## Error Testing

### Test without token (should fail)
```bash
curl -X GET http://localhost:3000/api/auth/me
```

### Test with invalid token (should fail)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

### Test signup with missing fields (should fail)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Notes

1. **Email Verification**: After signup, you must verify your email before you can use protected endpoints (except login might work depending on Supabase settings).

2. **Token Expiration**: Access tokens expire. If you get a 401 error, login again to get a new token.

3. **Role-based Access**: The `role` field in signup determines user type. Use "seller" for sellers, "customer" for buyers, "admin" for administrators.

4. **Environment**: Make sure your server is running on port 3000 (or update the URLs accordingly).

5. **Supabase Setup**: Ensure your Supabase project has:
   - Email verification enabled
   - Proper email templates configured
   - Database tables created (sellers table for seller setup)

