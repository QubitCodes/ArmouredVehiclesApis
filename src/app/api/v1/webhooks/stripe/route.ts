
import { NextRequest, NextResponse } from 'next/server';
import { WebhookController } from '@/controllers/WebhookController';

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe Webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
export async function POST(req: NextRequest) {
    const controller = new WebhookController();
    return controller.handleStripeWebhook(req);
}
