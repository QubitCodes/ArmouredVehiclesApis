
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { StripeService } from '../services/StripeService';
import { InvoiceService } from '../services/InvoiceService';
import { OrderService } from '../services/OrderService';
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
					console.log(`[Stripe Webhook] Checkout Session Completed: ${session.id}`);
					await this.handleCheckoutSessionCompleted(session);
					break;
				default:
					// Unexpected event type
					console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
			}

			// Return a 200 response to acknowledge receipt of the event
			return this.sendSuccess({ received: true }, 'Webhook received');

		} catch (error: any) {
			console.error('Webhook Handler Error:', error);
			return this.sendError('Internal Server Error', 500);
		}
	}

	private async handleCheckoutSessionCompleted(session: any) {
		const orderGroupId = session.metadata?.orderGroupId;
		const cartId = session.metadata?.cartId;
		const userId = session.metadata?.userId;
		const addressId = session.metadata?.addressId;

		if (!orderGroupId) {
			console.error('[Stripe Webhook] Missing orderGroupId in session metadata');
			return;
		}

		try {
			const isPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
			if (!isPaid) {
				console.log(`[Stripe Webhook] Session ${session.id} not paid. Status: ${session.payment_status}`);
				return;
			}

			let orders: Order[] = [];

			if (cartId && userId) {
				// New Direct Checkout - Convert Cart to Order
				console.log(`[Stripe Webhook] Converting Cart ${cartId} for User ${userId} with Group ${orderGroupId}`);

				const shippingMeta = session.metadata?.shippingDetails;
				const shippingCosts = shippingMeta ? JSON.parse(shippingMeta) : undefined;

				orders = await OrderService.convertCartToOrder(userId, cartId, orderGroupId, {
					addressId: addressId || undefined,
					shippingCosts
				});
			} else {
				// Existing orders (Purchase Request or Retry)
				orders = await Order.findAll({ where: { order_group_id: orderGroupId } });
			}

			if (orders.length === 0) {
				console.error(`[Stripe Webhook] No orders found/created for group ${orderGroupId}`);
				return;
			}

			// Sync with Stripe Payment Details
			const paymentIntent = session.payment_intent as any;
			const paymentMethod = paymentIntent?.payment_method as any;

			const newTransactionRecord = {
				payment_mode: 'Stripe',
				session_id: session.id,
				transaction_id: paymentIntent?.id || session.id,
				amount_total: session.amount_total,
				currency: session.currency,
				payment_status: session.payment_status,
				payment_details: {
					brand: paymentMethod?.card?.brand || null,
					last4: paymentMethod?.card?.last4 || null,
					funding: paymentMethod?.card?.funding || null,
					type: paymentMethod?.type || 'card'
				},
				billing_details: session.customer_details || paymentMethod?.billing_details,
				receipt_url: paymentIntent?.charges?.data?.[0]?.receipt_url || null,
				timestamp: new Date().toISOString()
			};

			// Update all orders
			for (const order of orders) {
				let currentDetails: any[] = [];
				try {
					const raw = (order as any).transaction_details;
					if (raw) {
						const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
						currentDetails = Array.isArray(parsed) ? parsed : [parsed];
					}
				} catch (e) { }

				const sessionIdx = currentDetails.findIndex((p: any) => p.session_id === session.id);
				if (sessionIdx !== -1) {
					currentDetails[sessionIdx] = { ...currentDetails[sessionIdx], ...newTransactionRecord };
				} else {
					currentDetails.push(newTransactionRecord);
				}

				order.transaction_details = currentDetails;

				if (order.payment_status !== 'paid') {
					order.payment_status = 'paid';
					order.order_status = 'order_received';

					const currentHistory = (order.status_history as any[]) || [];
					const historyEntry = {
						status: 'order_received',
						payment_status: 'paid',
						shipment_status: order.shipment_status,
						updated_by: 'system',
						timestamp: new Date().toISOString(),
						note: 'Payment confirmed via Stripe Webhook'
					};
					order.status_history = [historyEntry, ...currentHistory];
				}
				await order.save();
			}

			console.log(`[Stripe Webhook] Group ${orderGroupId} processed successfully.`);

			// --- INVOICE GENERATION ---
			if (orders.length > 0) {
				try {
					// Use the first order to trigger the consolidated invoice generation
					const primaryOrder = orders[0];
					console.log(`[Stripe Webhook] Triggering Invoice Generation for Group ${orderGroupId}`);

					// Check if invoice already exists
					const existingInvoices = await InvoiceService.getInvoicesByGroupId(orderGroupId);
					const hasCustomerInvoice = existingInvoices.some(i => i.invoice_type === 'customer');

					if (!hasCustomerInvoice) {
						const invoice = await InvoiceService.generateCustomerInvoice(primaryOrder.id, null, 'paid');
						console.log(`[Stripe Webhook] Generated Customer Invoice: ${invoice.invoice_number}`);

						// Also check for Admin Invoices (Vendor -> Admin)
						// Iterate all orders in group to generate admin invoices for each vendor if needed
						// (Using a Set to avoid duplicates if multiple orders belong to same vendor in split scenarios, 
						// though generateAdminInvoice takes orderId, so distinct orders = distinct invoices usually)
						for (const order of orders) {
							if (order.vendor_id && order.vendor_id !== 'admin') {
								// Check if this specific order has an admin invoice
								const hasAdminInv = existingInvoices.some(i => i.invoice_type === 'admin' && i.order_id === order.id);
								if (!hasAdminInv) {
									await InvoiceService.generateAdminInvoice(order.id);
									console.log(`[Stripe Webhook] Generated Admin Invoice for Order ${order.id}`);
								}
							}
						}

					} else {
						console.log(`[Stripe Webhook] Customer Invoice already exists for Group ${orderGroupId}`);
						// Ensure it is marked as paid
						await InvoiceService.markCustomerInvoicePaid(primaryOrder.id);
					}

				} catch (invError) {
					console.error(`[Stripe Webhook] Invoice generation failed:`, invError);
					// Don't throw, we want to return 200 for the webhook
				}
			}

		} catch (error) {
			console.error(`[Stripe Webhook] Failed to process session ${session.id}:`, error);
		}
	}
}
