# Hustle Village - Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Current Features](#current-features)
3. [Database Schema](#database-schema)
4. [Frontend Structure](#frontend-structure)
5. [What's Working](#whats-working)
6. [Known Issues](#known-issues)
7. [Next Steps](#next-steps)
8. [Feature Status Summary](#-feature-status-summary)

---

## 🎯 Project Overview

**Hustle Village** is a student marketplace platform where students can:
- **Buyers**: Find and book services from other students
- **Sellers**: List and offer services to other students

The platform is built with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

---

## ✨ Current Features

### 1. **Authentication & User Management**
- ✅ User signup with role selection (buyer or seller)
- ✅ Email verification flow
- ✅ Login/Logout functionality
- ✅ User profile management
- ✅ Role-based access control

### 2. **Homepage (Landing Page)**
- ✅ Hero section with dynamic student count
- ✅ Dynamic category counts (tutoring, tech_dev)
- ✅ Student initials in avatar circles
- ✅ Category grid with tabs (fetched from database)
- ✅ Featured services section (verified services)
- ✅ Testimonials section (reviews from database)
- ✅ How It Works section
- ✅ Trust badges
- ✅ Footer

### 3. **Services**
- ✅ Browse all services with filtering
- ✅ Service detail page with:
  - Service information
  - Seller profile link
  - Reviews display
  - Related services
  - Similar services
- ✅ Category-based filtering
- ✅ Search functionality

### 4. **Seller Dashboard** (`/seller/*` or `/my-services`)
- ✅ **Dashboard** (`/seller/dashboard`):
  - Real-time stats (active services, bookings, earnings)
  - Recent bookings display
  - Upcoming bookings
  - Monthly earnings calculation

- ✅ **My Services** (`/seller/services` or `/my-services`):
  - View all seller's services
  - Create new services
  - Edit existing services
  - Toggle service status (active/paused)
  - Service management table

- ✅ **Bookings** (`/seller/bookings`):
  - View all bookings for seller's services
  - Filter by status (All, New, In Progress, Completed)
  - Booking details with buyer info
  - Service and amount display

- ✅ **Payments** (`/seller/payments`):
  - Available to withdraw (completed bookings)
  - Funds in escrow (pending/in-progress bookings)
  - Monthly earnings
  - Earnings history
  - Escrow items list

- ✅ **Profile** (`/seller/profile`):
  - View and edit profile information
  - Update first name, last name, phone
  - Email verification badge

### 5. **Categories**
- ✅ Dynamic category system
- ✅ Categories fetched from database
- ✅ Category icons (Lucide icons)
- ✅ Category tabs on homepage
- ✅ Category filtering on services page

### 6. **Reviews & Testimonials**
- ✅ Reviews table in database
- ✅ Reviews displayed on:
  - Service detail pages
  - Seller profile pages
  - Homepage testimonials section
- ✅ Review ratings (1-5 stars)
- ✅ Review text display
- ✅ Reviewer information

### 7. **Navigation**
- ✅ Responsive navbar
- ✅ User menu dropdown
- ✅ Role-based navigation items
- ✅ Protected routes
- ✅ Messages link with unread count badge

### 8. **Messaging System** ⭐ NEW
- ✅ Real-time messaging with Supabase Realtime
- ✅ Conversation list with last message preview
- ✅ Chat window with message history
- ✅ Send and receive messages in real-time
- ✅ Unread message count badges
- ✅ Chat header showing recipient name
- ✅ Auto-scroll to latest messages
- ✅ Message timestamps
- ✅ Create conversations from service pages
- ✅ Portfolio requirement validation (at least one field required for sellers)

---

## 🗄️ Database Schema

### Tables

#### `profiles`
- `id` (UUID, Primary Key, references auth.users)
- `first_name` (text, nullable)
- `last_name` (text, nullable)
- `phone` (text, nullable)
- `role` (text: 'buyer', 'seller')
- `profile_pic` (text, nullable)
- `created_at` (timestamp)

#### `categories`
- `id` (UUID, Primary Key)
- `slug` (text, unique)
- `name` (text)
- `description` (text, nullable)
- `icon_name` (text, nullable)
- `display_order` (integer)
- `is_active` (boolean)

#### `services`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → profiles.id)
- `title` (text)
- `description` (text)
- `category` (text, Foreign Key → categories.slug)
- `default_price` (numeric, nullable)
- `express_price` (numeric, nullable)
- `default_delivery_time` (text, nullable)
- `express_delivery_time` (text, nullable)
- `portfolio` (text, nullable)
- `is_active` (boolean, nullable)
- `is_verified` (boolean, nullable)
- `created_at` (timestamp)

#### `bookings`
- `id` (UUID, Primary Key)
- `buyer_id` (UUID, Foreign Key → profiles.id)
- `service_id` (UUID, Foreign Key → services.id)
- `date` (date)
- `time` (time)
- `status` (text: 'pending', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled')
- `created_at` (timestamp)
- `payment_status` (text, nullable)
- `payment_captured_at` (timestamp, nullable)
- `payment_released_at` (timestamp, nullable)
- `payment_amount` (numeric, nullable)
- `payment_transaction_id` (text, nullable)

#### `reviews`
- `id` (UUID, Primary Key)
- `reviewer_id` (UUID, Foreign Key → profiles.id)
- `reviewee_id` (UUID, Foreign Key → profiles.id)
- `service_id` (UUID, Foreign Key → services.id, nullable)
- `rating` (integer, 1-5)
- `review_text` (text, nullable)
- `created_at` (timestamp)

#### `conversations`
- `id` (UUID, Primary Key)
- `participant1_id` (UUID, Foreign Key → profiles.id)
- `participant2_id` (UUID, Foreign Key → profiles.id)
- `service_id` (UUID, Foreign Key → services.id, nullable)
- `last_message_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz, nullable)
- Unique constraint on (participant1_id, participant2_id, service_id)

#### `messages`
- `id` (UUID, Primary Key)
- `conversation_id` (UUID, Foreign Key → conversations.id)
- `sender_id` (UUID, Foreign Key → profiles.id)
- `content` (text, max 5000 characters)
- `is_read` (boolean, default false)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**Note**: Realtime is enabled for both `conversations` and `messages` tables for live updates.

---

## 📁 Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── SellerSidebar.tsx
│   │   │   └── StatCard.tsx
│   │   ├── landing/             # Landing page components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── CategoryGrid.tsx
│   │   │   ├── FeaturedServices.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── TrustBadges.tsx
│   │   │   └── Footer.tsx
│   │   ├── services/           # Service-related components
│   │   │   └── ServiceCard.tsx
│   │   ├── messages/           # Messaging components
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── Message.tsx
│   │   └── ui/                  # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── hooks/
│   │   ├── useCategories.ts     # Categories hook
│   │   ├── useUserType.ts       # User type hook
│   │   ├── useMessages.ts       # Messages hook with Realtime
│   │   ├── useConversations.ts # Conversations list hook
│   │   ├── useConversation.ts  # Get/create conversation hook
│   │   └── useUnreadCount.ts   # Unread message count hook
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts        # Supabase client
│   ├── layouts/
│   │   └── SellerDashboardLayout.tsx
│   ├── lib/
│   │   └── api.ts               # API client
│   ├── pages/
│   │   ├── Index.tsx            # Homepage
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── Services.tsx         # Browse services
│   │   ├── ServiceDetail.tsx    # Service detail page
│   │   ├── SellerProfile.tsx    # Public seller profile
│   │   ├── ListService.tsx      # Create service (public)
│   │   ├── Messages.tsx         # Messaging page
│   │   └── seller/              # Seller dashboard pages
│   │       ├── SellerDashboard.tsx
│   │       ├── SellerServices.tsx
│   │       ├── SellerBookings.tsx
│   │       ├── SellerPayments.tsx
│   │       └── SellerProfile.tsx
│   └── App.tsx                  # Main app with routes
```

---

## ✅ What's Working

### Fully Functional Features:

1. **User Authentication**
   - ✅ Signup with role selection
   - ✅ Email verification
   - ✅ Login/Logout
   - ✅ Session management

2. **Service Management**
   - ✅ Create services
   - ✅ Edit services
   - ✅ View services
   - ✅ Toggle service status
   - ✅ Category assignment

3. **Service Discovery**
   - ✅ Browse all services
   - ✅ Filter by category
   - ✅ Search services
   - ✅ View service details
   - ✅ View seller profiles

4. **Seller Dashboard**
   - ✅ Real-time statistics
   - ✅ Booking management
   - ✅ Payment tracking
   - ✅ Profile management

5. **Reviews System**
   - ✅ Display reviews
   - ✅ Show ratings
   - ✅ Reviewer information

6. **Dynamic Content**
   - ✅ Categories from database
   - ✅ Services from database
   - ✅ Reviews from database
   - ✅ User profiles from database

7. **Messaging System**
   - ✅ Real-time messaging with Supabase Realtime
   - ✅ Conversation management
   - ✅ Message sending and receiving
   - ✅ Unread message tracking
   - ✅ Chat interface with scrollable message history
   - ✅ Conversation list with last message preview
   - ✅ Create conversations from service pages

---

## ⚠️ Known Issues

1. **Booking Functionality**
   - ⚠️ Booking creation UI exists but may need backend integration
   - ⚠️ Booking status updates need seller actions

2. **Payment System**
   - ⚠️ Withdrawal functionality is disabled (UI exists)
   - ⚠️ Escrow system is calculated but not fully implemented
   - ⚠️ Payment processing not integrated

3. **Profile Features**
   - ⚠️ Bio field exists but not in database schema yet
   - ⚠️ Profile picture upload not implemented

4. **Service Images**
   - ⚠️ Service images not implemented (using placeholders)
   - ⚠️ Image upload functionality missing

5. **Email Notifications**
   - ⚠️ Email notifications for new messages removed (can be re-implemented later)
   - ⚠️ Requires SMTP configuration and tunnel service (ngrok/cloudflare) for local development

6. **Email Verification**
   - ⚠️ Email verification flow exists but may need SMTP configuration

---

## 🚀 Next Steps

### Priority 1: Core Functionality

#### 1. **Booking System**
- [ ] Implement booking creation from service detail page
- [ ] Add booking acceptance/rejection for sellers
- [ ] Implement booking status updates (in_progress → completed)
- [ ] Add booking cancellation functionality
- [ ] Create booking detail page

#### 2. **Payment Integration**
- [ ] Integrate payment gateway (e.g., Stripe, Paystack)
- [ ] Implement escrow system
- [ ] Add withdrawal functionality
- [ ] Create payment history with real transactions
- [ ] Add payment status tracking

#### 3. **Service Images**
- [ ] Add image upload functionality
- [ ] Implement image storage (Supabase Storage)
- [ ] Update service creation/edit forms with image upload
- [ ] Display images on service cards and detail pages
- [ ] Add image gallery for services

### Priority 2: Enhanced Features

#### 4. **Email Notifications** (Previously removed, can be re-implemented)
- [ ] Re-implement email notifications for new messages
- [ ] Set up SMTP service (Gmail, SendGrid, Mailgun, etc.)
- [ ] Configure database trigger to call backend API
- [ ] Use tunnel service (ngrok/cloudflare) or deploy backend for production
- [ ] Add email notification preferences

#### 5. **Profile Enhancements**
- [ ] Add bio field to profiles table
- [ ] Implement profile picture upload
- [ ] Add portfolio/gallery section
- [ ] Add social media links
- [ ] Add verification badges

#### 6. **Reviews & Ratings**
- [ ] Implement review creation form
- [ ] Add review submission after completed bookings
- [ ] Add review editing/deletion
- [ ] Implement review moderation
- [ ] Add review helpfulness voting

### Priority 3: User Experience

#### 7. **Search & Filtering**
- [ ] Enhance search with filters (price range, rating, location)
- [ ] Add sorting options (price, rating, newest)
- [ ] Implement saved searches
- [ ] Add search suggestions

#### 8. **In-App Notifications**
- [ ] Implement in-app notification system
- [ ] Add notification bell/indicator
- [ ] Show notifications for new messages, bookings, etc.
- [ ] Add notification preferences
- [ ] Mark notifications as read

#### 9. **Mobile Optimization**
- [ ] Optimize for mobile devices
- [ ] Add mobile-specific features
- [ ] Implement responsive design improvements
- [ ] Add mobile app (optional)

### Priority 4: Business Features

#### 10. **Analytics & Reporting**
- [ ] Add seller analytics dashboard
- [ ] Implement sales reports
- [ ] Add booking trends
- [ ] Create admin dashboard

#### 11. **Admin Panel**
- [ ] Create admin authentication
- [ ] Add service verification system
- [ ] Implement user management
- [ ] Add category management
- [ ] Add dispute resolution

#### 12. **Marketing Features**
- [ ] Add service promotion system
- [ ] Implement featured listings
- [ ] Add discount/coupon system
- [ ] Create referral program

### Priority 5: Technical Improvements

#### 13. **Performance**
- [ ] Implement caching strategy
- [ ] Optimize database queries
- [ ] Add pagination for large lists
- [ ] Implement lazy loading

#### 14. **Security**
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Add input validation
- [ ] Implement file upload security

#### 15. **Testing**
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Set up CI/CD pipeline

---

## 📝 Development Notes

### Environment Variables Required

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Run migrations to create tables
2. Set up Row Level Security (RLS) policies
3. Create indexes for performance
4. Set up foreign key constraints

### Role System

- **buyer**: Can book services, leave reviews
- **seller**: Can create services, manage bookings

### Important Files

- `frontend/src/integrations/supabase/client.ts` - Supabase configuration (includes Realtime setup)
- `frontend/src/contexts/AuthContext.tsx` - Authentication logic
- `frontend/src/hooks/useCategories.ts` - Categories hook
- `frontend/src/hooks/useMessages.ts` - Real-time messaging hook
- `frontend/src/hooks/useConversations.ts` - Conversations list hook
- `frontend/src/hooks/useConversation.ts` - Get/create conversation hook
- `frontend/src/pages/Messages.tsx` - Main messaging page
- `frontend/src/App.tsx` - Routing configuration

### Messaging System Setup

The messaging system uses Supabase Realtime for instant message delivery:

1. **Database Tables**:
   - `conversations`: Stores conversation metadata between two users
   - `messages`: Stores individual messages within conversations

2. **Realtime Subscriptions**:
   - Subscribes to `INSERT` and `UPDATE` events on `messages` table
   - Subscribes to `UPDATE` events on `conversations` table
   - Automatically updates UI when new messages arrive

3. **Row Level Security (RLS)**:
   - Users can only access conversations they are participants in
   - Users can only read messages from their conversations
   - Users can only send messages to conversations they belong to

4. **Features**:
   - Real-time message delivery
   - Unread message counts
   - Last message preview in conversation list
   - Auto-scroll to latest messages
   - Message timestamps
   - Create conversations from service pages

---

## 🔗 Useful Links

- Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- React Router Docs: [https://reactrouter.com](https://reactrouter.com)
- shadcn/ui: [https://ui.shadcn.com](https://ui.shadcn.com)

---

## 📞 Support

For issues or questions, please refer to the codebase or contact the development team.

---

---

## 🆕 Recent Improvements (January 2025)

### Messaging System Implementation
- ✅ **Real-time Messaging**: Fully implemented using Supabase Realtime
  - Instant message delivery
  - Live conversation updates
  - Unread message tracking
  - Conversation list with last message preview
  - Chat window with auto-scrolling
  - Message timestamps
  - Create conversations from service detail pages

### Signup Flow Enhancements
- ✅ **Conversational Signup**: Typeform-like step-by-step flow for sellers
- ✅ **Portfolio Validation**: At least one portfolio field (description, links, or images) is now required for sellers
- ✅ **User Type Simplification**: Removed "Both" user type option, now only "Buyer" or "Seller"

### Code Quality
- ✅ **Removed Console Logs**: All development `console.log` statements removed for production readiness
- ✅ **Error Handling**: Improved error handling and user feedback

### UI/UX Improvements
- ✅ **Messaging UI**: Fixed scrolling issues in chat window
- ✅ **Conversation List**: Improved visibility with proper text colors and layout
- ✅ **Active Conversation Highlight**: Selected rows now keep white typography over the green background for consistent readability.
- ✅ **Navigation**: Added messages icon with unread count badge

### Next Steps After Latest Fix
- [ ] Verify the conversation list in both light and dark themes (hover/focus states) to ensure the new color tokens remain accessible.
- [ ] Add Storybook examples or visual regression coverage for `ConversationList` to guard against future styling regressions.
- [ ] Plan upcoming messaging UX polish (typing indicators, read receipts) once the base visuals are validated.

### Messaging UX Polish Plan
- **Goal**: Layer richer chat affordances (typing status, read receipts) on top of the stabilized visuals without regressing realtime performance.
- **Typing Indicators**
  - **Backend**: Add a `typing_status` table (conversation_id, user_id, is_typing, updated_at) with RLS mirroring `messages`. Expose lightweight RPC or Supabase Realtime channel for inserts/updates.
  - **Frontend Hooks**: Extend `useMessages` or create `useTypingStatus` to publish `isTyping` events on keydown (debounced) and subscribe for other participants.
  - **UI**: Render a subtle “User is typing…” row above the composer and bubble placeholder in `ChatWindow`.
- **Read Receipts**
  - **Database**: We already track `is_read` / `read_at`; add an index on `(conversation_id, sender_id, is_read)` for quick queries and ensure Supabase trigger updates `conversations.last_message.read_at`.
  - **API/Hooks**: Update `useMessages` to expose `lastReadMessageId` per participant (query latest message with `is_read=true` for other user). Publish read updates via the existing UPDATE realtime channel.
  - **UI**: 
    - Message component: show single-check icon for sent, double-check for delivered, filled double-check when read (based on `read_at`).
    - Conversation list: replace unread badge with “Seen • {time}” when all messages are read.
- **Validation**
  - Add Storybook stories demonstrating typing + read receipt states.
  - Add cypress test that asserts read receipt icon updates after switching between accounts.

---

## 📊 Feature Status Summary

### ✅ Fully Implemented & Working
- User Authentication (Signup, Login, Email Verification)
- Service Management (Create, Edit, View, Toggle Status)
- Service Discovery (Browse, Filter, Search)
- Seller Dashboard (Stats, Bookings, Payments, Profile)
- Reviews & Ratings Display
- **Messaging System** (Real-time chat, conversations, unread counts)
- Conversational Signup Flow for Sellers
- Portfolio Validation (at least one field required)
- Dynamic Categories & Services
- Role-based Access Control

### ⚠️ Partially Implemented
- Booking System (UI exists, needs full backend integration)
- Payment System (Calculations done, needs gateway integration)
- Service Images (Schema ready, upload functionality needed)

### ❌ Not Yet Implemented
- Email Notifications (removed, can be re-added)
- Profile Picture Upload
- Review Creation Form
- Admin Panel
- Advanced Search & Filtering
- Analytics Dashboard

---

**Last Updated**: January 2025
**Version**: 1.1.0

