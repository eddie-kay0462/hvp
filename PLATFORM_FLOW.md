# Hustle Village — How It Works (End to End)

This document explains the full journey on Hustle Village in plain language — from signing up to getting paid. It covers what every type of user experiences at each step, and what happens automatically behind the scenes.

---

## Who Uses the Platform

| Role | Who they are |
|---|---|
| **Buyer** | Someone looking to hire a service |
| **Provider (Seller)** | Someone offering a skill or service for hire |
| **Admin** | The Hustle Village team — approves services and verifies payments |

---

## Part 1 — Becoming a Provider

### Step 1: Sign Up
A provider creates an account, verifies their email, and fills in their profile.

### Step 2: List a Service
The provider submits a service listing — they describe what they offer, set a price, pick a category, and optionally add portfolio work.

### Step 3: Admin Reviews the Service
The service is not live yet. It goes into a review queue.

- **Admin gets an email:** "New service pending approval — [title]"
- Admin reviews the listing on the admin dashboard.

### Step 4: Approved or Rejected
- **If approved:** The service goes live on the marketplace. The provider gets an email: *"Your service has been approved! Customers can start booking."*
- **If rejected:** The provider gets an email with the team's feedback explaining what needs to change. They can edit and resubmit.

---

## Part 2 — A Buyer Books a Service

### Step 1: Browse & Book
A buyer browses the marketplace, finds a service they like, and clicks Book. They can schedule a date and time, or book instantly.

### Step 2: Provider Gets Notified
The moment the booking is created, the provider gets an email: *"You have a new booking — [buyer name] booked [service title]. Log in to accept."*

The booking sits in **Pending** status until the provider responds.

### Step 3: Provider Accepts
The provider logs into their dashboard and accepts the booking.

- **Buyer gets an email:** *"Great news — [provider name] has accepted your booking for [service]. They'll be in touch to coordinate."*

The booking is now **Accepted**.

---

## Part 3 — Payment

Payment must happen before the work can be confirmed as complete. The platform currently uses **Mobile Money (MoMo) manual checkout**.

### Step 1: Buyer Pays
On the booking page, the buyer clicks **Pay Now**. A dialog opens showing:
- The Hustle Village MoMo number to send money to
- The exact amount to send
- A reference code to include in the payment narration
- Supported networks (MTN, Vodafone, AirtelTigo)

The buyer sends the money from their phone, then comes back to the booking page and submits:
1. The **transaction ID** from their confirmation SMS
2. A **screenshot** of the payment confirmation

### Step 2: Admin Gets Notified
The moment proof is submitted, the admin gets an email: *"MoMo payment proof submitted — [buyer name], GH₵ [amount], Txn ID: [id]. Open the verification queue."*

The booking is now in **Pending Review** status. The buyer sees a message on the booking page: *"We received your receipt. Our team will verify it within 24 hours."*

### Step 3: Admin Verifies
The admin opens the MoMo verification dashboard (`/admin/payments/momo`), checks the transaction ID against their MoMo account statement, and either approves or rejects.

**If approved:**
- The booking is marked as **Paid**
- Buyer gets an email: *"Your payment has been confirmed."*
- Provider gets an email: *"Your booking for [service] is now paid — you're good to proceed."*

**If rejected:**
- The booking goes back to unpaid
- Buyer gets an email explaining why (e.g. wrong amount, ID not found) and a link to resubmit
- The buyer can click Pay Now again and submit a new transaction ID and screenshot

---

## Part 4 — Delivering the Work

### Step 1: Provider Works
With payment confirmed, the provider and buyer coordinate (via messages or however agreed). The provider works on the job.

The provider can update the booking status in their dashboard:
- **Accepted → In Progress:** Work has started
- **In Progress → Delivered:** Work is done and submitted to the buyer

### Step 2: Buyer Gets Notified the Work is Done
When the provider marks the booking as Delivered, the buyer gets an email: *"Your service '[title]' has been marked as delivered. Please log in to confirm completion and release payment."*

---

## Part 5 — Completion & Payment Release

### Step 1: Buyer Confirms
The buyer reviews the delivered work. If satisfied, they click **Confirm Completion & Release Payment** on the booking page.

### Step 2: Payment Released
The booking is marked **Completed** and the payment is marked **Released**.

- **Provider gets an email:** *"The buyer confirmed completion of [service]. Your payment of GH₵ [amount] has been released."*

> At this stage with MoMo manual mode, the money was already received by Hustle Village when the buyer paid. "Released" means it is now cleared for payout to the provider — the admin processes this manually by sending the provider their share via MoMo.

### Step 3: Buyer Leaves a Review (Optional)
After completion, the buyer is prompted to leave a star rating and written review for the provider. This helps build the provider's reputation on the platform.

---

## Part 6 — Cancellations

Either party can cancel a booking while it is still **Pending** or **Accepted**.

- **Buyer cancels:** Provider gets an email — *"[Buyer] has cancelled their booking for [service]."*
- **Provider cancels:** Buyer gets an email — *"Your booking for [service] has been cancelled by the provider."*

Once work is **In Progress** or **Delivered**, only the provider can cancel. The buyer must either confirm or contact support to dispute.

---

## Summary — Email Notifications at a Glance

| What happens | Who gets an email |
|---|---|
| Provider submits a service | Admin |
| Admin approves service | Provider |
| Admin rejects service | Provider (with feedback) |
| Buyer creates a booking | Provider |
| Provider accepts the booking | Buyer |
| Buyer submits MoMo payment proof | Admin |
| Admin approves MoMo payment | Buyer + Provider |
| Admin rejects MoMo payment | Buyer (with reason, can resubmit) |
| Provider marks work as delivered | Buyer (to confirm) |
| Buyer confirms completion | Provider (payment released) |
| Buyer cancels booking | Provider |
| Provider cancels booking | Buyer |

---

## Booking Status Journey

```
Created → Pending
           ↓ (provider accepts)
        Accepted
           ↓ (provider starts work)
        In Progress
           ↓ (provider submits work)
        Delivered
           ↓ (buyer confirms)
        Completed ✓
```

Payment runs alongside:
```
No payment → (buyer pays MoMo) → Pending Review
              ↓ (admin verifies)
            Paid
              ↓ (buyer confirms completion)
            Released ✓
```

---

*Last updated: May 2026*
