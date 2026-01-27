
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { StripeService } from '../services/StripeService';
import { Order, OrderItem } from '../models';
import { sequelize } from '../config/database';

export class WebhookController extends BaseController {

	/**
	 * POST /api/v1/webhooks/stripe
	 * Handle Stripe Webhooks
	 */
	async handleStripeWebhook(req: NextRequest) {
		try {
			const body = await req.text();
			const signature = req.headers.get('stripe-signature');

			if (!signature) {
				return this.sendError('Missing stripe-signature header', 400);
			}

			let event;
			try {
				event = StripeService.constructEvent(body, signature);
			} catch (err: any) {
				console.error(`⚠️  Webhook signature verification failed.`, err.message);
				return this.sendError(`Webhook Error: ${err.message}`, 400);
			}

			// Handle the event
			switch (event.type) {
				case 'checkout.session.completed':
					const session = event.data.object as any;
					console.log(`[Stripe] Checkout Session Completed: ${session.id}`);
					await this.handleCheckoutSessionCompleted(session);
					break;
				default:
					// Unexpected event type
					console.log(`[Stripe] Unhandled event type ${event.type}`);
			}

			// Return a 200 response to acknowledge receipt of the event
			return this.sendSuccess({ received: true }, 'Webhook received');

		} catch (error: any) {
			console.error('Webhook Handler Error:', error);
			return this.sendError('Internal Server Error', 500);
		}
	}

	private async handleCheckoutSessionCompleted(session: any) {
		const orderId = session.metadata?.orderId;
		if (!orderId) {
			console.error('[Stripe] Missing orderId in session metadata');
			return;
		}

		const t = await sequelize.transaction();
		try {
			const order = await Order.findByPk(orderId, { transaction: t });
			if (!order) {
				console.error(`[Stripe] Order not found: ${orderId}`);
				await t.rollback();
				return;
			}

			if (order.payment_status === 'paid') {
				console.log(`[Stripe] Order ${orderId} is already paid.`);
				await t.rollback();
				return;
			}

			// Update Order Logic
			// Update Order Logic
			await order.update({
				payment_status: 'paid',
                order_status: 'approved',
				shipment_status: 'pending', 
				// You might want to save payment_intent_id or other details here
			}, { transaction: t });

			console.log(`[Stripe] Order ${orderId} marked as paid.`);

			// TODO: Send Confirmation Email via EmailService?

			await t.commit();
		} catch (error) {
			console.error(`[Stripe] Failed to update order ${orderId}:`, error);
			await t.rollback();
		}
	}
}
