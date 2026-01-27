
import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export class StripeService {

    private static getClient(): Stripe {
        if (stripeClient) return stripeClient;

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY is missing in environment variables.");
        }

        // Initialize Stripe
        stripeClient = new Stripe(secretKey.trim(), {
            apiVersion: '2024-12-18.acacia' as any,
            typescript: true,
        });

        return stripeClient;
    }

    /**
     * Construct Stripe Event from Webhook Payload
     */
    static constructEvent(payload: string, signature: string): Stripe.Event {
        const stripe = this.getClient();
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
             throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
        }

        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    /**
     * Create a Checkout Session for an Order
     * @param orderId - The generic Order ID
     * @param items - Array of line items { name, amount (in cents/lowest currency unit), quantity }
     * @param customerEmail - Email of the customer
     * @param successUrl - Redirection after success
     * @param cancelUrl - Redirection after cancel
     */
    static async createCheckoutSession(
        orderId: string,
        items: Array<{ name: string; amount: number; quantity: number; currency?: string }>,
        customerEmail: string,
        successUrl: string,
        cancelUrl: string,
        metadata: Record<string, string> = {}
    ) {
        const stripe = this.getClient();

        // Convert simplistic items to Stripe Line Items
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
            price_data: {
                currency: (item.currency || 'aed').toLowerCase(),
                product_data: {
                    name: item.name,
                },
                unit_amount: item.amount, // Amount in small units (e.g., fils for AED, cents for USD)
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: customerEmail,
            metadata: {
                orderId: orderId,
                ...metadata
            }
        });

        return {
            sessionId: session.id,
            url: session.url
        };
    }

    /**
     * Retrieve a Session
     */
    static async retrieveSession(sessionId: string) {
        const stripe = this.getClient();
        return await stripe.checkout.sessions.retrieve(sessionId);
    }
}
