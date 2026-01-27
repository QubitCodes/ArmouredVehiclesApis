
import 'dotenv/config';
import { StripeService } from '../services/StripeService';
import crypto from 'crypto';

// Ensure you run this with: npx tsx src/scripts/test_stripe_session.ts

async function testStripeSession() {
    console.log("🚀 Starting Stripe Session Test...");

    const dummyOrderId = crypto.randomUUID();
    const customerEmail = "test@example.com";
    const successUrl = "http://localhost:3000/success";
    const cancelUrl = "http://localhost:3000/cancel";

    const items = [
        {
            name: "Test Armored Vest",
            amount: 5000, // 50.00 AED
            quantity: 1,
            currency: 'aed'
        },
        {
            name: "Shipping Fee",
            amount: 1500, // 15.00 AED
            quantity: 1,
            currency: 'aed'
        }
    ];

    try {
        const Session = await StripeService.createCheckoutSession(
            dummyOrderId,
            items,
            customerEmail,
            successUrl,
            cancelUrl
        );

        console.log("\n✅ Stripe Session Created Successfully!");
        console.log("----------------------------------------");
        console.log("Session ID:", Session.sessionId);
        console.log("Payment URL:", Session.url);
        console.log("----------------------------------------");
        console.log("\n💡 Click the link above to verify the hosted checkout page.");

    } catch (error: any) {
        console.error("\n❌ Failed to create Stripe Session:", error.message);
        if (error.message.includes("STRIPE_SECRET_KEY")) {
             console.log("ℹ️  Tip: Make sure STRIPE_SECRET_KEY is set in your .env file.");
        }
    }
}

testStripeSession();
