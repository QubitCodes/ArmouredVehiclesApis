
import { Cart, CartItem, Order, OrderItem, Product, User, PlatformSetting, Address, UserProfile } from '../models';
import { sequelize } from '../config/database';
import { applyCommission } from '../utils/priceHelper';

export class OrderService {

    /**
     * Get platform settings (VAT and Commission)
     */
    private static async getPlatformSettings() {
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
     * Convert a Cart into one or more Orders (grouped by vendor)
     * This method is idempotent based on orderGroupId.
     */
    static async convertCartToOrder(userId: string, cartId: string, orderGroupId: string, options: {
        addressId?: string,
        isRequest?: boolean,
        shippingCosts?: Record<string, { total: number, method: string }>
    } = {}) {
        const t = await sequelize.transaction();
        try {
            // 1. Fetch Cart - ROW LOCKING APPLIED
            // We lock the cart row immediately without includes to avoid SQL errors
            // (e.g., "FOR UPDATE cannot be applied to the nullable side of an outer join").
            const cart = await Cart.findOne({
                where: { id: cartId, user_id: userId },
                transaction: t,
                lock: true // FOR UPDATE - ensures only one process converts this cart
            });

            if (!cart) {
                await t.rollback();
                throw new Error('Cart not found');
            }

            // 1.1 Fetch Items and Products separately within the same transaction
            const cartItems = await CartItem.findAll({
                where: { cart_id: cart.id },
                include: [{ model: Product, as: 'product' }],
                transaction: t
            });

            // Attach items to cart object for compatibility with existing logic
            (cart as any).items = cartItems;

            // 2. Check if this specific Cart instance was already converted
            // If it was, we MUST NOT create new orders.
            if (cart.status === 'converted') {
                console.log(`[OrderService] Cart ${cartId} already converted. Searching for orders belonging to group ${orderGroupId}...`);

                // We rollback the current transaction to clear any REPEATABLE_READ snapshot
                // that might be hiding the freshly committed orders from another process.
                await t.rollback();

                // Find existing orders without a transaction snapshot
                const existing = await Order.findAll({ where: { order_group_id: orderGroupId } });

                if (existing.length === 0) {
                    console.warn(`[OrderService] Cart ${cartId} is converted but no orders found for ${orderGroupId}. Likely converted by a different checkout session.`);
                } else {
                    console.log(`[OrderService] Found ${existing.length} existing orders for ${orderGroupId} after concurrent check.`);
                }

                return existing;
            }

            // 3. Primary Idempotency Check (Specific Group ID)
            // Just in case the same checkout session is somehow reused across different carts (unlikely)
            const existingOrders = await Order.findAll({ where: { order_group_id: orderGroupId }, transaction: t });
            if (existingOrders.length > 0) {
                console.log(`[OrderService] Order Group ${orderGroupId} already exists. Returning existing records.`);
                await t.rollback();
                return existingOrders;
            }

            if (!cart.items || cart.items.length === 0) {
                // For safety, if it's not converted but has no items, it's an error
                await t.rollback();
                throw new Error("Cart is empty");
            }

            // 3. Prepare Shipment Details
            let shipmentDetails = {};
            if (options.addressId) {
                const address = await Address.findByPk(options.addressId, { transaction: t });
                if (address && address.user_id === userId) {
                    shipmentDetails = address.toJSON();
                }
            }

            const { vatPercent, commPercent } = await this.getPlatformSettings();

            // 4. Group Items by Vendor
            const vendorGroups = new Map<string, any[]>();
            const consolidatedItems = new Map<string, any>();

            // Fetch user specific discount
            const userProfile = await UserProfile.findOne({ where: { user_id: userId }, transaction: t });
            const discountPercent = userProfile?.discount || 0;

            for (const item of cart.items) {
                if (!item.product) continue;

                const productId = item.product_id;

                // Get inflated price for customer
                const formattedProduct = await applyCommission(item.product, discountPercent);
                const inflatedPrice = Number(formattedProduct.price) || 0;
                const basePrice = Number(item.product.base_price) || 0;

                if (consolidatedItems.has(productId)) {
                    const existing = consolidatedItems.get(productId);
                    existing.quantity += item.quantity;
                } else {
                    // Create product snapshot (excluding large media arrays)
                    const productSnapshot = (item.product.toJSON ? item.product.toJSON() : { ...item.product }) as any;
                    delete productSnapshot.media;
                    delete productSnapshot.product_media;
                    delete productSnapshot.gallery;

                    consolidatedItems.set(productId, {
                        product_id: productId,
                        vendor_id: item.product.vendor_id,
                        quantity: item.quantity,
                        price: inflatedPrice, // Customer pays this
                        base_price: basePrice, // Vendor base price
                        product_name: item.product.name,
                        product_details: productSnapshot, // Archive snapshot
                        packing_charge: item.product.packing_charge
                    });
                }
            }

            // Distribute into vendor groups
            for (const item of consolidatedItems.values()) {
                const vId = item.vendor_id || 'admin';
                if (!vendorGroups.has(vId)) {
                    vendorGroups.set(vId, []);
                }
                vendorGroups.get(vId)?.push(item);
            }

            const isSingleVendor = vendorGroups.size === 1;
            const createdOrders: Order[] = [];

            // 5. Create Order for each Vendor Group
            try {
                for (const [vendorId, items] of vendorGroups) {
                    const actualVendorId = vendorId === 'admin' ? null : vendorId;
                    const shippingInfo = options.shippingCosts?.[vendorId] || options.shippingCosts?.[actualVendorId || 'admin'];

                    let groupSubtotal = 0;
                    let groupBaseSubtotal = 0;
                    let groupShipping = 0;
                    let groupPacking = 0;

                    items.forEach(i => {
                        const qty = i.quantity;
                        groupSubtotal += i.price * qty;
                        groupBaseSubtotal += (i.base_price || i.price) * qty;
                        groupPacking += (Number(i.packing_charge) || 0) * qty;
                    });

                    // Use provided dynamic shipping if available
                    if (shippingInfo) {
                        groupShipping = Number(shippingInfo.total) || 0;
                    }

                    const taxableAmount = groupSubtotal + groupShipping + groupPacking;
                    const vatAmount = (taxableAmount * vatPercent) / 100;

                    // Admin Commission is now stored as a PERCENTAGE (from product)
                    // We take it from the first item's product commission as they are grouped by vendor
                    const firstProduct = items[0]?.product_details;
                    const commissionPercent = Number(firstProduct?.commission) || 0;
                    const groupTotal = taxableAmount + vatAmount;

                    // Generate 8-digit Order ID if not single vendor
                    let finalOrderId = isSingleVendor ? orderGroupId : Math.floor(10000000 + Math.random() * 90000000).toString();

                    const order = await Order.create({
                        user_id: userId,
                        order_id: finalOrderId,
                        order_group_id: orderGroupId,
                        vendor_id: actualVendorId,
                        total_amount: groupTotal,
                        vat_amount: vatAmount,
                        admin_commission: commissionPercent, // Storing percentage here
                        total_shipping: groupShipping,
                        total_packing: groupPacking,
                        currency: 'AED',
                        type: options.isRequest ? 'request' : 'direct',
                        order_status: 'order_received',
                        payment_status: options.isRequest ? null : 'pending',
                        shipment_details: {
                            ...shipmentDetails,
                            service_method: shippingInfo?.method
                        },
                        status_history: [{
                            status: 'order_received',
                            payment_status: options.isRequest ? null : 'pending',
                            shipment_status: null,
                            updated_by: userId,
                            timestamp: new Date().toISOString(),
                            note: options.isRequest ? 'Purchase request submitted' : 'Order placed'
                        }]
                    }, { transaction: t });

                    // Create Order Items
                    for (const itemData of items) {
                        await OrderItem.create({ ...itemData, order_id: order.id }, { transaction: t });
                    }

                    createdOrders.push(order);
                }

                // 6. Mark Cart as Converted
                await cart.update({ status: 'converted' }, { transaction: t });

                await t.commit();
                return createdOrders;

            } catch (createError: any) {
                if (createError.name === 'SequelizeUniqueConstraintError') {
                    await t.rollback();
                    return await Order.findAll({ where: { order_group_id: orderGroupId } });
                }
                throw createError;
            }

        } catch (error) {
            try { await t.rollback(); } catch (e) { }
            console.error("[OrderService] Conversion failed:", error);
            throw error;
        }
    }
}
