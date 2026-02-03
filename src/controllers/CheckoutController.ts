
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { OrderComplianceService } from '../services/OrderComplianceService';
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
    async create(req: NextRequest) {
        const t = await sequelize.transaction();
        let isCommitted = false;
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) {
                await t.rollback();
                return onboardingError;
            }

            const cart = await Cart.findOne({
                where: { user_id: user.id, status: 'active' },
                include: [{ model: CartItem, as: 'items', include: ['product'] }]
            });

            if (!cart || !cart.items || cart.items.length === 0) {
                await t.rollback();
                return this.sendError('Cart is empty', 400);
            }

            // Validate all items (Final check before order creation)
            for (const item of cart.items) {
                const { eligible, error: eligibilityError } = await this.checkProductPurchaseEligibility(item.product_id);
                if (!eligible) {
                    await t.rollback();
                    return this.sendError(`Checkout blocked: ${eligibilityError}`, 400);
                }
            }


            const body = await req.json().catch(() => ({}));
            const { addressId } = body;

            let shipmentDetails = {};
            if (addressId) {
                const address = await Address.findByPk(addressId);
                if (address && address.user_id === user.id) {
                    shipmentDetails = address.toJSON();
                }
            }
            const { vatPercent, commPercent } = await this.getPlatformSettings();

            // Check Compliance
            const compliance = await OrderComplianceService.checkCompliance(user.id, cart.id);
            const isComplianceRequest = compliance.type === 'request';

            // Group Items by Vendor
            const vendorGroups = new Map<string, any[]>();

            // Generate 8-digit Order Group ID
            const generate8DigitId = async () => {
                let id = '';
                let isUnique = false;
                while (!isUnique) {
                    id = Math.floor(10000000 + Math.random() * 90000000).toString();
                    // Check Uniqueness against existing 'order_id' or 'order_group_id'
                    // Technically collision chance is low but good to check against Order.order_id
                    const existing = await Order.findOne({ where: { order_id: id }, transaction: t });
                    if (!existing) isUnique = true;
                }
                return id;
            };

            const orderGroupId = await generate8DigitId();
            const allStripeItems: any[] = [];
            let grandTotalAmount = 0;

            // Helper to consolidate items (deduplicate within cart if needed)
            const consolidatedItems = new Map<number, any>();
            for (const item of cart.items!) {
                if (!item.product) continue;

                const productId = item.product_id;
                const price = Number(item.product.base_price) || 0;

                if (consolidatedItems.has(productId)) {
                    const existing = consolidatedItems.get(productId);
                    existing.quantity += item.quantity;
                } else {
                    consolidatedItems.set(productId, {
                        product_id: productId,
                        vendor_id: item.product.vendor_id,
                        quantity: item.quantity,
                        price: price,
                        product_name: item.product.name,
                        shipping_charge: item.product.shipping_charge,
                        packing_charge: item.product.packing_charge
                    });
                }
            }

            // Distribute into vendor groups
            for (const item of consolidatedItems.values()) {
                const vId = item.vendor_id || 'admin'; // 'admin' or null if no vendor
                if (!vendorGroups.has(vId)) {
                    vendorGroups.set(vId, []);
                }
                vendorGroups.get(vId)?.push(item);
            }

            // Determine if SINGLE vendor or MULTI vendor
            const isSingleVendor = vendorGroups.size === 1;

            // Calculate Grand Total for high value check
            let calculatedGrandTotal = 0;
            for (const item of consolidatedItems.values()) {
                calculatedGrandTotal += item.price * item.quantity;
            }
            const isHighValue = calculatedGrandTotal >= 10000;
            const isRequest = isComplianceRequest || isHighValue;

            // Generate Order IDs and Records for each group
            const createdOrderIds: string[] = [];
            let index = 0;

            for (const [vendorId, items] of vendorGroups) {
                const actualVendorId = vendorId === 'admin' ? null : vendorId;

                // Calculate Group Totals
                let groupSubtotal = 0;
                items.forEach(i => groupSubtotal += i.price * i.quantity);

                // Calculate Financials - UPDATED for Shipping & Packing
                let groupShipping = 0;
                let groupPacking = 0;

                items.forEach(i => {
                    const qty = i.quantity; // Ensure quantity is number
                    // Ensure charges are treated as numbers
                    const shipCharge = Number(i.shipping_charge) || 0;
                    const packCharge = Number(i.packing_charge) || 0;

                    groupShipping += (shipCharge * qty);
                    groupPacking += (packCharge * qty);
                });

                // Taxable Base includes Product cost + Shipping + Packing?
                // Usually VAT is applied to the total taxable value including shipping/packing services.
                const taxableAmount = groupSubtotal + groupShipping + groupPacking;
                const vatAmount = (taxableAmount * vatPercent) / 100;

                // Admin's own products do not pay commission
                // Commission is usually on the Subtotal (Product price), not including shipping/tax.
                const adminCommission = (actualVendorId === null || actualVendorId === 'admin')
                    ? 0
                    : (groupSubtotal * commPercent) / 100;

                const groupTotal = taxableAmount + vatAmount;

                // Assume `total_amount` is Grand Total (Products + Services + VAT).

                // Generate Order ID

                // Generate Order ID
                // If Single Vendor, order_id = order_group_id
                // If Multi Vendor, generate NEW unique 8-digit ID
                let finalOrderId = '';
                if (isSingleVendor) {
                    finalOrderId = orderGroupId;
                } else {
                    finalOrderId = await generate8DigitId();
                    // Ensure it's not same as group ID (unlikely but possible)
                    if (finalOrderId === orderGroupId) finalOrderId = await generate8DigitId();
                }

                const order = await Order.create({
                    user_id: user.id,
                    order_id: finalOrderId,
                    order_group_id: orderGroupId, // Always store group ID, even if same
                    vendor_id: actualVendorId,
                    total_amount: groupTotal,
                    vat_amount: vatAmount,
                    admin_commission: adminCommission,
                    total_shipping: groupShipping,
                    total_packing: groupPacking,
                    currency: 'AED',
                    type: isRequest ? 'request' : 'direct',
                    order_status: 'order_received', // Unified initial status
                    payment_status: isRequest ? null : 'pending',
                    comments: null,
                    transaction_details: {},
                    shipment_details: shipmentDetails,
                    status_history: [{
                        status: 'order_received',
                        payment_status: isRequest ? null : 'pending',
                        shipment_status: null,
                        updated_by: user.id,
                        timestamp: new Date().toISOString(),
                        note: 'Order placed by customer'
                    }]
                }, { transaction: t });

                createdOrderIds.push(order.id);

                // Create Items for this order
                for (const itemData of items) {
                    await OrderItem.create({ ...itemData, order_id: order.id }, { transaction: t });

                    // Add to Stripe Items (using Unit Price? Or Unit Price + VAT?)
                    // Stripe expects Unit Amount.
                    // If we added VAT to the Order Total, we should probably add VAT to the line items or add a "Tax" line item.
                    // For simplicity in this iteration: Add VAT as distributed or just rely on total match?
                    // Stripe Checkout calculates total from line items. 
                    // So we must increase unit amount by VAT %? Or add a separate Tax Item?
                    // Let's effectively increase unit price by VAT % for Stripe display so the total matches.
                    // UnitPriceWithTax = UnitPrice * (1 + vat/100)
                    const unitPriceWithTax = itemData.price * (1 + (vatPercent / 100));

                    allStripeItems.push({
                        name: itemData.product_name,
                        amount: Math.round(unitPriceWithTax * 100), // cents/fils
                        quantity: itemData.quantity,
                        currency: 'aed'
                    });
                }

                // Add Shipping and Packing to Stripe Items
                if (groupShipping > 0) {
                    const shippingWithTax = groupShipping * (1 + (vatPercent / 100));
                    allStripeItems.push({
                        name: 'Shipping Charges',
                        amount: Math.round(shippingWithTax * 100),
                        quantity: 1,
                        currency: 'aed'
                    });
                }

                if (groupPacking > 0) {
                    const packingWithTax = groupPacking * (1 + (vatPercent / 100));
                    allStripeItems.push({
                        name: 'Packing Charges',
                        amount: Math.round(packingWithTax * 100),
                        quantity: 1,
                        currency: 'aed'
                    });
                }

                grandTotalAmount += groupTotal;
            }

            // Mark Cart as Converted
            await cart.update({ status: 'converted' }, { transaction: t });

            await t.commit();
            isCommitted = true;

            if (isRequest) {
                let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                if (!frontendUrl.startsWith('http')) frontendUrl = `http://${frontendUrl}`;

                return this.sendSuccess({
                    message: 'Purchase request submitted successfully. Waiting for admin approval.',
                    orderId: createdOrderIds[0], // Return first ID for reference
                    orderGroupId: orderGroupId,
                    type: 'request',
                    requiresApproval: true,
                    redirectUrl: `${frontendUrl}/orders/summary/${createdOrderIds[0]}?approval_required=true`
                }, 'Created', 201);
            } else {
                // Generate Stripe Session
                let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                if (!frontendUrl.startsWith('http')) frontendUrl = `http://${frontendUrl}`;

                // Use the first Order ID for url params, but verifySession will use logic
                const referenceOrderId = createdOrderIds[0];

                const stripeSession = await StripeService.createCheckoutSession(
                    referenceOrderId,
                    allStripeItems,
                    user.email,
                    `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}`, // Keeping order_id in query for frontend loading
                    `${frontendUrl}/checkout/cancel?order_id=${referenceOrderId}`,
                    {
                        orderGroupId: orderGroupId
                    }
                );

                return this.sendSuccess({
                    message: 'Order created. Proceed to payment.',
                    orderId: referenceOrderId,
                    orderGroupId: orderGroupId,
                    type: 'direct',
                    requiresApproval: false,
                    paymentUrl: stripeSession.url
                }, 'Created', 201);
            }

        } catch (error: any) {
            if (!isCommitted) await t.rollback();
            console.error('Checkout Error:', error);
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * POST /api/v1/checkout/verify-session
     * Verify Stripe Session and Confirm Order(s)
     */
    async verifySession(req: NextRequest) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            const body = await req.json();
            const { sessionId } = body; // We trust sessionId more than orderId

            if (!sessionId) return this.sendError('Session ID is required', 400);

            const session = await StripeService.retrieveSession(sessionId);
            if (!session) return this.sendError('Invalid Session', 400);

            console.log(`[CHECKOUT DEBUG] verifySession: Session Found. Status=${session.status}, PaymentStatus=${session.payment_status}`);

            // Strategy: Look for orderGroupId in metadata
            const orderGroupId = session.metadata?.orderGroupId;
            const singleOrderId = session.metadata?.orderId; // Fallback for old orders

            let orders: Order[] = [];

            if (orderGroupId) {
                orders = await Order.findAll({ where: { order_group_id: orderGroupId } });
            } else if (singleOrderId) {
                const o = await Order.findByPk(singleOrderId);
                if (o) orders.push(o);
            }

            if (orders.length === 0) {
                return this.sendError('Orders not found for this session', 404);
            }

            // Verify User Ownership (Check first order)
            if (orders[0].user_id !== user.id) return this.sendError('Forbidden', 403);

            if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
                const transactionData = {
                    payment_mode: 'Stripe',
                    transaction_id: session.payment_intent as string || session.id
                };

                for (const order of orders) {
                    if (order.payment_status !== 'paid') {
                        order.payment_status = 'paid';
                        // order.order_status = 'approved'; // Formerly auto-approved. Now waits for vendor.
                        // Ensure it is 'order_received' if it wasn't already (it should be).
                        if (order.order_status !== 'order_received') {
                            order.order_status = 'order_received';
                        }
                        order.transaction_details = transactionData;

                        // Append Payment Verification to History
                        const currentHistory = (order.status_history as any[]) || [];
                        const historyEntry = {
                            status: order.order_status,
                            payment_status: 'paid',
                            shipment_status: order.shipment_status,
                            updated_by: 'system', // or 'stripe'
                            timestamp: new Date().toISOString(),
                            note: 'Payment verified via Stripe'
                        };
                        order.status_history = [historyEntry, ...currentHistory];

                        await order.save();
                    }
                }

                return this.sendSuccess({
                    success: true,
                    amount: session.amount_total,
                    currency: session.currency,
                    status: 'paid',
                    orderId: orders[0].id // Return one ID for frontend routing
                });
            } else {
                return this.sendError('Payment not completed', 400);
            }

        } catch (error: any) {
            console.error('Verify Session Error:', error);
            return this.sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/checkout/retry
     * Retry payment for an existing Order Group
     */
    async retryPayment(req: NextRequest) {
        try {
            const user = await this.getUser(req);
            if (!user) return this.sendError('Authentication required', 401);

            const body = await req.json();
            const { orderGroupId } = body;

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
            let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
                frontendUrl = origin;
            } else if (!frontendUrl.startsWith('http')) {
                frontendUrl = `http://${frontendUrl}`;
            }

            const stripeSession = await StripeService.createCheckoutSession(
                orderGroupId, // Using Group ID as reference
                allStripeItems,
                user.email,
                `${frontendUrl}/orders/summary/${orderGroupId}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderGroupId}`,
                `${frontendUrl}/checkout/cancel?order_id=${orderGroupId}`,
                {
                    orderGroupId: orderGroupId
                }
            );

            return this.sendSuccess({
                message: 'Payment session created',
                paymentUrl: stripeSession.url
            });

        } catch (error: any) {
            console.error('Retry Payment Error:', error);
            return this.sendError(String(error.message), 500);
        }
    }
}
