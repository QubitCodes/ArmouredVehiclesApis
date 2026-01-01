# Stripe Integration - Quick Setup Guide

Welcome! This guide will help you quickly integrate Stripe payment processing into your Armoured Vehicles Web application.

## What Has Been Implemented ✅

### Backend

- ✅ Enhanced Stripe client configuration (`server/stripeClient.ts`)
- ✅ Checkout session creation endpoint (`POST /api/checkout/create-session`)
- ✅ Webhook handler for payment events (`POST /api/checkout/webhook`)
- ✅ Support for both environment variables and Replit connectors

### Frontend

- ✅ Cart checkout flow integration
- ✅ Payment method selection (Stripe card)
- ✅ Order summary with tax & shipping calculation
- ✅ Success/failure handling

### Configuration

- ✅ `.env.example` template with all required variables
- ✅ Comprehensive integration guide (STRIPE_INTEGRATION.md)

---

## 🚀 Quick Start (5 minutes)

### 1. Create Stripe Account

- Go to https://stripe.com and sign up
- Complete email verification

### 2. Get API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy your test keys:
   - Publishable Key (starts with `pk_test_`)
   - Secret Key (starts with `sk_test_`)

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Stripe keys
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### 4. Test the Integration

```bash
# Start your app
npm run dev

# Open browser and go to cart
# Add products and click "Proceed to Checkout"

# Use test card: 4242 4242 4242 4242
# Any future expiry date, any 3-digit CVV
```

---

## 📋 Complete Setup Checklist

### Development Setup

- [ ] Create Stripe account
- [ ] Copy `.env.example` to `.env`
- [ ] Add `STRIPE_PUBLISHABLE_KEY` to `.env`
- [ ] Add `STRIPE_SECRET_KEY` to `.env`
- [ ] Start app with `npm run dev`
- [ ] Test payment with test card

### Webhook Setup (Optional but Recommended)

- [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Run: `stripe listen --forward-to localhost:5000/api/checkout/webhook`
- [ ] Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### Production Deployment

- [ ] Get live API keys from Stripe Dashboard
- [ ] Update `.env` with live keys
- [ ] Set up webhook endpoint in Stripe Dashboard
- [ ] Test with real (small) transaction
- [ ] Deploy to production

---

## 🧪 Testing Payment Flow

### Test Card Numbers

```
Visa Success:    4242 4242 4242 4242
Visa Decline:    4000 0000 0000 0002
Mastercard:      5555 5555 5555 4444
American Express: 378282246310005
```

### Test Email & Details

- Email: test@example.com
- Name: Test Customer
- Zip: 12345

### Test Flow

1. Add products to cart
2. Go to checkout
3. Use test card number above
4. Complete payment
5. Verify order is created and status updates

---

## 📁 Key Files Modified/Created

### New Files

- `STRIPE_INTEGRATION.md` - Comprehensive integration guide
- `.env.example` - Environment variables template

### Modified Files

- `server/stripeClient.ts` - Enhanced Stripe client with better error handling
- `server/routes.ts` - Enhanced checkout endpoint and webhook handler

---

## 🔑 Environment Variables Reference

```env
# Required for Stripe integration
STRIPE_PUBLISHABLE_KEY=pk_test_...    # Frontend
STRIPE_SECRET_KEY=sk_test_...         # Backend
STRIPE_WEBHOOK_SECRET=whsec_...       # Webhook verification

# Optional but recommended
APP_URL=http://localhost:5000         # For payment redirects
```

---

## 🎯 API Endpoints

### Create Checkout Session

```
POST /api/checkout/create-session
Authorization: Bearer {access_token}

Response:
{
  "url": "https://checkout.stripe.com/pay/...",
  "orderId": "order-123",
  "sessionId": "cs_test_..."
}
```

### Webhook Endpoint

```
POST /api/checkout/webhook
Stripe-Signature: {signature}

Handles events:
- checkout.session.completed
- payment_intent.payment_failed
- charge.refunded
```

---

## 📊 Payment Flow Diagram

```
User Cart
   ↓
Click "Place Order"
   ↓
POST /checkout/create-session
   ↓
Order created (status: pending)
   ↓
Stripe Session created
   ↓
Redirect to Stripe Checkout
   ↓
User enters card details
   ↓
Payment processed
   ↓
Stripe redirects to success/cancel
   ↓
Webhook updates order status
   ↓
Order status: processing
```

---

## ⚠️ Important Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Never expose Secret Key** - Keep it private
3. **Always use HTTPS in production** - Required by Stripe
4. **Validate payments server-side** - Don't trust client-side confirmations
5. **Protect webhook secret** - Used to verify Stripe events

---

## 🐛 Troubleshooting

### "Stripe credentials not found"

```
✓ Check STRIPE_SECRET_KEY is set in .env
✓ Check STRIPE_PUBLISHABLE_KEY is set in .env
✓ Restart app after adding env vars
```

### "Cannot create checkout session"

```
✓ Verify API keys are correct
✓ Check cart has items
✓ Check user is authenticated
✓ Check database connection
```

### "Webhook signature verification failed"

```
✓ Verify STRIPE_WEBHOOK_SECRET is correct
✓ Use stripe listen command to get correct secret
✓ Ensure webhook endpoint is public/accessible
```

---

## 📚 Documentation Links

- Full Setup Guide: [STRIPE_INTEGRATION.md](STRIPE_INTEGRATION.md)
- Stripe API Docs: https://stripe.com/docs/api
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

## 🎉 Next Steps

1. **Follow the Quick Start** (5 min) above
2. **Test with test cards** to verify integration
3. **Read STRIPE_INTEGRATION.md** for comprehensive details
4. **Set up webhooks** for production readiness
5. **Switch to live keys** when ready for production

---

## 💬 Support

If you encounter issues:

1. Check [STRIPE_INTEGRATION.md](STRIPE_INTEGRATION.md) troubleshooting section
2. Review Stripe API logs in Stripe Dashboard
3. Use `stripe listen` command to debug webhooks
4. Check application logs for error messages

Happy integrating! 🚀
