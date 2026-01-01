    # Stripe Payment Gateway Integration Guide

    This guide will help you integrate Stripe payment processing into your Armoured Vehicles Web application.

    ## Table of Contents

    1. [Prerequisites](#prerequisites)
    2. [Getting Stripe Credentials](#getting-stripe-credentials)
    3. [Environment Setup](#environment-setup)
    4. [Backend Configuration](#backend-configuration)
    5. [Frontend Integration](#frontend-integration)
    6. [Testing](#testing)
    7. [Webhook Setup](#webhook-setup)
    8. [Troubleshooting](#troubleshooting)

    ---

    ## Prerequisites

    - Node.js 18+ and npm/yarn
    - A Stripe account (free at https://stripe.com)
    - Basic understanding of payment processing concepts
    - Git for version control

    ---

    ## Getting Stripe Credentials

    ### Step 1: Create a Stripe Account

    1. Go to [https://stripe.com](https://stripe.com)
    2. Click "Sign up" and complete the registration
    3. Verify your email address

    ### Step 2: Get API Keys

    1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
    2. Navigate to **Developers** → **API Keys**
    3. You'll see two keys:
    - **Publishable Key** (pk*test*... or pk*live*...)
    - **Secret Key** (sk*test*... or sk*live*...)

    **Important**:

    - Use **test keys** during development (start with `pk_test_` and `sk_test_`)
    - Switch to **live keys** only when you're ready for production
    - Never share your Secret Key - it's sensitive!

    ### Step 3: Get Webhook Secret

    1. Navigate to **Developers** → **Webhooks**
    2. Click "Add Endpoint"
    3. Configure webhook settings (see [Webhook Setup](#webhook-setup) section)
    4. Copy the signing secret (starts with `whsec_`)

    ---

    ## Environment Setup

    ### Step 1: Create `.env` File

    Copy the provided `.env.example` file to `.env`:

    ```bash
    cp .env.example .env
    ```

    ### Step 2: Add Stripe Credentials

    Edit `.env` and add your Stripe keys:

    ```env
    # From Stripe Dashboard - API Keys
    STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
    STRIPE_SECRET_KEY=sk_test_your_secret_key_here

    # From Stripe Dashboard - Webhooks
    STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

    # Your application URL (for payment redirects)
    APP_URL=http://localhost:5000

    # Other required environment variables
    DATABASE_URL=postgresql://user:password@localhost:5432/armoured_vehicles_db
    JWT_SECRET=your_jwt_secret_key_here
    JWT_REFRESH_SECRET=your_refresh_secret_key_here
    ```

    ### Step 3: Verify Setup

    Run this command to verify Stripe is configured:

    ```bash
    npm run dev
    # Check console for: "Stripe client initialized successfully"
    ```

    ---

    ## Backend Configuration

    ### API Endpoints

    #### 1. Create Checkout Session

    **Endpoint**: `POST /api/checkout/create-session`

    **Authentication**: Required (Bearer token)

    **Request Body**: None (uses user's cart)

    **Response**:

    ```json
    {
    "url": "https://checkout.stripe.com/pay/...",
    "orderId": "order-12345",
    "sessionId": "cs_test_..."
    }
    ```

    #### 2. Webhook Handler

    **Endpoint**: `POST /api/checkout/webhook`

    **Purpose**: Receives and processes payment events from Stripe

    **Events Handled**:

    - `checkout.session.completed` - Payment successful
    - `payment_intent.payment_failed` - Payment failed
    - `charge.refunded` - Refund processed

    ### Key Features

    1. **Automatic Order Creation**: Orders are created before Stripe checkout
    2. **Cart Clearing**: Cart is automatically cleared after order creation
    3. **Order Status Management**: Status updates based on payment result
    4. **Tax Calculation**: 5% VAT added automatically
    5. **Shipping Calculation**: Free shipping on orders over 500 AED

    ---

    ## Frontend Integration

    ### Checkout Flow

    1. **Cart Page** (`/cart`)
    - User reviews items and clicks "Proceed to Checkout"
    - Frontend calls `POST /api/checkout/create-session`

    2. **Stripe Checkout Page**
    - User is redirected to Stripe's hosted checkout
    - User enters payment details securely
    - No sensitive payment data touches your server

    3. **Success Page** (`/checkout/success`)
    - User returned after successful payment
    - Shows order confirmation
    - Links to order tracking

    4. **Cancel**
    - User returned to cart if payment cancelled

    ### Client-Side Implementation

    The API client is pre-configured in `client/src/lib/api.ts`:

    ```typescript
    const checkout = {
    createSession: () =>
        fetchJson<{ url?: string; testMode?: boolean; orderId?: string }>(
        "/checkout/create-session",
        {
            method: "POST",
        }
        ),
    };
    ```

    Usage in components:

    ```typescript
    const checkoutMutation = useMutation({
    mutationFn: api.checkout.createSession,
    onSuccess: (data) => {
        if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
        }
    },
    });

    // Trigger checkout
    checkoutMutation.mutate();
    ```

    ---

    ## Testing

    ### Test Card Numbers

    Stripe provides special test card numbers for testing:

    | Card Type      | Number                | CVV          | Expiry          |
    | -------------- | --------------------- | ------------ | --------------- |
    | Visa           | `4242 4242 4242 4242` | Any 3 digits | Any future date |
    | Visa (Decline) | `4000 0000 0000 0002` | Any 3 digits | Any future date |
    | Mastercard     | `5555 5555 5555 4444` | Any 3 digits | Any future date |
    | Amex           | `3782 822463 10005`   | Any 4 digits | Any future date |

    ### Test Email & Name

    - Email: Any email (e.g., `test@example.com`)
    - Name: Any name (e.g., `Test Customer`)
    - ZIP: Any 5 digits (e.g., `12345`)

    ### Testing Procedure

    1. Start your app in development mode:

    ```bash
    npm run dev
    ```

    2. Add products to cart and proceed to checkout

    3. When redirected to Stripe, use test card `4242 4242 4242 4242`

    4. Check order status in your app after payment

    5. Monitor webhooks in Stripe Dashboard

    ---

    ## Webhook Setup

    ### Why Webhooks?

    Webhooks allow Stripe to notify your server of payment events in real-time. This ensures order status is updated correctly even if the user closes the browser.

    ### Setup Steps

    1. **Get Your Webhook URL**
    - Development: Use [ngrok](https://ngrok.com) to expose localhost
        ```bash
        ngrok http 5000
        # This gives you: https://abc123.ngrok.io
        ```
    - Production: Use your actual domain (e.g., `https://yourdomain.com`)

    2. **Add Webhook Endpoint in Stripe Dashboard**
    - Go to **Developers** → **Webhooks**
    - Click **Add Endpoint**
    - Webhook URL: `https://your-domain.com/api/checkout/webhook`
    - Events to send:
        - `checkout.session.completed`
        - `payment_intent.payment_failed`
        - `charge.refunded`
    - Click **Add Endpoint**
    - Copy the **Signing Secret** (starts with `whsec_`)

    3. **Add to `.env`**

    ```env
    STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
    ```

    4. **Restart Your App**
    ```bash
    npm run dev
    ```

    ### Testing Webhooks

    Use Stripe CLI to test webhooks locally:

    ```bash
    # Install Stripe CLI
    # macOS: brew install stripe/stripe-cli/stripe
    # Linux: curl https://raw.githubusercontent.com/stripe/stripe-cli/master/install.sh -s | bash
    # Windows: Download from https://stripe.com/docs/stripe-cli

    # Login to your Stripe account
    stripe login

    # Listen for webhook events
    stripe listen --forward-to localhost:5000/api/checkout/webhook

    # You'll get a signing secret - copy it to .env
    ```

    ---

    ## Order Status Flow

    After payment, orders go through these statuses:

    ```
    pending → processing → shipped → delivered
        ↓
    cancelled (if payment fails)
        ↓
    returned (after delivery)
    ```

    **Status Updates**:

    - `pending` - Order created, awaiting payment
    - `processing` - Payment successful, preparing shipment
    - `shipped` - Order dispatched to customer
    - `delivered` - Customer received order
    - `cancelled` - Payment failed or customer cancelled
    - `returned` - Customer initiated return

    ---

    ## Payment Amount Breakdown

    For a product priced at 100 AED:

    ```
    Subtotal:        100.00 AED
    Shipping:        40.00 AED (free if subtotal > 500)
    VAT (5%):        7.00 AED
    ─────────────────────────
    Total:          147.00 AED
    ```

    ---

    ## Error Handling

    ### Common Errors

    **"Stripe credentials not found"**

    - Ensure `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set in `.env`
    - Restart your app after adding env vars

    **"Invalid webhook signature"**

    - Check `STRIPE_WEBHOOK_SECRET` matches your Stripe Dashboard
    - Ensure webhook endpoint URL is correct

    **"Card declined"**

    - Use test cards from the [Testing](#testing) section
    - Check card expiry and CVV

    **"Payment timeout"**

    - Check your internet connection
    - Verify Stripe API keys are valid

    ### Debug Mode

    Enable debug logging in `.env`:

    ```env
    DEBUG=true
    ```

    This will log all Stripe API calls to the console.

    ---

    ## Security Best Practices

    1. **Never expose secret keys**
    - Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` private
    - Use `.env` file and add it to `.gitignore`

    2. **Use HTTPS in production**
    - Stripe redirects to HTTPS URLs
    - Ensure your app uses HTTPS in production

    3. **Validate all payments server-side**
    - Always verify payment status via webhooks
    - Don't trust client-side payment confirmations

    4. **Keep Stripe SDK updated**

    ```bash
    npm update stripe
    ```

    5. **Rotate webhook secrets periodically**
    - Add a new endpoint with a new secret
    - Remove the old one after verification

    ---

    ## Migration from Test to Production

    ### Step 1: Get Live Keys

    1. Go to Stripe Dashboard
    2. Switch from "Test mode" to "Live mode"
    3. Copy your live keys (`pk_live_...` and `sk_live_...`)

    ### Step 2: Update Environment

    ```env
    # Replace with live keys
    STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
    STRIPE_SECRET_KEY=sk_live_your_live_key

    # Update webhook secret
    STRIPE_WEBHOOK_SECRET=whsec_live_your_webhook_secret

    # Update app URL
    APP_URL=https://yourdomain.com
    ```

    ### Step 3: Deploy to Production

    ```bash
    git add .env
    npm run build
    npm run start
    ```

    ### Step 4: Test with Real Card

    - Use a real credit card with small amount (Stripe will refund)
    - Verify payment completes successfully
    - Check order status updates via webhooks

    ---

    ## Troubleshooting

    ### Payment redirects to error page

    - Check Stripe API keys are correct
    - Verify `APP_URL` environment variable is set
    - Check browser console for error details

    ### Orders created but payment not processed

    - Verify webhook endpoint is configured
    - Check `STRIPE_WEBHOOK_SECRET` is correct
    - Use `stripe listen` to verify webhook events

    ### Cart not clearing after payment

    - Ensure `clearCart()` is called after order creation
    - Check database connection is working

    ### Cannot connect to Stripe

    - Verify internet connection
    - Check API keys aren't rate-limited
    - Check firewall/proxy isn't blocking Stripe

    ---

    ## Support & Documentation

    - **Stripe Documentation**: https://stripe.com/docs
    - **Stripe API Reference**: https://stripe.com/docs/api
    - **Stripe CLI Docs**: https://stripe.com/docs/stripe-cli
    - **Payment Processing Guide**: https://stripe.com/docs/payments

    ---

    ## Next Steps

    1. ✅ Get Stripe credentials
    2. ✅ Set up environment variables
    3. ✅ Test with test card numbers
    4. ✅ Configure webhooks
    5. ✅ Test end-to-end payment flow
    6. ✅ Migrate to production keys
    7. ✅ Monitor payments in Stripe Dashboard

    Congratulations! Your Stripe payment gateway is now integrated!
