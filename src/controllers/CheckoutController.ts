
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { OrderComplianceService } from '../services/OrderComplianceService';
import { OrderService } from '../services/OrderService';
import { Cart, CartItem, Order, OrderItem, Product, User, PlatformSetting, Address } from '../models';
import { verifyAccessToken } from '../utils/jwt';
import { sequelize } from '../config/database';
import { StripeService } from '../services/StripeService';
import { v4 as uuidv4 } from 'uuid';

export class CheckoutController extends BaseController {

    private async getUser(req: NextRequest) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        try {
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            return decoded ? await User.findByPk(decoded.sub || decoded.userId, { include: ['profile'] }) : null;
        } catch (e) {
            console.error("[CHECKOUT DEBUG] Checkout Auth Error:", e);
            return null;
        }
    }

    private async getPlatformSettings() {
        // Fetch VAT and Admin Commission, default to 5% and 10%
        try {
            const vatSetting = await PlatformSetting.findOne({ where: { key: 'vat_percentage' } });
            const commSetting = await PlatformSetting.findOne({ where: { key: 'admin_commission_percentage' } });

            return {
                vatPercent: vatSetting ? parseFloat(vatSetting.value) : 5,
                commPercent: commSetting ? parseFloat(commSetting.value) : 10
            };
        } catch (e) {
            console.error("Error fetching platform settings, using defaults", e);
            return { vatPercent: 5, commPercent: 10 };
        }
    }

    /**
     * POST /api/v1/checkout/verify
     * Check if cart can be checked out directly or needs request
     */
    async verifyCheckout(req: NextRequest) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return onboardingError;

            // Find User Cart with items
            const cart = await Cart.findOne({
                where: { user_id: user.id, status: 'active' },
                include: [{ model: CartItem, as: 'items' }]
            });
            if (!cart || !cart.items || cart.items.length === 0) return this.sendError('Cart is empty', 400);

            // Validate all items
            for (const item of cart.items) {
                const { eligible, error: eligibilityError } = await this.checkProductPurchaseEligibility(item.product_id);
                if (!eligible) {
                    return this.sendError(`One or more items in your cart are no longer available: ${eligibilityError}`, 400);
                }
            }

            const compliance = await OrderComplianceService.checkCompliance(user.id, cart.id);

            return this.sendSuccess({
                canCheckout: true,
                type: compliance.type,
                reasons: compliance.reasons
            });

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * POST /api/v1/checkout/create
     * Create an Order (Direct or Request depending on compliance)
     */
    async create(req: NextRequest, data?: any) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return onboardingError;

            const cart = await Cart.findOne({
                where: { user_id: user.id, status: 'active' },
                include: [{ model: CartItem, as: 'items', include: ['product'] }]
            });

            if (!cart || !cart.items || cart.items.length === 0) {
                return this.sendError('Cart is empty', 400);
            }

            // Validate all items
            for (const item of cart.items) {
                const { eligible, error: eligibilityError } = await this.checkProductPurchaseEligibility(item.product_id);
                if (!eligible) {
                    return this.sendError(`Checkout blocked: ${eligibilityError}`, 400);
                }
            }

            const body = data || await req.json().catch(() => ({}));
            const { addressId } = body;
            const isEmbedded = true;

            const { vatPercent } = await this.getPlatformSettings();

            // Check Compliance
            const compliance = await OrderComplianceService.checkCompliance(user.id, cart.id);
            const isComplianceRequest = compliance.type === 'request';

            // Generate 8-digit Order Group ID
            const generate8DigitId = async () => {
                let id = '';
                let isUnique = false;
                while (!isUnique) {
                    id = Math.floor(10000000 + Math.random() * 90000000).toString();
                    const existing = await Order.findOne({ where: { order_id: id } });
                    if (!existing) isUnique = true;
                }
                return id;
            };

            const orderGroupId = await generate8DigitId();

            // Calculate Totals for Stripe and High Value check
            let subtotal = 0;
            const allStripeItems: any[] = [];

            for (const item of cart.items) {
                if (!item.product) continue;
                const price = Number(item.product.base_price) || 0;
                const qty = item.quantity;
                subtotal += price * qty;

                const unitPriceWithTax = price * (1 + (vatPercent / 100));
                allStripeItems.push({
                    name: item.product.name,
                    amount: Math.round(unitPriceWithTax * 100),
                    quantity: qty,
                    currency: 'aed'
                });

                if (Number(item.product.shipping_charge) > 0) {
                    const val = Number(item.product.shipping_charge) * (1 + (vatPercent / 100));
                    allStripeItems.push({
                        name: 'Shipping Charges',
                        amount: Math.round(val * 100),
                        quantity: qty,
                        currency: 'aed'
                    });
                }

                if (Number(item.product.packing_charge) > 0) {
                    const val = Number(item.product.packing_charge) * (1 + (vatPercent / 100));
                    allStripeItems.push({
                        name: 'Packing Charges',
                        amount: Math.round(val * 100),
                        quantity: qty,
                        currency: 'aed'
                    });
                }
            }

            const isHighValue = subtotal >= 10000;
            const isRequest = isComplianceRequest || isHighValue;

            if (isRequest) {
                // For Purchase Requests, create orders immediately
                const createdOrders = await OrderService.convertCartToOrder(user.id, cart.id, orderGroupId, {
                    addressId,
                    isRequest: true
                });

                let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                if (!frontendUrl.startsWith('http')) frontendUrl = `http://${frontendUrl}`;

                return this.sendSuccess({
                    message: 'Purchase request submitted successfully. Waiting for admin approval.',
                    orderId: createdOrders[0].id,
                    orderGroupId: orderGroupId,
                    type: 'request',
                    requiresApproval: true,
                    redirectUrl: `${frontendUrl}/orders/summary/${createdOrders[0].id}?approval_required=true`
                }, 'Created', 201);
            } else {
                // For Direct Payments, only generate Stripe Session
                let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                if (!frontendUrl.startsWith('http')) frontendUrl = `http://${frontendUrl}`;

                const stripeSession = await StripeService.createCheckoutSession(
                    orderGroupId, // Use orderGroupId as the reference
                    allStripeItems,
                    user.email,
                    `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}`,
                    `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}&cancelled=true`,
                    {
                        orderGroupId: orderGroupId,
                        cartId: cart.id,
                        addressId: addressId || '',
                        userId: user.id
                    },
                    isEmbedded ? {
                        uiMode: 'embedded',
                        returnUrl: `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}`
                    } : undefined
                );

                return this.sendSuccess({
                    message: 'Payment session created. Proceed to payment.',
                    orderId: orderGroupId,
                    orderGroupId: orderGroupId,
                    type: 'direct',
                    requiresApproval: false,
                    paymentUrl: stripeSession.url,
                    clientSecret: stripeSession.clientSecret
                }, 'Created', 201);
            }

        } catch (error: any) {
            console.error('Checkout Error:', error);
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * POST /api/v1/checkout/verify-session
     * Verify Stripe Session and Confirm Order(s)
     */
    async verifySession(req: NextRequest, data?: any) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            const body = data || await req.json().catch(() => ({}));
            const { sessionId } = body;

            if (!sessionId) return this.sendError('Session ID is required', 400);

            const session = await StripeService.retrieveSession(sessionId);
            if (!session) return this.sendError('Invalid Session', 400);

            const orderGroupId = session.metadata?.orderGroupId;
            const cartId = session.metadata?.cartId;
            const addressId = session.metadata?.addressId;
            const userId = session.metadata?.userId;

            if (!orderGroupId) return this.sendError('Order Group ID is missing in session', 400);

            // Strategy: Convert Cart to Order now if it hasn't been done yet
            const isPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';

            let orders: Order[] = [];

            if (isPaid && cartId && userId) {
                // Ensure the user verifying is the one who owns the session
                if (userId !== user.id) return this.sendError('Forbidden', 403);

                // Convert Cart to Order (Idempotent)
                orders = await OrderService.convertCartToOrder(userId, cartId, orderGroupId, {
                    addressId: addressId || undefined
                });
            } else {
                // If already converted or failed, find orders by group ID
                orders = await Order.findAll({ where: { order_group_id: orderGroupId } });
            }

            if (orders.length === 0 && isPaid) {
                return this.sendError('Orders not found and could not be created', 404);
            }

            // Sync with Stripe Payment Interest
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

                if (isPaid && order.payment_status !== 'paid') {
                    order.payment_status = 'paid';
                    order.order_status = 'order_received';

                    const currentHistory = (order.status_history as any[]) || [];
                    const historyEntry = {
                        status: 'order_received',
                        payment_status: 'paid',
                        shipment_status: order.shipment_status,
                        updated_by: 'system',
                        timestamp: new Date().toISOString(),
                        note: 'Payment verified via Stripe'
                    };
                    order.status_history = [historyEntry, ...currentHistory];
                } else if (!isPaid) {
                    const currentHistory = (order.status_history as any[]) || [];
                    const historyEntry = {
                        status: order.order_status,
                        payment_status: session.payment_status,
                        shipment_status: order.shipment_status,
                        updated_by: 'system',
                        timestamp: new Date().toISOString(),
                        note: `Payment attempt incomplete: ${session.payment_status}`
                    };
                    order.status_history = [historyEntry, ...currentHistory];
                }
                await order.save();
            }

            return this.sendSuccess({
                success: true,
                status: isPaid ? 'paid' : session.payment_status,
                orderGroupId: orderGroupId
            });

        } catch (error: any) {
            console.error('Verify Session Error:', error);
            return this.sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/checkout/retry
     * Retry payment for an existing Order Group
     */
    async retryPayment(req: NextRequest, data?: any) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            const body = data || await req.json().catch(() => ({}));
            const { orderGroupId, embedded } = body;

            if (!orderGroupId) return this.sendError('Order Group ID is required', 400);

            // Fetch orders
            const orders = await Order.findAll({
                where: { order_group_id: orderGroupId },
                include: [{ model: OrderItem, as: 'items' }]
            });

            if (orders.length === 0) return this.sendError('Order not found', 404);

            // Verify Ownership
            if (orders[0].user_id !== user.id) return this.sendError('Forbidden', 403);

            // Check if already paid
            const isPaid = orders.every(o => o.payment_status === 'paid');
            if (isPaid) return this.sendError('Order is already paid', 400);

            // Reconstruct Stripe Items
            const allStripeItems: any[] = [];
            let vatPercent = 5; // Default fallback

            // Fetch items manually if association failed
            for (const order of orders) {
                if (!order.items || order.items.length === 0) {
                    console.log(`[RETRY DEBUG] Items missing for Order ${order.id}. Fetching manually...`);
                    const items = await OrderItem.findAll({ where: { order_id: order.id }, raw: true });
                    order.items = items as any; // Cast to any to assume OrderItem structure
                    console.log(`[RETRY DEBUG] Fetched ${items.length} items manually.`);
                }
            }

            // Try to derive VAT percent from first order if possible, or just use current settings
            let totalTaxable = 0;
            let totalVatStored = 0;

            orders.forEach(o => {
                const sub = (o.items || []).reduce((sum: number, i: any) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
                totalTaxable += sub + (Number(o.total_shipping) || 0) + (Number(o.total_packing) || 0);
                totalVatStored += (Number(o.vat_amount) || 0);
            });

            if (totalTaxable > 0) {
                const calculatedVat = (totalVatStored / totalTaxable) * 100;
                if (!isNaN(calculatedVat)) {
                    vatPercent = calculatedVat;
                }
            }

            // Now build items
            for (const order of orders) {
                for (const item of (order.items || [])) {
                    const price = Number(item.price) || 0;
                    const quantity = Number(item.quantity) || 1;

                    const unitPriceWithTax = price * (1 + (vatPercent / 100));
                    const finalAmount = Math.round(unitPriceWithTax * 100);

                    if (finalAmount <= 0) {
                        console.error(`[RETRY ERROR] Invalid Amount Item: Price=${price}, Qty=${quantity}, VAT=${vatPercent}, Calc=${finalAmount}`);
                        return this.sendError('Invalid item amount detected. Please contact support.', 400);
                    }

                    allStripeItems.push({
                        name: item.product_name || 'Product',
                        amount: isNaN(finalAmount) ? 0 : finalAmount,
                        quantity: quantity,
                        currency: 'aed'
                    });
                }

                if ((Number(order.total_shipping) || 0) > 0) {
                    const shipping = Number(order.total_shipping) || 0;
                    const val = shipping * (1 + (vatPercent / 100));
                    const finalAmount = Math.round(val * 100);
                    allStripeItems.push({
                        name: 'Shipping Charges',
                        amount: isNaN(finalAmount) ? 0 : finalAmount,
                        quantity: 1,
                        currency: 'aed'
                    });
                }

                if ((Number(order.total_packing) || 0) > 0) {
                    const packing = Number(order.total_packing) || 0;
                    const val = packing * (1 + (vatPercent / 100));
                    const finalAmount = Math.round(val * 100);
                    allStripeItems.push({
                        name: 'Packing Charges',
                        amount: isNaN(finalAmount) ? 0 : finalAmount,
                        quantity: 1,
                        currency: 'aed'
                    });
                }
            }

            if (allStripeItems.length === 0) {
                return this.sendError('No items found to generate payment link', 400);
            }

            // Final sanity check for NaN
            const hasNaN = allStripeItems.some(i => isNaN(i.amount));
            if (hasNaN) {
                console.error("[RETRY ERROR] NaN detected in stripe items:", allStripeItems);
                return this.sendError("Error generating payment link: Invalid calculation", 500);
            }

            // Determine Frontend URL dynamically to support varying ports (e.g. localhost:3001)
            const origin = req.headers.get('origin');
            let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
                frontendUrl = origin;
            } else if (!frontendUrl.startsWith('http')) {
                frontendUrl = `http://${frontendUrl}`;
            }

            const returnUrl = `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}`;
            const cancelUrl = `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}&cancelled=true`;

            const stripeSession = await StripeService.createCheckoutSession(
                orderGroupId, // Using Group ID as reference
                allStripeItems,
                user.email,
                returnUrl, // Success URL (Used if hosted)
                cancelUrl, // Cancel URL (Used if hosted)
                {
                    orderGroupId: orderGroupId
                },
                {
                    uiMode: embedded ? 'embedded' : 'hosted',
                    returnUrl: embedded ? returnUrl : undefined
                }
            );

            // Record initial session entry in all orders
            const totalCents = allStripeItems.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
            const initialTransactionRecord = {
                payment_mode: 'Stripe',
                session_id: stripeSession.sessionId,
                payment_status: 'pending',
                amount_total: totalCents,
                currency: 'aed',
                timestamp: new Date().toISOString()
            };

            for (const order of orders) {
                let current: any[] = [];
                try {
                    const raw = (order as any).transaction_details;
                    if (raw) {
                        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        current = Array.isArray(parsed) ? parsed : [parsed];
                    }
                } catch (e) { }

                order.transaction_details = [...current, initialTransactionRecord];
                await order.save();
            }

            return this.sendSuccess({
                message: 'Payment session created',
                paymentUrl: stripeSession.url,
                clientSecret: stripeSession.clientSecret,
                sessionId: stripeSession.sessionId
            });

        } catch (error: any) {
            console.error('Retry Payment Error:', error);
            return this.sendError(String(error.message), 500);
        }
    }
}
