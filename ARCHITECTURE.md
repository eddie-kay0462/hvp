# Ecommerce Platform Architecture

## Overview
This is an ecommerce platform backend built with Node.js, Express, and Supabase. The architecture follows a clean separation of concerns with Routes → Controllers → Services → Database pattern.

## Project Structure

```
src/
├── config/
│   └── supabase.js          # Supabase client configuration (anon & admin clients)
├── controllers/
│   ├── authController.js    # Authentication request handlers
│   └── sellerController.js  # Seller-related request handlers
├── services/
│   ├── authService.js       # Authentication business logic
│   └── sellerService.js     # Seller business logic
├── routes/
│   ├── authRoutes.js        # Authentication route definitions
│   └── sellerRoutes.js      # Seller route definitions
├── middleware/
│   ├── responseHandler.js   # Wraps controllers to handle responses
│   └── errorHandler.js      # Global error handling
└── server.js                # Main application entry point
```

## Architecture Pattern

### Request Flow
```
Client Request → Route → Middleware (optional) → Controller → Service → Supabase → Response
```

### 1. **Routes** (`src/routes/`)
- Define HTTP endpoints
- Use `responseHandler` middleware to wrap controller functions
- Pattern: `router.post('/endpoint', responseHandler(controller.method))`
- Example:
  ```javascript
  router.post('/signup', responseHandler(authController.signup));
  ```

### 2. **Controllers** (`src/controllers/`)
- Handle HTTP request/response logic
- Extract data from `req.body`, `req.params`, `req.headers`
- Validate input
- Call service functions
- Return objects with format: `{ status, msg, data }`
- **Do NOT** call `res.json()` directly - `responseHandler` does this
- Example:
  ```javascript
  export const signup = async (req) => {
    const { email, password } = req.body;
    // validation...
    const result = await authService.signup({ email, password });
    return { status: result.status, msg: result.msg, data: result.data };
  };
  ```

### 3. **Services** (`src/services/`)
- Contain business logic
- Interact with Supabase (database/auth)
- Return objects with format: `{ status, msg, data }`
- Handle errors and return appropriate status codes
- Example:
  ```javascript
  export const signup = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { status: 400, msg: error.message, data: null };
    return { status: 201, msg: "Success", data: data.user };
  };
  ```

### 4. **Middleware**

#### `responseHandler.js`
- Wraps controller functions
- Automatically sends JSON response based on controller return value
- Handles errors and passes to error handler
- Pattern: `responseHandler(controller.method)`

#### `errorHandler.js`
- Global error handling middleware
- 404 handler for unknown routes
- Error formatter for development/production

## Response Format

All responses follow this structure:
```javascript
{
  status: 200,        // HTTP status code
  msg: "Success",     // Human-readable message
  data: {}            // Response data (or null)
}
```

The `responseHandler` automatically:
- Sets HTTP status code from `result.status`
- Sends JSON response with the entire result object

## Authentication

### Current Implementation
- Uses Supabase Auth
- Signup with email verification
- Login with email/password
- Token-based authentication (Bearer tokens)

### Token Usage
- Tokens extracted from `Authorization: Bearer <token>` header
- Example in controller:
  ```javascript
  const accessToken = req.headers.authorization?.replace("Bearer ", "");
  ```

### Missing Components
- **Auth Middleware**: No `verifyToken` or `verifyAdminToken` middleware yet
- Seller routes expect `req.user` but no middleware sets it
- Need to create authentication middleware to:
  - Verify JWT tokens
  - Extract user info
  - Set `req.user` for protected routes
  - Check user roles (admin, seller, customer)

## Database

### Supabase Configuration
- **Anon Client**: For user-facing operations (uses anon key)
- **Admin Client**: For server-side operations (uses service role key)
- Both clients exported from `src/config/supabase.js`

### Tables (Expected)
- `sellers` - Seller information linked to users
- Other ecommerce tables (products, orders, etc.) to be added

## Current Features

### Authentication
- ✅ User signup with email verification
- ✅ User login
- ✅ Email verification
- ✅ Resend verification email
- ✅ Get current user (`/api/auth/me`)
- ✅ Logout

### Seller
- ✅ Seller setup endpoint (`/api/sellers/setup`)
- ⚠️ Needs authentication middleware (expects `req.user`)

## Missing/Incomplete Features

1. **Authentication Middleware**
   - `verifyToken` - Verify user token and set `req.user`
   - `verifyAdminToken` - Verify admin token
   - `verifySellerToken` - Verify seller token

2. **Seller Routes Registration**
   - Seller routes not registered in `server.js`
   - Need to add: `app.use('/api/sellers', sellerRoutes)`

3. **Ecommerce Core Features**
   - Products (CRUD)
   - Orders
   - Cart
   - Categories
   - Reviews/Ratings
   - Payments integration

4. **User Management**
   - User profiles
   - Role management
   - Permissions

## Code Patterns

### Adding a New Feature

1. **Create Service** (`src/services/featureService.js`)
   ```javascript
   import { supabase } from '../config/supabase.js';
   
   export const createFeature = async (data) => {
     const { data: result, error } = await supabase
       .from('table_name')
       .insert(data)
       .select()
       .single();
     
     if (error) return { status: 400, msg: error.message, data: null };
     return { status: 201, msg: "Created", data: result };
   };
   ```

2. **Create Controller** (`src/controllers/featureController.js`)
   ```javascript
   import * as featureService from '../services/featureService.js';
   
   export const createFeature = async (req) => {
     const { name, description } = req.body;
     if (!name) return { status: 400, msg: "Name required", data: null };
     
     const result = await featureService.createFeature({ name, description });
     return { status: result.status, msg: result.msg, data: result.data };
   };
   ```

3. **Create Routes** (`src/routes/featureRoutes.js`)
   ```javascript
   import express from 'express';
   import featureController from '../controllers/featureController.js';
   import { responseHandler } from '../middleware/responseHandler.js';
   
   const router = express.Router();
   router.post('/create', responseHandler(featureController.createFeature));
   
   export default router;
   ```

4. **Register in server.js**
   ```javascript
   import featureRoutes from './routes/featureRoutes.js';
   app.use('/api/features', featureRoutes);
   ```

## Environment Variables

Required in `.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Key Principles

1. **Separation of Concerns**: Routes handle routing, Controllers handle HTTP, Services handle business logic
2. **Consistent Response Format**: All functions return `{ status, msg, data }`
3. **Error Handling**: Services return error status codes, not throw exceptions
4. **No Direct Response**: Controllers return objects, `responseHandler` sends responses
5. **ES6 Modules**: Uses `import/export` syntax
6. **Async/Await**: All async operations use async/await pattern

